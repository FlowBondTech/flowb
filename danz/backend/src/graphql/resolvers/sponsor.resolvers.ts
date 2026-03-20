import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

// Helper function to require authentication
const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

// Helper to get sponsor ID for current user
const getSponsorId = async (userId: string): Promise<string | null> => {
  const { data } = await supabase.from('sponsors').select('id').eq('user_id', userId).single()
  return data?.id || null
}

// Helper to validate sponsor ownership
const requireSponsor = async (context: GraphQLContext): Promise<string> => {
  const userId = requireAuth(context)
  const sponsorId = await getSponsorId(userId)
  if (!sponsorId) {
    throw new GraphQLError('Sponsor profile required', {
      extensions: { code: 'SPONSOR_REQUIRED' },
    })
  }
  return sponsorId
}

// Helper to validate event creator ownership
const requireEventCreator = async (context: GraphQLContext, eventId: string): Promise<void> => {
  const userId = requireAuth(context)
  const { data: event } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', eventId)
    .single()

  if (!event || event.creator_id !== userId) {
    throw new GraphQLError('You must be the event creator', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

// Platform fee constant
const PLATFORM_FEE_PERCENT = 5

export const sponsorResolvers = {
  Query: {
    // Get sponsor by ID
    sponsor: async (_: any, { id }: { id: string }) => {
      const { data, error } = await supabase.from('sponsors').select('*').eq('id', id).single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch sponsor', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }
      return data
    },

    // Get sponsor by user ID
    sponsorByUserId: async (_: any, { userId }: { userId: string }) => {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch sponsor', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }
      return data
    },

    // Get current user's sponsor profile
    mySponsorProfile: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch sponsor profile', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }
      return data
    },

    // Get all sponsor categories
    sponsorCategories: async () => {
      const { data, error } = await supabase
        .from('sponsor_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        throw new GraphQLError('Failed to fetch categories', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Get sponsor count per category
      const { data: sponsorCounts } = await supabase.from('sponsors').select('categories')

      const categoryCountMap: Record<string, number> = {}
      sponsorCounts?.forEach(s => {
        s.categories?.forEach((cat: string) => {
          categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1
        })
      })

      return (data || []).map(cat => ({
        ...cat,
        sponsorCount: categoryCountMap[cat.slug] || 0,
      }))
    },

    // Get sponsor dashboard
    sponsorDashboard: async (_: any, __: any, context: GraphQLContext) => {
      const sponsorId = await requireSponsor(context)

      // Get sponsor profile
      const { data: sponsor } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', sponsorId)
        .single()

      // Get active sponsorships
      const { data: activeSponsorships } = await supabase
        .from('event_sponsorships')
        .select(`
          *,
          event:events(*)
        `)
        .eq('sponsor_id', sponsorId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(10)

      // Get recent transactions
      const { data: recentTransactions } = await supabase
        .from('flow_transactions')
        .select('*')
        .eq('sponsor_id', sponsorId)
        .order('created_at', { ascending: false })
        .limit(20)

      // Get subscriptions
      const { data: subscriptions } = await supabase
        .from('sponsor_subscriptions')
        .select('*')
        .eq('sponsor_id', sponsorId)
        .order('created_at', { ascending: false })

      // Get pending matches
      const { data: pendingMatches } = await supabase
        .from('subscription_auto_matches')
        .select(`
          *,
          event:events(*)
        `)
        .in(
          'subscription_id',
          (subscriptions || []).map(s => s.id),
        )
        .eq('status', 'pending')

      // Calculate stats
      const stats = {
        totalInvested: sponsor?.total_flow_contributed || 0,
        totalEventsSponsored: sponsor?.total_events_sponsored || 0,
        totalWorkersSupported: 0, // TODO: Calculate from transactions
        averageEventRating: null,
        impactMetrics: {
          totalDancersReached: 0,
          totalHoursSupported: 0,
          communityEngagement: 0,
        },
      }

      // Get suggested events (matching sponsor preferences)
      const suggestedEvents = await getSuggestedEventsForSponsor(sponsor)

      return {
        sponsor,
        activeSponsorships: activeSponsorships || [],
        suggestedEvents,
        recentActivity: recentTransactions || [],
        stats,
        subscriptions: subscriptions || [],
        pendingMatches: pendingMatches || [],
      }
    },

    // Get events available for sponsorship
    eventsForSponsorship: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context)

      let query = supabase
        .from('events')
        .select(`
          *,
          sponsorship_settings:event_sponsorship_settings(*)
        `)
        .gte('end_date_time', new Date().toISOString())
        .order('start_date_time', { ascending: true })

      // Apply filters
      if (input?.categories?.length) {
        query = query.in('category', input.categories)
      }
      if (input?.danceStyles?.length) {
        query = query.overlaps('dance_styles', input.danceStyles)
      }
      if (input?.minCapacity) {
        query = query.gte('max_capacity', input.minCapacity)
      }
      if (input?.dateFrom) {
        query = query.gte('start_date_time', input.dateFrom)
      }
      if (input?.dateTo) {
        query = query.lte('start_date_time', input.dateTo)
      }
      if (input?.verifiedCreatorsOnly) {
        // Join with verified_event_creators
        const { data: verifiedCreators } = await supabase
          .from('verified_event_creators')
          .select('user_id')
          .eq('is_verified', true)

        const verifiedUserIds = verifiedCreators?.map(v => v.user_id) || []
        query = query.in('creator_id', verifiedUserIds)
      }

      const limit = input?.limit || 20
      const offset = input?.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        throw new GraphQLError('Failed to fetch events', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Filter to events seeking sponsorship
      return (data || []).filter(
        e => !e.sponsorship_settings || e.sponsorship_settings.seeking_sponsorship !== false,
      )
    },

    // Get suggested events for sponsor
    suggestedEventsForSponsor: async (
      _: any,
      { limit = 10 }: { limit?: number },
      context: GraphQLContext,
    ) => {
      const sponsorId = await requireSponsor(context)

      const { data: sponsor } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', sponsorId)
        .single()

      if (!sponsor) return []

      return getSuggestedEventsForSponsor(sponsor, limit)
    },

    // Get user's FLOW balance
    myFlowBalance: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('user_flow_balances')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Return empty balance if none exists
          return {
            userId,
            availableBalance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
            totalGigsCompleted: 0,
            totalEventsWorked: 0,
          }
        }
        throw new GraphQLError('Failed to fetch balance', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return {
        userId: data.user_id,
        availableBalance: data.available_balance,
        pendingBalance: data.pending_balance,
        totalEarned: data.total_earned,
        totalWithdrawn: data.total_withdrawn,
        totalGigsCompleted: data.total_gigs_completed,
        totalEventsWorked: data.total_events_worked,
      }
    },

    // Get user's FLOW transactions
    myFlowTransactions: async (
      _: any,
      { limit = 20, offset = 0, type }: { limit?: number; offset?: number; type?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      let query = supabase
        .from('flow_transactions')
        .select('*')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (type) {
        query = query.eq('transaction_type', type)
      }

      const { data, error } = await query

      if (error) {
        throw new GraphQLError('Failed to fetch transactions', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    // Get event flow pool
    eventFlowPool: async (_: any, { eventId }: { eventId: string }) => {
      const { data, error } = await supabase
        .from('event_flow_pools')
        .select('*')
        .eq('event_id', eventId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch flow pool', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Get event sponsors
    eventSponsors: async (_: any, { eventId }: { eventId: string }) => {
      const { data, error } = await supabase
        .from('event_sponsorships')
        .select(`
          *,
          sponsor:sponsors(*)
        `)
        .eq('event_id', eventId)
        .in('status', ['active', 'completed'])
        .order('flow_amount', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch sponsors', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    // Get event sponsorship settings
    eventSponsorshipSettings: async (_: any, { eventId }: { eventId: string }) => {
      const { data, error } = await supabase
        .from('event_sponsorship_settings')
        .select('*')
        .eq('event_id', eventId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch settings', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Calculate current total
      const { data: sponsorships } = await supabase
        .from('event_sponsorships')
        .select('flow_amount')
        .eq('event_id', eventId)
        .in('status', ['active', 'completed'])

      const currentTotal = sponsorships?.reduce((sum, s) => sum + (s.flow_amount || 0), 0) || 0

      return {
        ...data,
        currentTotal,
        goalProgress: data.sponsorship_goal ? (currentTotal / data.sponsorship_goal) * 100 : null,
      }
    },

    // Get pending sponsorship approvals for an event
    pendingSponsorshipApprovals: async (
      _: any,
      { eventId }: { eventId: string },
      context: GraphQLContext,
    ) => {
      await requireEventCreator(context, eventId)

      const { data, error } = await supabase
        .from('sponsorship_approvals')
        .select(`
          *,
          sponsor:sponsors(*),
          sponsorship:event_sponsorships(*)
        `)
        .eq('event_id', eventId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch approvals', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    // Get user's subscriptions
    mySubscriptions: async (_: any, __: any, context: GraphQLContext) => {
      const sponsorId = await requireSponsor(context)

      const { data, error } = await supabase
        .from('sponsor_subscriptions')
        .select('*')
        .eq('sponsor_id', sponsorId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch subscriptions', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    // Get subscription by ID
    subscription: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const sponsorId = await requireSponsor(context)

      const { data, error } = await supabase
        .from('sponsor_subscriptions')
        .select('*')
        .eq('id', id)
        .eq('sponsor_id', sponsorId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch subscription', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Get verified creator status
    verifiedCreatorStatus: async (
      _: any,
      { userId }: { userId?: string },
      context: GraphQLContext,
    ) => {
      const targetUserId = userId || requireAuth(context)

      const { data, error } = await supabase
        .from('verified_event_creators')
        .select('*')
        .eq('user_id', targetUserId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch verification status', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Get my verification status
    myVerificationStatus: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('verified_event_creators')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError('Failed to fetch verification status', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || null
    },

    // Get verification criteria for user
    verificationCriteria: async (
      _: any,
      { userId }: { userId?: string },
      context: GraphQLContext,
    ) => {
      const targetUserId = userId || requireAuth(context)

      // Use the database function to check criteria
      const { data, error } = await supabase.rpc('check_creator_verification_criteria', {
        p_user_id: targetUserId,
      })

      if (error) {
        throw new GraphQLError('Failed to check verification criteria', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Get sponsor analytics
    sponsorAnalytics: async (
      _: any,
      {
        periodType,
        startDate,
        endDate,
      }: { periodType: string; startDate: string; endDate: string },
      context: GraphQLContext,
    ) => {
      const sponsorId = await requireSponsor(context)

      // Get analytics from the aggregated table
      const { data, error } = await supabase
        .from('sponsor_analytics')
        .select('*')
        .eq('sponsor_id', sponsorId)
        .eq('period_type', periodType)
        .gte('period_start', startDate)
        .lte('period_end', endDate)
        .order('period_start', { ascending: true })

      if (error) {
        throw new GraphQLError('Failed to fetch analytics', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Aggregate the data
      const totals = (data || []).reduce(
        (acc, row) => ({
          totalFlowSpent: acc.totalFlowSpent + (row.total_flow_spent || 0),
          eventsSponsored: acc.eventsSponsored + (row.events_sponsored || 0),
          dancersReached: acc.dancersReached + (row.total_dancers_reached || 0),
          workersSupported: acc.workersSupported + (row.unique_workers_supported || 0),
          brandImpressions: acc.brandImpressions + (row.brand_impressions || 0),
          websiteClicks: acc.websiteClicks + (row.website_clicks || 0),
        }),
        {
          totalFlowSpent: 0,
          eventsSponsored: 0,
          dancersReached: 0,
          workersSupported: 0,
          brandImpressions: 0,
          websiteClicks: 0,
        },
      )

      return {
        ...totals,
        costPerImpression:
          totals.brandImpressions > 0 ? totals.totalFlowSpent / totals.brandImpressions : null,
        costPerClick:
          totals.websiteClicks > 0 ? totals.totalFlowSpent / totals.websiteClicks : null,
        spendingTrend: (data || []).map(row => ({
          period: row.period_start,
          amount: row.total_flow_spent || 0,
        })),
        spendingByCategory: [], // TODO: Parse from JSONB
        eventsByDanceStyle: [],
        eventsByRegion: [],
      }
    },

    // Get event sponsorship analytics
    eventSponsorshipAnalytics: async (
      _: any,
      { eventId }: { eventId: string },
      context: GraphQLContext,
    ) => {
      await requireEventCreator(context, eventId)

      const { data, error } = await supabase
        .from('event_sponsorship_analytics')
        .select('*')
        .eq('event_id', eventId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Return empty analytics if none exists
          return {
            totalReceived: 0,
            numberOfSponsors: 0,
            goalPercentage: null,
            distributionBreakdown: { workers: 0, volunteers: 0, platformFees: 0 },
            sponsorsByTier: [],
            sponsorsByCategory: [],
          }
        }
        throw new GraphQLError('Failed to fetch analytics', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return {
        totalReceived: data.total_sponsorship_received,
        numberOfSponsors: data.number_of_sponsors,
        goalPercentage: data.goal_percentage,
        distributionBreakdown: {
          workers: data.total_distributed_to_workers,
          volunteers: data.total_distributed_to_volunteers,
          platformFees: data.platform_fees_paid,
        },
        sponsorsByTier: Object.entries(data.sponsors_by_tier || {}).map(([tier, count]) => ({
          tier,
          count,
        })),
        sponsorsByCategory: Object.entries(data.sponsors_by_category || {}).map(
          ([category, info]: [string, any]) => ({
            category,
            count: info.count || 0,
            totalAmount: info.amount || 0,
          }),
        ),
      }
    },

    // Get sponsor notification preferences
    sponsorNotificationPreferences: async (_: any, __: any, context: GraphQLContext) => {
      const sponsorId = await requireSponsor(context)

      const { data, error } = await supabase
        .from('sponsor_notification_preferences')
        .select('*')
        .eq('sponsor_id', sponsorId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Return defaults
          return {
            emailNewMatchingEvents: true,
            emailSponsorshipUpdates: true,
            emailSubscriptionBilling: true,
            emailWeeklyDigest: true,
            pushNewMatchingEvents: true,
            pushSponsorshipUpdates: true,
            pushBudgetWarnings: true,
            matchingEventsFrequency: 'immediate',
            digestDay: 'monday',
          }
        }
        throw new GraphQLError('Failed to fetch preferences', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return {
        emailNewMatchingEvents: data.email_new_matching_events,
        emailSponsorshipUpdates: data.email_sponsorship_updates,
        emailSubscriptionBilling: data.email_subscription_billing,
        emailWeeklyDigest: data.email_weekly_digest,
        pushNewMatchingEvents: data.push_new_matching_events,
        pushSponsorshipUpdates: data.push_sponsorship_updates,
        pushBudgetWarnings: data.push_budget_warnings,
        matchingEventsFrequency: data.matching_events_frequency,
        digestDay: data.digest_day,
      }
    },

    // Get creator notification preferences
    creatorSponsorshipNotificationPreferences: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('creator_sponsorship_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Return defaults
          return {
            notifyNewSponsorship: true,
            notifySponsorshipApproved: true,
            notifyGoalReached: true,
            notifyApprovalExpiring: true,
            emailEnabled: true,
            pushEnabled: true,
          }
        }
        throw new GraphQLError('Failed to fetch preferences', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return {
        notifyNewSponsorship: data.notify_new_sponsorship,
        notifySponsorshipApproved: data.notify_sponsorship_approved,
        notifyGoalReached: data.notify_goal_reached,
        notifyApprovalExpiring: data.notify_approval_expiring,
        emailEnabled: data.email_enabled,
        pushEnabled: data.push_enabled,
      }
    },
  },

  Mutation: {
    // Create sponsor profile
    createSponsorProfile: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if user already has a sponsor profile
      const existingSponsor = await getSponsorId(userId)
      if (existingSponsor) {
        throw new GraphQLError('Sponsor profile already exists', {
          extensions: { code: 'DUPLICATE' },
        })
      }

      const { data, error } = await supabase
        .from('sponsors')
        .insert({
          user_id: userId,
          company_name: input.companyName,
          company_description: input.companyDescription,
          logo_url: input.logoUrl,
          website_url: input.websiteUrl,
          contact_email: input.contactEmail,
          contact_phone: input.contactPhone,
          categories: input.categories,
          preferred_regions: input.preferredRegions,
          preferred_event_types: input.preferredEventTypes,
          preferred_dance_styles: input.preferredDanceStyles,
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create sponsor profile', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Update sponsor profile
    updateSponsorProfile: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const sponsorId = await requireSponsor(context)

      const updates: any = {}
      if (input.companyName !== undefined) updates.company_name = input.companyName
      if (input.companyDescription !== undefined)
        updates.company_description = input.companyDescription
      if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl
      if (input.websiteUrl !== undefined) updates.website_url = input.websiteUrl
      if (input.contactEmail !== undefined) updates.contact_email = input.contactEmail
      if (input.contactPhone !== undefined) updates.contact_phone = input.contactPhone
      if (input.categories !== undefined) updates.categories = input.categories
      if (input.preferredRegions !== undefined) updates.preferred_regions = input.preferredRegions
      if (input.preferredEventTypes !== undefined)
        updates.preferred_event_types = input.preferredEventTypes
      if (input.preferredDanceStyles !== undefined)
        updates.preferred_dance_styles = input.preferredDanceStyles

      const { data, error } = await supabase
        .from('sponsors')
        .update(updates)
        .eq('id', sponsorId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update sponsor profile', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Delete sponsor profile
    deleteSponsorProfile: async (_: any, __: any, context: GraphQLContext) => {
      const sponsorId = await requireSponsor(context)

      // Check for active sponsorships
      const { count } = await supabase
        .from('event_sponsorships')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', sponsorId)
        .in('status', ['pending', 'active'])

      if (count && count > 0) {
        throw new GraphQLError('Cannot delete profile with active sponsorships', {
          extensions: { code: 'HAS_ACTIVE_SPONSORSHIPS' },
        })
      }

      const { error } = await supabase.from('sponsors').delete().eq('id', sponsorId)

      if (error) {
        throw new GraphQLError('Failed to delete sponsor profile', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return { success: true, message: 'Sponsor profile deleted' }
    },

    // Create event sponsorship
    createEventSponsorship: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const sponsorId = await requireSponsor(context)

      // Validate allocation config
      const totalPercent =
        input.allocationConfig.paidWorkersPercent +
        input.allocationConfig.volunteerRewardsPercent +
        input.allocationConfig.platformFeePercent

      if (Math.abs(totalPercent - 100) > 0.01) {
        throw new GraphQLError('Allocation percentages must total 100%', {
          extensions: { code: 'INVALID_ALLOCATION' },
        })
      }

      if (input.allocationConfig.platformFeePercent < PLATFORM_FEE_PERCENT) {
        throw new GraphQLError(`Platform fee must be at least ${PLATFORM_FEE_PERCENT}%`, {
          extensions: { code: 'INVALID_PLATFORM_FEE' },
        })
      }

      // Check if event exists and is seeking sponsorship
      const { data: event } = await supabase
        .from('events')
        .select('id, creator_id, title')
        .eq('id', input.eventId)
        .single()

      if (!event) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check sponsorship settings
      const { data: settings } = await supabase
        .from('event_sponsorship_settings')
        .select('*')
        .eq('event_id', input.eventId)
        .single()

      // Determine initial status based on settings
      let initialStatus = 'pending'
      if (settings) {
        if (settings.acceptance_mode === 'auto_accept') {
          initialStatus = 'active'
        } else if (
          settings.acceptance_mode === 'category_filter' &&
          settings.min_auto_accept_amount &&
          input.flowAmount >= settings.min_auto_accept_amount
        ) {
          // Check category match
          const { data: sponsor } = await supabase
            .from('sponsors')
            .select('categories')
            .eq('id', sponsorId)
            .single()

          const categoryMatch = sponsor?.categories?.some(
            (cat: string) =>
              settings.preferred_categories?.includes(cat) &&
              !settings.blocked_categories?.includes(cat),
          )

          if (categoryMatch) {
            initialStatus = 'active'
          }
        }
      }

      // Create sponsorship
      const { data: sponsorship, error } = await supabase
        .from('event_sponsorships')
        .insert({
          event_id: input.eventId,
          sponsor_id: sponsorId,
          flow_amount: input.flowAmount,
          visibility: input.visibility || 'visible',
          sponsor_message: input.sponsorMessage,
          allocation_config: input.allocationConfig,
          status: initialStatus,
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create sponsorship', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // If pending, create approval record
      if (initialStatus === 'pending') {
        await supabase.from('sponsorship_approvals').insert({
          event_id: input.eventId,
          sponsor_id: sponsorId,
          sponsorship_id: sponsorship.id,
          proposed_flow_amount: input.flowAmount,
          proposed_visibility: input.visibility,
          proposed_message: input.sponsorMessage,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
      }

      // If active, update flow pool
      if (initialStatus === 'active') {
        await updateEventFlowPool(input.eventId, input.flowAmount)

        // Create deposit transaction
        await supabase.from('flow_transactions').insert({
          sponsor_id: sponsorId,
          event_id: input.eventId,
          amount: input.flowAmount,
          transaction_type: 'sponsor_deposit',
          status: 'completed',
          description: `Sponsorship deposit for event: ${event.title}`,
          completed_at: new Date().toISOString(),
        })

        // Update sponsor stats
        await supabase.rpc('increment', {
          row_id: sponsorId,
          table_name: 'sponsors',
          column_name: 'total_events_sponsored',
          x: 1,
        })
      }

      return sponsorship
    },

    // Update event sponsorship
    updateEventSponsorship: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: GraphQLContext,
    ) => {
      const sponsorId = await requireSponsor(context)

      // Verify ownership
      const { data: existing } = await supabase
        .from('event_sponsorships')
        .select('*')
        .eq('id', id)
        .eq('sponsor_id', sponsorId)
        .single()

      if (!existing) {
        throw new GraphQLError('Sponsorship not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      if (existing.status === 'completed' || existing.status === 'cancelled') {
        throw new GraphQLError('Cannot update completed or cancelled sponsorship', {
          extensions: { code: 'INVALID_STATUS' },
        })
      }

      const updates: any = {}
      if (input.visibility !== undefined) updates.visibility = input.visibility
      if (input.sponsorMessage !== undefined) updates.sponsor_message = input.sponsorMessage
      if (input.allocationConfig !== undefined) updates.allocation_config = input.allocationConfig

      const { data, error } = await supabase
        .from('event_sponsorships')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update sponsorship', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Cancel event sponsorship
    cancelEventSponsorship: async (
      _: any,
      { id, reason }: { id: string; reason?: string },
      context: GraphQLContext,
    ) => {
      const sponsorId = await requireSponsor(context)

      // Verify ownership
      const { data: existing } = await supabase
        .from('event_sponsorships')
        .select('*')
        .eq('id', id)
        .eq('sponsor_id', sponsorId)
        .single()

      if (!existing) {
        throw new GraphQLError('Sponsorship not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      if (
        existing.status === 'completed' ||
        existing.status === 'cancelled' ||
        existing.status === 'refunded'
      ) {
        throw new GraphQLError('Cannot cancel this sponsorship', {
          extensions: { code: 'INVALID_STATUS' },
        })
      }

      // If active and no distribution yet, refund
      let newStatus = 'cancelled'
      if (existing.status === 'active' && existing.flow_distributed === 0) {
        newStatus = 'refunded'

        // Update flow pool
        await supabase.rpc('decrement_flow_pool', {
          p_event_id: existing.event_id,
          p_amount: existing.flow_amount,
        })

        // Create refund transaction
        await supabase.from('flow_transactions').insert({
          sponsor_id: sponsorId,
          event_id: existing.event_id,
          amount: existing.flow_amount,
          transaction_type: 'refund',
          status: 'completed',
          description: `Sponsorship refund${reason ? `: ${reason}` : ''}`,
          completed_at: new Date().toISOString(),
        })
      }

      const { data, error } = await supabase
        .from('event_sponsorships')
        .update({
          status: newStatus,
          completion_notes: reason,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to cancel sponsorship', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Review sponsorship approval
    reviewSponsorshipApproval: async (
      _: any,
      { approvalId, decision, reason }: { approvalId: string; decision: string; reason?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get approval
      const { data: approval } = await supabase
        .from('sponsorship_approvals')
        .select('*, event:events(creator_id)')
        .eq('id', approvalId)
        .single()

      if (!approval) {
        throw new GraphQLError('Approval not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Verify event creator
      if (approval.event?.creator_id !== userId) {
        throw new GraphQLError('Only event creator can review approvals', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      if (approval.status !== 'pending') {
        throw new GraphQLError('Approval already processed', {
          extensions: { code: 'ALREADY_PROCESSED' },
        })
      }

      // Update approval
      const { data, error } = await supabase
        .from('sponsorship_approvals')
        .update({
          status: decision,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          rejection_reason: decision === 'rejected' ? reason : null,
        })
        .eq('id', approvalId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update approval', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Update sponsorship status
      if (decision === 'approved') {
        await supabase
          .from('event_sponsorships')
          .update({ status: 'active' })
          .eq('id', approval.sponsorship_id)

        // Update flow pool
        await updateEventFlowPool(approval.event_id, approval.proposed_flow_amount)
      } else if (decision === 'rejected') {
        await supabase
          .from('event_sponsorships')
          .update({ status: 'cancelled' })
          .eq('id', approval.sponsorship_id)
      }

      return data
    },

    // Update event sponsorship settings
    updateEventSponsorshipSettings: async (
      _: any,
      { eventId, input }: { eventId: string; input: any },
      context: GraphQLContext,
    ) => {
      await requireEventCreator(context, eventId)

      const updates: any = {}
      if (input.acceptanceMode !== undefined) updates.acceptance_mode = input.acceptanceMode
      if (input.autoAcceptAll !== undefined) updates.auto_accept_all = input.autoAcceptAll
      if (input.preferredCategories !== undefined)
        updates.preferred_categories = input.preferredCategories
      if (input.blockedCategories !== undefined)
        updates.blocked_categories = input.blockedCategories
      if (input.minAutoAcceptAmount !== undefined)
        updates.min_auto_accept_amount = input.minAutoAcceptAmount
      if (input.seekingSponsorship !== undefined)
        updates.seeking_sponsorship = input.seekingSponsorship
      if (input.sponsorshipGoal !== undefined) updates.sponsorship_goal = input.sponsorshipGoal
      if (input.sponsorshipDeadline !== undefined)
        updates.sponsorship_deadline = input.sponsorshipDeadline
      if (input.pitchMessage !== undefined) updates.pitch_message = input.pitchMessage
      if (input.notifyOnNewSponsor !== undefined)
        updates.notify_on_new_sponsor = input.notifyOnNewSponsor
      if (input.notifyOnGoalReached !== undefined)
        updates.notify_on_goal_reached = input.notifyOnGoalReached

      // Upsert settings
      const { data, error } = await supabase
        .from('event_sponsorship_settings')
        .upsert(
          {
            event_id: eventId,
            ...updates,
          },
          { onConflict: 'event_id' },
        )
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update settings', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Lock event pool
    lockEventPool: async (_: any, { eventId }: { eventId: string }, context: GraphQLContext) => {
      await requireEventCreator(context, eventId)

      const { data, error } = await supabase
        .from('event_flow_pools')
        .update({
          status: 'locked',
          locked_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('status', 'open')
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to lock pool', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Unlock event pool
    unlockEventPool: async (_: any, { eventId }: { eventId: string }, context: GraphQLContext) => {
      await requireEventCreator(context, eventId)

      const { data, error } = await supabase
        .from('event_flow_pools')
        .update({
          status: 'open',
          locked_at: null,
        })
        .eq('event_id', eventId)
        .eq('status', 'locked')
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to unlock pool', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Distribute gig payment
    distributeGigPayment: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      await requireEventCreator(context, input.eventId)

      // Verify pool has funds
      const { data: pool } = await supabase
        .from('event_flow_pools')
        .select('*')
        .eq('event_id', input.eventId)
        .single()

      if (!pool) {
        throw new GraphQLError('Flow pool not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const remaining = pool.total_flow - pool.distributed_flow
      if (input.amount > remaining) {
        throw new GraphQLError('Insufficient funds in pool', {
          extensions: { code: 'INSUFFICIENT_FUNDS' },
        })
      }

      // Get gig application to find worker
      const { data: application } = await supabase
        .from('gig_applications')
        .select('applicant_id')
        .eq('id', input.applicationId)
        .single()

      if (!application) {
        throw new GraphQLError('Application not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Create transaction
      const { data: transaction, error } = await supabase
        .from('flow_transactions')
        .insert({
          to_user_id: application.applicant_id,
          event_id: input.eventId,
          amount: input.amount,
          transaction_type: 'gig_payment',
          status: 'completed',
          description: input.note || 'Gig payment',
          metadata: { application_id: input.applicationId, bonus_danz: input.bonusDanz },
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create transaction', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Update pool
      await supabase
        .from('event_flow_pools')
        .update({
          distributed_flow: pool.distributed_flow + input.amount,
          status: 'distributing',
          distribution_started_at: pool.distribution_started_at || new Date().toISOString(),
        })
        .eq('id', pool.id)

      // Update user balance
      await supabase.rpc('add_user_flow_balance', {
        p_user_id: application.applicant_id,
        p_amount: input.amount,
      })

      return transaction
    },

    // Distribute volunteer reward
    distributeVolunteerReward: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext,
    ) => {
      await requireEventCreator(context, input.eventId)

      // Verify pool has funds
      const { data: pool } = await supabase
        .from('event_flow_pools')
        .select('*')
        .eq('event_id', input.eventId)
        .single()

      if (!pool) {
        throw new GraphQLError('Flow pool not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const remaining = pool.total_flow - pool.distributed_flow
      if (input.amount > remaining) {
        throw new GraphQLError('Insufficient funds in pool', {
          extensions: { code: 'INSUFFICIENT_FUNDS' },
        })
      }

      // Create transaction
      const { data: transaction, error } = await supabase
        .from('flow_transactions')
        .insert({
          to_user_id: input.userId,
          event_id: input.eventId,
          amount: input.amount,
          transaction_type: 'volunteer_reward',
          status: 'completed',
          description: input.reason,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create transaction', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Update pool
      await supabase
        .from('event_flow_pools')
        .update({
          distributed_flow: pool.distributed_flow + input.amount,
        })
        .eq('id', pool.id)

      // Update user balance
      await supabase.rpc('add_user_flow_balance', {
        p_user_id: input.userId,
        p_amount: input.amount,
      })

      return transaction
    },

    // Complete event distribution
    completeEventDistribution: async (
      _: any,
      { eventId }: { eventId: string },
      context: GraphQLContext,
    ) => {
      await requireEventCreator(context, eventId)

      const { data, error } = await supabase
        .from('event_flow_pools')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to complete distribution', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Mark all sponsorships as completed
      await supabase
        .from('event_sponsorships')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('status', 'active')

      return data
    },

    // Request FLOW to DANZ swap
    requestFlowToDanzSwap: async (
      _: any,
      { amount }: { amount: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Check balance
      const { data: balance } = await supabase
        .from('user_flow_balances')
        .select('available_balance')
        .eq('user_id', userId)
        .single()

      if (!balance || balance.available_balance < amount) {
        throw new GraphQLError('Insufficient FLOW balance', {
          extensions: { code: 'INSUFFICIENT_FUNDS' },
        })
      }

      // Create swap request
      const { data, error } = await supabase
        .from('flow_danz_swaps')
        .insert({
          user_id: userId,
          flow_amount: amount,
          trigger_type: 'manual',
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create swap request', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Deduct from balance (pending)
      await supabase.rpc('deduct_user_flow_balance', {
        p_user_id: userId,
        p_amount: amount,
      })

      return data
    },

    // Withdraw FLOW
    withdrawFlow: async (
      _: any,
      { amount, destinationWallet }: { amount: number; destinationWallet: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Check balance
      const { data: balance } = await supabase
        .from('user_flow_balances')
        .select('available_balance')
        .eq('user_id', userId)
        .single()

      if (!balance || balance.available_balance < amount) {
        throw new GraphQLError('Insufficient FLOW balance', {
          extensions: { code: 'INSUFFICIENT_FUNDS' },
        })
      }

      // Create withdrawal transaction (will auto-swap to DANZ)
      const { data, error } = await supabase
        .from('flow_transactions')
        .insert({
          from_user_id: userId,
          amount,
          transaction_type: 'withdrawal',
          status: 'pending',
          description: `Withdrawal to ${destinationWallet}`,
          metadata: { destination_wallet: destinationWallet },
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create withdrawal', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Deduct from balance
      await supabase.rpc('deduct_user_flow_balance', {
        p_user_id: userId,
        p_amount: amount,
      })

      return data
    },

    // Create subscription
    createSponsorSubscription: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext,
    ) => {
      const sponsorId = await requireSponsor(context)

      const { data, error } = await supabase
        .from('sponsor_subscriptions')
        .insert({
          sponsor_id: sponsorId,
          plan_type: input.planType,
          sponsorship_mode: input.sponsorshipMode,
          budget_amount: input.budgetAmount,
          target_categories: input.targetCategories || [],
          verified_events_only: input.verifiedEventsOnly || false,
          auto_approve: input.autoApprove || false,
          max_per_event: input.maxPerEvent,
          default_allocation_config: input.defaultAllocationConfig || {
            paid_workers: 80,
            volunteer_rewards: 15,
            platform_fee: 5,
          },
          default_visibility: input.defaultVisibility || 'visible',
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create subscription', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Update subscription
    updateSponsorSubscription: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: GraphQLContext,
    ) => {
      const sponsorId = await requireSponsor(context)

      const updates: any = {}
      if (input.budgetAmount !== undefined) updates.budget_amount = input.budgetAmount
      if (input.targetCategories !== undefined) updates.target_categories = input.targetCategories
      if (input.verifiedEventsOnly !== undefined)
        updates.verified_events_only = input.verifiedEventsOnly
      if (input.autoApprove !== undefined) updates.auto_approve = input.autoApprove
      if (input.maxPerEvent !== undefined) updates.max_per_event = input.maxPerEvent
      if (input.defaultAllocationConfig !== undefined)
        updates.default_allocation_config = input.defaultAllocationConfig
      if (input.defaultVisibility !== undefined)
        updates.default_visibility = input.defaultVisibility

      const { data, error } = await supabase
        .from('sponsor_subscriptions')
        .update(updates)
        .eq('id', id)
        .eq('sponsor_id', sponsorId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update subscription', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Pause subscription
    pauseSponsorSubscription: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const sponsorId = await requireSponsor(context)

      const { data, error } = await supabase
        .from('sponsor_subscriptions')
        .update({ status: 'paused' })
        .eq('id', id)
        .eq('sponsor_id', sponsorId)
        .eq('status', 'active')
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to pause subscription', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Resume subscription
    resumeSponsorSubscription: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const sponsorId = await requireSponsor(context)

      const { data, error } = await supabase
        .from('sponsor_subscriptions')
        .update({ status: 'active' })
        .eq('id', id)
        .eq('sponsor_id', sponsorId)
        .eq('status', 'paused')
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to resume subscription', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Cancel subscription
    cancelSponsorSubscription: async (
      _: any,
      { id, reason }: { id: string; reason?: string },
      context: GraphQLContext,
    ) => {
      const sponsorId = await requireSponsor(context)

      const { data, error } = await supabase
        .from('sponsor_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('sponsor_id', sponsorId)
        .in('status', ['active', 'paused'])
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to cancel subscription', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // Respond to subscription match
    respondToSubscriptionMatch: async (
      _: any,
      { matchId, approve }: { matchId: string; approve: boolean },
      context: GraphQLContext,
    ) => {
      const sponsorId = await requireSponsor(context)

      // Verify ownership through subscription
      const { data: match } = await supabase
        .from('subscription_auto_matches')
        .select('*, subscription:sponsor_subscriptions(sponsor_id)')
        .eq('id', matchId)
        .single()

      if (!match || match.subscription?.sponsor_id !== sponsorId) {
        throw new GraphQLError('Match not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      if (match.status !== 'pending') {
        throw new GraphQLError('Match already processed', {
          extensions: { code: 'ALREADY_PROCESSED' },
        })
      }

      const { data, error } = await supabase
        .from('subscription_auto_matches')
        .update({
          status: approve ? 'approved' : 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to respond to match', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // If approved, create the sponsorship
      if (approve) {
        const { data: subscription } = await supabase
          .from('sponsor_subscriptions')
          .select('*')
          .eq('id', match.subscription_id)
          .single()

        if (subscription) {
          await supabase.from('event_sponsorships').insert({
            event_id: match.event_id,
            sponsor_id: sponsorId,
            flow_amount: match.flow_amount,
            visibility: subscription.default_visibility,
            allocation_config: subscription.default_allocation_config,
            status: 'active',
          })

          // Update subscription budget spent
          await supabase
            .from('sponsor_subscriptions')
            .update({
              budget_spent: subscription.budget_spent + match.flow_amount,
              events_sponsored_this_period: subscription.events_sponsored_this_period + 1,
            })
            .eq('id', subscription.id)

          // Update flow pool
          await updateEventFlowPool(match.event_id, match.flow_amount)
        }
      }

      return data
    },

    // Update sponsor notification preferences
    updateSponsorNotificationPreferences: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext,
    ) => {
      const sponsorId = await requireSponsor(context)

      const updates: any = {}
      if (input.emailNewMatchingEvents !== undefined)
        updates.email_new_matching_events = input.emailNewMatchingEvents
      if (input.emailSponsorshipUpdates !== undefined)
        updates.email_sponsorship_updates = input.emailSponsorshipUpdates
      if (input.emailSubscriptionBilling !== undefined)
        updates.email_subscription_billing = input.emailSubscriptionBilling
      if (input.emailWeeklyDigest !== undefined)
        updates.email_weekly_digest = input.emailWeeklyDigest
      if (input.pushNewMatchingEvents !== undefined)
        updates.push_new_matching_events = input.pushNewMatchingEvents
      if (input.pushSponsorshipUpdates !== undefined)
        updates.push_sponsorship_updates = input.pushSponsorshipUpdates
      if (input.pushBudgetWarnings !== undefined)
        updates.push_budget_warnings = input.pushBudgetWarnings
      if (input.matchingEventsFrequency !== undefined)
        updates.matching_events_frequency = input.matchingEventsFrequency
      if (input.digestDay !== undefined) updates.digest_day = input.digestDay

      const { data, error } = await supabase
        .from('sponsor_notification_preferences')
        .upsert(
          {
            sponsor_id: sponsorId,
            ...updates,
          },
          { onConflict: 'sponsor_id' },
        )
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update preferences', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return {
        emailNewMatchingEvents: data.email_new_matching_events,
        emailSponsorshipUpdates: data.email_sponsorship_updates,
        emailSubscriptionBilling: data.email_subscription_billing,
        emailWeeklyDigest: data.email_weekly_digest,
        pushNewMatchingEvents: data.push_new_matching_events,
        pushSponsorshipUpdates: data.push_sponsorship_updates,
        pushBudgetWarnings: data.push_budget_warnings,
        matchingEventsFrequency: data.matching_events_frequency,
        digestDay: data.digest_day,
      }
    },

    // Update creator notification preferences
    updateCreatorSponsorshipNotificationPreferences: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const updates: any = {}
      if (input.notifyNewSponsorship !== undefined)
        updates.notify_new_sponsorship = input.notifyNewSponsorship
      if (input.notifySponsorshipApproved !== undefined)
        updates.notify_sponsorship_approved = input.notifySponsorshipApproved
      if (input.notifyGoalReached !== undefined)
        updates.notify_goal_reached = input.notifyGoalReached
      if (input.notifyApprovalExpiring !== undefined)
        updates.notify_approval_expiring = input.notifyApprovalExpiring
      if (input.emailEnabled !== undefined) updates.email_enabled = input.emailEnabled
      if (input.pushEnabled !== undefined) updates.push_enabled = input.pushEnabled

      const { data, error } = await supabase
        .from('creator_sponsorship_notification_preferences')
        .upsert(
          {
            user_id: userId,
            ...updates,
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update preferences', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return {
        notifyNewSponsorship: data.notify_new_sponsorship,
        notifySponsorshipApproved: data.notify_sponsorship_approved,
        notifyGoalReached: data.notify_goal_reached,
        notifyApprovalExpiring: data.notify_approval_expiring,
        emailEnabled: data.email_enabled,
        pushEnabled: data.push_enabled,
      }
    },
  },

  // Type resolvers
  Sponsor: {
    user: async (parent: any) => {
      if (!parent.user_id) return null
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()
      return data
    },
    sponsorships: async (parent: any) => {
      const { data } = await supabase
        .from('event_sponsorships')
        .select('*')
        .eq('sponsor_id', parent.id)
        .order('created_at', { ascending: false })
      return data || []
    },
    subscriptions: async (parent: any) => {
      const { data } = await supabase
        .from('sponsor_subscriptions')
        .select('*')
        .eq('sponsor_id', parent.id)
        .order('created_at', { ascending: false })
      return data || []
    },
    impactScore: async (parent: any) => {
      const { data } = await supabase.rpc('calculate_sponsor_impact_score', {
        p_sponsor_id: parent.id,
      })
      return data
    },
    // Map snake_case to camelCase
    userId: (parent: any) => parent.user_id,
    companyName: (parent: any) => parent.company_name,
    companyDescription: (parent: any) => parent.company_description,
    logoUrl: (parent: any) => parent.logo_url,
    websiteUrl: (parent: any) => parent.website_url,
    contactEmail: (parent: any) => parent.contact_email,
    contactPhone: (parent: any) => parent.contact_phone,
    isVerified: (parent: any) => parent.is_verified,
    verifiedAt: (parent: any) => parent.verified_at,
    preferredRegions: (parent: any) => parent.preferred_regions,
    preferredEventTypes: (parent: any) => parent.preferred_event_types,
    preferredDanceStyles: (parent: any) => parent.preferred_dance_styles,
    totalEventsSponsored: (parent: any) => parent.total_events_sponsored,
    totalFlowContributed: (parent: any) => parent.total_flow_contributed,
    totalDanzDistributed: (parent: any) => parent.total_danz_distributed,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,
  },

  SponsorCategory: {
    displayOrder: (parent: any) => parent.display_order,
    isActive: (parent: any) => parent.is_active,
  },

  EventSponsorship: {
    event: async (parent: any) => {
      if (parent.event && typeof parent.event === 'object') return parent.event
      const { data } = await supabase.from('events').select('*').eq('id', parent.event_id).single()
      return data
    },
    sponsor: async (parent: any) => {
      if (parent.sponsor && typeof parent.sponsor === 'object') return parent.sponsor
      const { data } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', parent.sponsor_id)
        .single()
      return data
    },
    allocationConfig: (parent: any) => {
      const config = parent.allocation_config || {}
      return {
        paidWorkersPercent: config.paid_workers || 80,
        volunteerRewardsPercent: config.volunteer_rewards || 15,
        platformFeePercent: config.platform_fee || 5,
      }
    },
    flowAmount: (parent: any) => parent.flow_amount,
    flowAllocated: (parent: any) => parent.flow_allocated,
    flowDistributed: (parent: any) => parent.flow_distributed,
    sponsorMessage: (parent: any) => parent.sponsor_message,
    completedAt: (parent: any) => parent.completed_at,
    completionNotes: (parent: any) => parent.completion_notes,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,
  },

  EventFlowPool: {
    event: async (parent: any) => {
      const { data } = await supabase.from('events').select('*').eq('id', parent.event_id).single()
      return data
    },
    sponsors: async (parent: any) => {
      const { data } = await supabase
        .from('event_sponsorships')
        .select('*, sponsor:sponsors(*)')
        .eq('event_id', parent.event_id)
        .in('status', ['active', 'completed'])
      return data || []
    },
    totalFlow: (parent: any) => parent.total_flow,
    allocatedFlow: (parent: any) => parent.allocated_flow,
    distributedFlow: (parent: any) => parent.distributed_flow,
    remainingFlow: (parent: any) => parent.remaining_flow,
    lockedAt: (parent: any) => parent.locked_at,
    distributionStartedAt: (parent: any) => parent.distribution_started_at,
    completedAt: (parent: any) => parent.completed_at,
  },

  FlowTransaction: {
    fromUser: async (parent: any) => {
      if (!parent.from_user_id) return null
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.from_user_id)
        .single()
      return data
    },
    toUser: async (parent: any) => {
      if (!parent.to_user_id) return null
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.to_user_id)
        .single()
      return data
    },
    sponsor: async (parent: any) => {
      if (!parent.sponsor_id) return null
      const { data } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', parent.sponsor_id)
        .single()
      return data
    },
    event: async (parent: any) => {
      if (!parent.event_id) return null
      const { data } = await supabase.from('events').select('*').eq('id', parent.event_id).single()
      return data
    },
    transactionType: (parent: any) => parent.transaction_type,
    txHash: (parent: any) => parent.tx_hash,
    createdAt: (parent: any) => parent.created_at,
    completedAt: (parent: any) => parent.completed_at,
  },

  SponsorSubscription: {
    sponsor: async (parent: any) => {
      const { data } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', parent.sponsor_id)
        .single()
      return data
    },
    defaultAllocationConfig: (parent: any) => {
      const config = parent.default_allocation_config || {}
      return {
        paidWorkersPercent: config.paid_workers || 80,
        volunteerRewardsPercent: config.volunteer_rewards || 15,
        platformFeePercent: config.platform_fee || 5,
      }
    },
    eventsSponsored: async (parent: any) => {
      // Get sponsorships created during this subscription period
      const { data } = await supabase
        .from('event_sponsorships')
        .select('*')
        .eq('sponsor_id', parent.sponsor_id)
        .gte('created_at', parent.current_period_start)
        .lte('created_at', parent.current_period_end || new Date().toISOString())
      return data || []
    },
    pendingMatches: async (parent: any) => {
      const { data } = await supabase
        .from('subscription_auto_matches')
        .select('*, event:events(*)')
        .eq('subscription_id', parent.id)
        .eq('status', 'pending')
      return data || []
    },
    planType: (parent: any) => parent.plan_type,
    sponsorshipMode: (parent: any) => parent.sponsorship_mode,
    budgetAmount: (parent: any) => parent.budget_amount,
    budgetSpent: (parent: any) => parent.budget_spent,
    budgetRemaining: (parent: any) => parent.budget_amount - parent.budget_spent,
    targetCategories: (parent: any) => parent.target_categories,
    verifiedEventsOnly: (parent: any) => parent.verified_events_only,
    autoApprove: (parent: any) => parent.auto_approve,
    maxPerEvent: (parent: any) => parent.max_per_event,
    defaultVisibility: (parent: any) => parent.default_visibility,
    currentPeriodStart: (parent: any) => parent.current_period_start,
    currentPeriodEnd: (parent: any) => parent.current_period_end,
    nextBillingDate: (parent: any) => parent.next_billing_date,
    lastBilledAt: (parent: any) => parent.last_billed_at,
    discountPercent: (parent: any) => parent.discount_percent,
    createdAt: (parent: any) => parent.created_at,
    cancelledAt: (parent: any) => parent.cancelled_at,
  },

  SubscriptionAutoMatch: {
    event: async (parent: any) => {
      if (parent.event && typeof parent.event === 'object') return parent.event
      const { data } = await supabase.from('events').select('*').eq('id', parent.event_id).single()
      return data
    },
    sponsorship: async (parent: any) => {
      if (!parent.sponsorship_id) return null
      const { data } = await supabase
        .from('event_sponsorships')
        .select('*')
        .eq('id', parent.sponsorship_id)
        .single()
      return data
    },
    subscriptionId: (parent: any) => parent.subscription_id,
    matchReason: (parent: any) => parent.match_reason,
    matchedCategories: (parent: any) => parent.matched_categories,
    flowAmount: (parent: any) => parent.flow_amount,
    notifiedAt: (parent: any) => parent.notified_at,
    respondedAt: (parent: any) => parent.responded_at,
    expiresAt: (parent: any) => parent.expires_at,
    createdAt: (parent: any) => parent.created_at,
  },

  VerifiedEventCreator: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()
      return data
    },
    userId: (parent: any) => parent.user_id,
    isVerified: (parent: any) => parent.is_verified,
    verifiedAt: (parent: any) => parent.verified_at,
    totalEventsHosted: (parent: any) => parent.total_events_hosted,
    averageEventRating: (parent: any) => parent.average_event_rating,
    totalAttendeesServed: (parent: any) => parent.total_attendees_served,
    autoVerified: (parent: any) => parent.auto_verified,
    verificationType: (parent: any) => parent.verification_type,
    verificationNotes: (parent: any) => parent.verification_notes,
  },

  SponsorshipApproval: {
    event: async (parent: any) => {
      if (parent.event && typeof parent.event === 'object') return parent.event
      const { data } = await supabase.from('events').select('*').eq('id', parent.event_id).single()
      return data
    },
    sponsor: async (parent: any) => {
      if (parent.sponsor && typeof parent.sponsor === 'object') return parent.sponsor
      const { data } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', parent.sponsor_id)
        .single()
      return data
    },
    sponsorship: async (parent: any) => {
      if (!parent.sponsorship_id) return null
      const { data } = await supabase
        .from('event_sponsorships')
        .select('*')
        .eq('id', parent.sponsorship_id)
        .single()
      return data
    },
    eventId: (parent: any) => parent.event_id,
    sponsorId: (parent: any) => parent.sponsor_id,
    proposedFlowAmount: (parent: any) => parent.proposed_flow_amount,
    proposedVisibility: (parent: any) => parent.proposed_visibility,
    proposedMessage: (parent: any) => parent.proposed_message,
    reviewedAt: (parent: any) => parent.reviewed_at,
    reviewedBy: (parent: any) => parent.reviewed_by,
    rejectionReason: (parent: any) => parent.rejection_reason,
    expiresAt: (parent: any) => parent.expires_at,
    autoExpired: (parent: any) => parent.auto_expired,
    createdAt: (parent: any) => parent.created_at,
  },

  EventSponsorshipSettings: {
    eventId: (parent: any) => parent.event_id,
    acceptanceMode: (parent: any) => parent.acceptance_mode,
    autoAcceptAll: (parent: any) => parent.auto_accept_all,
    preferredCategories: (parent: any) => parent.preferred_categories,
    blockedCategories: (parent: any) => parent.blocked_categories,
    minAutoAcceptAmount: (parent: any) => parent.min_auto_accept_amount,
    seekingSponsorship: (parent: any) => parent.seeking_sponsorship,
    sponsorshipGoal: (parent: any) => parent.sponsorship_goal,
    sponsorshipDeadline: (parent: any) => parent.sponsorship_deadline,
    pitchMessage: (parent: any) => parent.pitch_message,
    notifyOnNewSponsor: (parent: any) => parent.notify_on_new_sponsor,
    notifyOnGoalReached: (parent: any) => parent.notify_on_goal_reached,
  },

  SuggestedEvent: {
    event: (parent: any) => parent.event,
    matchScore: (parent: any) => parent.matchScore,
    matchReasons: (parent: any) => parent.matchReasons,
    estimatedReach: (parent: any) => parent.estimatedReach,
    categoryMatches: (parent: any) => parent.categoryMatches,
    currentSponsorshipTotal: (parent: any) => parent.currentSponsorshipTotal,
    sponsorshipGoal: (parent: any) => parent.sponsorshipGoal,
  },
}

// Helper function to get suggested events for a sponsor
async function getSuggestedEventsForSponsor(sponsor: any, limit: number = 10): Promise<any[]> {
  // Get upcoming events seeking sponsorship
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      sponsorship_settings:event_sponsorship_settings(*),
      creator:users!events_creator_id_fkey(privy_id, username, display_name)
    `)
    .gte('start_date_time', new Date().toISOString())
    .order('start_date_time', { ascending: true })
    .limit(50)

  if (!events) return []

  // Get existing sponsorships by this sponsor
  const { data: existingSponsors } = await supabase
    .from('event_sponsorships')
    .select('event_id')
    .eq('sponsor_id', sponsor.id)

  const existingEventIds = new Set(existingSponsors?.map(s => s.event_id) || [])

  // Get verified creators
  const { data: verifiedCreators } = await supabase
    .from('verified_event_creators')
    .select('user_id')
    .eq('is_verified', true)

  const verifiedUserIds = new Set(verifiedCreators?.map(v => v.user_id) || [])

  // Score and filter events
  const scoredEvents = events
    .filter(e => {
      // Filter out already sponsored events
      if (existingEventIds.has(e.id)) return false
      // Filter out events not seeking sponsorship
      if (e.sponsorship_settings && e.sponsorship_settings.seeking_sponsorship === false)
        return false
      return true
    })
    .map(event => {
      let score = 0
      const matchReasons: string[] = []
      const categoryMatches: string[] = []

      // Category match (+40 points per match)
      if (sponsor.categories?.length && event.category) {
        if (sponsor.categories.includes(event.category)) {
          score += 40
          matchReasons.push('Category match')
          categoryMatches.push(event.category)
        }
      }

      // Dance style match (+20 points per match)
      if (sponsor.preferred_dance_styles?.length && event.dance_styles?.length) {
        const matches = sponsor.preferred_dance_styles.filter((s: string) =>
          event.dance_styles.includes(s),
        )
        if (matches.length > 0) {
          score += matches.length * 20
          matchReasons.push(`${matches.length} dance style match(es)`)
        }
      }

      // Region match (+30 points)
      if (sponsor.preferred_regions?.length && event.location_city) {
        if (
          sponsor.preferred_regions.some(
            (r: string) =>
              event.location_city?.toLowerCase().includes(r.toLowerCase()) ||
              event.location_state?.toLowerCase().includes(r.toLowerCase()),
          )
        ) {
          score += 30
          matchReasons.push('Region match')
        }
      }

      // Event type match (+25 points)
      if (sponsor.preferred_event_types?.length && event.event_type) {
        if (sponsor.preferred_event_types.includes(event.event_type)) {
          score += 25
          matchReasons.push('Event type match')
        }
      }

      // Verified creator bonus (+15 points)
      if (verifiedUserIds.has(event.creator_id)) {
        score += 15
        matchReasons.push('Verified creator')
      }

      // Get current sponsorship total
      const currentTotal = 0 // Would need another query

      return {
        event,
        matchScore: score,
        matchReasons,
        categoryMatches,
        estimatedReach: event.max_capacity || 0,
        currentSponsorshipTotal: currentTotal,
        sponsorshipGoal: event.sponsorship_settings?.sponsorship_goal,
      }
    })
    .filter(e => e.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)

  return scoredEvents
}

// Helper function to update event flow pool
async function updateEventFlowPool(eventId: string, amount: number): Promise<void> {
  // Check if pool exists
  const { data: existingPool } = await supabase
    .from('event_flow_pools')
    .select('id, total_flow')
    .eq('event_id', eventId)
    .single()

  if (existingPool) {
    // Update existing pool
    await supabase
      .from('event_flow_pools')
      .update({
        total_flow: existingPool.total_flow + amount,
      })
      .eq('id', existingPool.id)
  } else {
    // Create new pool
    await supabase.from('event_flow_pools').insert({
      event_id: eventId,
      total_flow: amount,
      status: 'open',
    })
  }
}
