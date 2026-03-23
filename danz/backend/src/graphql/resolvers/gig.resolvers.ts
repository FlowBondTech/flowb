import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import {
  notifyGigApplicationApproved,
  notifyGigApplicationReceived,
  notifyGigApplicationRejected,
  notifyGigCancelled,
  notifyGigCompleted,
  notifyGigOpportunity,
  notifyGigRatingReceived,
  notifyGigRoleApproved,
  notifyGigRoleRejected,
} from '../../services/gigNotifications.js'
import type { GraphQLContext } from '../context.js'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

const requireGigManager = async (context: GraphQLContext) => {
  const userId = requireAuth(context)

  const { data: user } = await supabase
    .from('users')
    .select('is_admin, is_gig_manager')
    .eq('id', userId)
    .single()

  if (!user?.is_admin && !user?.is_gig_manager) {
    throw new GraphQLError('Gig manager privileges required', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return userId
}

const requireAdmin = async (context: GraphQLContext) => {
  const userId = requireAuth(context)

  const { data: user } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (!user?.is_admin) {
    throw new GraphQLError('Admin privileges required', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return userId
}

// Check if user can manage an event's gigs
const canManageEventGigs = async (userId: string, eventId: string): Promise<boolean> => {
  // Check if user is event creator
  const { data: event } = await supabase
    .from('events')
    .select('facilitator_id')
    .eq('id', eventId)
    .single()

  if (event?.facilitator_id === userId) return true

  // Check if user is assigned gig manager for this event
  const { data: manager } = await supabase
    .from('event_gig_managers')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  if (manager) return true

  // Check if user is platform gig manager or admin
  const { data: user } = await supabase
    .from('users')
    .select('is_admin, is_gig_manager')
    .eq('id', userId)
    .single()

  return user?.is_admin || user?.is_gig_manager
}

// Map database category to GraphQL enum
const mapCategory = (category: string): string => {
  return category?.toUpperCase() || 'OPERATIONS'
}

// Map database status to GraphQL enum
const mapStatus = (status: string): string => {
  return status?.toUpperCase() || 'PENDING'
}

// ============================================================================
// RESOLVERS
// ============================================================================

export const gigResolvers = {
  Query: {
    // ----- GIG ROLES -----
    allGigRoles: async (
      _: any,
      {
        category,
        tier,
        activeOnly = true,
      }: { category?: string; tier?: number; activeOnly?: boolean },
    ) => {
      let query = supabase.from('gig_roles').select('*')

      if (category) {
        query = query.eq('category', category.toLowerCase())
      }
      if (tier) {
        query = query.eq('tier', tier)
      }
      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query.order('tier', { ascending: true }).order('name')

      if (error) {
        throw new GraphQLError('Failed to fetch gig roles', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    gigRole: async (_: any, { id, slug }: { id?: string; slug?: string }) => {
      if (!id && !slug) {
        throw new GraphQLError('Either id or slug is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      let query = supabase.from('gig_roles').select('*')

      if (id) {
        query = query.eq('id', id)
      } else if (slug) {
        query = query.eq('slug', slug)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch gig role', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // ----- USER GIG ROLES -----
    myGigRoles: async (_: any, { status }: { status?: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      let query = supabase
        .from('user_gig_roles')
        .select(`
          *,
          role:gig_roles(*)
        `)
        .eq('user_id', userId)

      if (status) {
        query = query.eq('status', status.toLowerCase())
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch your gig roles', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    userGigRoles: async (_: any, { userId }: { userId: string }) => {
      const { data, error } = await supabase
        .from('user_gig_roles')
        .select(`
          *,
          role:gig_roles(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch user gig roles', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    // ----- EVENT GIGS -----
    eventGigs: async (_: any, { eventId }: { eventId: string }) => {
      const { data, error } = await supabase
        .from('event_gigs')
        .select(`
          *,
          role:gig_roles(*)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch event gigs', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    availableGigsForMe: async (
      _: any,
      { eventId, limit = 20, offset = 0 }: { eventId?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get user's approved role IDs
      const { data: userRoles } = await supabase
        .from('user_gig_roles')
        .select('role_id')
        .eq('user_id', userId)
        .eq('status', 'approved')

      if (!userRoles || userRoles.length === 0) {
        return []
      }

      const roleIds = userRoles.map(r => r.role_id)

      let query = supabase
        .from('event_gigs')
        .select(`
          *,
          role:gig_roles(*),
          event:events(id, title, start_date_time, end_date_time, location)
        `)
        .in('role_id', roleIds)
        .eq('status', 'open')
        .gt('slots_available', supabase.rpc('get_slots_filled', {})) // slots_available > slots_filled

      if (eventId) {
        query = query.eq('event_id', eventId)
      }

      // Filter out gigs where user already applied
      const { data: existingApplications } = await supabase
        .from('gig_applications')
        .select('gig_id')
        .eq('user_id', userId)

      const appliedGigIds = existingApplications?.map(a => a.gig_id) || []

      const { data, error } = await query
        .not('id', 'in', `(${appliedGigIds.join(',') || 'null'})`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch available gigs', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Filter gigs where slots are still available
      const filteredData = (data || []).filter(gig => gig.slots_filled < gig.slots_available)

      return filteredData
    },

    eventGig: async (_: any, { id }: { id: string }) => {
      const { data, error } = await supabase
        .from('event_gigs')
        .select(`
          *,
          role:gig_roles(*),
          event:events(id, title, start_date_time, end_date_time, location)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch gig', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // ----- GIG APPLICATIONS -----
    myGigApplications: async (
      _: any,
      { status, limit = 20, offset = 0 }: { status?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      let query = supabase
        .from('gig_applications')
        .select(`
          *,
          gig:event_gigs(
            *,
            role:gig_roles(*),
            event:events(id, title, start_date_time, end_date_time, location)
          ),
          userRole:user_gig_roles(*, role:gig_roles(*))
        `)
        .eq('user_id', userId)

      if (status) {
        query = query.eq('status', status.toLowerCase())
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch your applications', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    gigApplications: async (
      _: any,
      { gigId, status }: { gigId: string; status?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get the gig to check permissions
      const { data: gig } = await supabase
        .from('event_gigs')
        .select('event_id, created_by')
        .eq('id', gigId)
        .single()

      if (!gig) {
        throw new GraphQLError('Gig not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check if user can view applications
      const canView = await canManageEventGigs(userId, gig.event_id)
      if (!canView) {
        throw new GraphQLError('Not authorized to view applications for this gig', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      let query = supabase
        .from('gig_applications')
        .select(`
          *,
          user:users(id, username, display_name, avatar_url),
          userRole:user_gig_roles(*, role:gig_roles(*))
        `)
        .eq('gig_id', gigId)

      if (status) {
        query = query.eq('status', status.toLowerCase())
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch applications', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    gigApplication: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('gig_applications')
        .select(`
          *,
          gig:event_gigs(
            *,
            role:gig_roles(*),
            event:events(id, title, start_date_time, end_date_time, location, facilitator_id)
          ),
          user:users(id, username, display_name, avatar_url),
          userRole:user_gig_roles(*, role:gig_roles(*)),
          submissions:gig_submissions(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch application', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Check if user can view this application
      const isOwner = data.user_id === userId
      const isEventOwner = data.gig?.event?.facilitator_id === userId
      const canManage = await canManageEventGigs(userId, data.gig?.event_id)

      if (!isOwner && !isEventOwner && !canManage) {
        throw new GraphQLError('Not authorized to view this application', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      return data
    },

    // ----- DASHBOARD & STATS -----
    myGigStats: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get user gig data
      const { data: userData } = await supabase
        .from('users')
        .select('total_gig_danz_earned')
        .eq('id', userId)
        .single()

      // Get active roles count
      const { count: activeRoles } = await supabase
        .from('user_gig_roles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'approved')

      // Get application stats
      const { data: applications } = await supabase
        .from('gig_applications')
        .select('status, organizer_rating, updated_at')
        .eq('user_id', userId)

      const completedGigs = applications?.filter(a => a.status === 'completed') || []
      const approvedGigs = applications?.filter(a => a.status === 'approved') || []
      const pendingApps = applications?.filter(a => a.status === 'pending') || []

      const ratings = completedGigs.map(a => a.organizer_rating).filter(r => r !== null) as number[]
      const avgRating =
        ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

      const lastGig =
        completedGigs.length > 0
          ? completedGigs.sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
            )[0]
          : null

      return {
        totalGigsCompleted: completedGigs.length,
        totalDanzEarned: userData?.total_gig_danz_earned || 0,
        activeRoles: activeRoles || 0,
        currentApprovedGigs: approvedGigs.length,
        pendingApplications: pendingApps.length,
        averageRating: avgRating,
        lastGigDate: lastGig?.updated_at || null,
      }
    },

    myGigDashboard: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get stats
      const stats = await gigResolvers.Query.myGigStats(_, __, context)

      // Get my roles
      const myRoles = await gigResolvers.Query.myGigRoles(_, {}, context)

      // Get available gigs
      const availableGigs = await gigResolvers.Query.availableGigsForMe(_, { limit: 10 }, context)

      // Get active gigs (approved applications)
      const { data: activeGigs } = await supabase
        .from('gig_applications')
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*), event:events(id, title, start_date_time, location))
        `)
        .eq('user_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10)

      // Get recent history
      const { data: recentHistory } = await supabase
        .from('gig_applications')
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*), event:events(id, title, start_date_time, location))
        `)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(10)

      return {
        stats,
        myRoles: myRoles || [],
        availableGigs: availableGigs || [],
        activeGigs: activeGigs || [],
        recentHistory: recentHistory || [],
      }
    },

    gigManagerDashboard: async (_: any, __: any, context: GraphQLContext) => {
      await requireGigManager(context)

      // Get pending role applications
      const { data: pendingRoleApps } = await supabase
        .from('user_gig_roles')
        .select(`
          *,
          user:users(id, username, display_name, avatar_url),
          role:gig_roles(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50)

      // Get pending gig applications
      const { data: pendingGigApps } = await supabase
        .from('gig_applications')
        .select(`
          *,
          user:users(id, username, display_name, avatar_url),
          gig:event_gigs(*, role:gig_roles(*), event:events(id, title, start_date_time)),
          userRole:user_gig_roles(*, role:gig_roles(*))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50)

      // Get pending submissions
      const { data: pendingSubmissions } = await supabase
        .from('gig_submissions')
        .select(`
          *,
          application:gig_applications(
            *,
            user:users(id, username, display_name, avatar_url),
            gig:event_gigs(*, role:gig_roles(*))
          )
        `)
        .eq('ai_review_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50)

      // Get recently approved
      const { data: recentlyApproved } = await supabase
        .from('gig_applications')
        .select(`
          *,
          user:users(id, username, display_name, avatar_url),
          gig:event_gigs(*, role:gig_roles(*))
        `)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(20)

      // Get stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count: todayReviewed } = await supabase
        .from('gig_applications')
        .select('*', { count: 'exact', head: true })
        .not('reviewed_at', 'is', null)
        .gte('reviewed_at', today.toISOString())

      const { count: totalReviewed } = await supabase
        .from('gig_applications')
        .select('*', { count: 'exact', head: true })
        .not('reviewed_at', 'is', null)

      const { count: approvedCount } = await supabase
        .from('gig_applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'completed'])

      const { count: rejectedCount } = await supabase
        .from('gig_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')

      return {
        pendingRoleApplications: pendingRoleApps || [],
        pendingGigApplications: pendingGigApps || [],
        pendingSubmissions: pendingSubmissions || [],
        recentlyApproved: recentlyApproved || [],
        stats: {
          totalReviewed: totalReviewed || 0,
          approvedCount: approvedCount || 0,
          rejectedCount: rejectedCount || 0,
          averageReviewTime: null, // TODO: Calculate if needed
          todayReviewed: todayReviewed || 0,
        },
      }
    },

    // ----- REWARD RATES -----
    gigRewardRates: async (_: any, { roleId }: { roleId?: string }) => {
      let query = supabase
        .from('gig_reward_rates')
        .select(`
          *,
          role:gig_roles(*)
        `)
        .eq('is_active', true)

      if (roleId) {
        query = query.or(`role_id.eq.${roleId},role_id.is.null`)
      }

      const { data, error } = await query.order('action_type')

      if (error) {
        throw new GraphQLError('Failed to fetch reward rates', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },

    // ----- EVENT GIG MANAGERS -----
    eventGigManagers: async (_: any, { eventId }: { eventId: string }) => {
      const { data, error } = await supabase
        .from('event_gig_managers')
        .select(`
          *,
          user:users!event_gig_managers_user_id_fkey(id, username, display_name, avatar_url),
          assigner:users!event_gig_managers_assigned_by_fkey(id, username, display_name)
        `)
        .eq('event_id', eventId)

      if (error) {
        throw new GraphQLError('Failed to fetch event gig managers', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data || []
    },
  },

  Mutation: {
    // ----- USER GIG ROLE MANAGEMENT -----
    applyForGigRole: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if role exists and is active
      const { data: role } = await supabase
        .from('gig_roles')
        .select('*')
        .eq('id', input.roleId)
        .eq('is_active', true)
        .single()

      if (!role) {
        throw new GraphQLError('Gig role not found or inactive', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check for existing application
      const { data: existing } = await supabase
        .from('user_gig_roles')
        .select('id, status')
        .eq('user_id', userId)
        .eq('role_id', input.roleId)
        .single()

      if (existing) {
        if (existing.status === 'approved') {
          throw new GraphQLError('You already have this role', {
            extensions: { code: 'ALREADY_EXISTS' },
          })
        }
        if (existing.status === 'pending') {
          throw new GraphQLError('You already have a pending application for this role', {
            extensions: { code: 'ALREADY_EXISTS' },
          })
        }
      }

      // Determine initial status based on tier and verification
      // Tier 1 roles auto-approve, others require review
      const initialStatus = role.tier === 1 && !role.requires_verification ? 'approved' : 'pending'

      const { data, error } = await supabase
        .from('user_gig_roles')
        .insert({
          user_id: userId,
          role_id: input.roleId,
          status: initialStatus,
          portfolio_urls: input.portfolioUrls || [],
          certifications: input.certifications || [],
          experience_notes: input.experienceNotes || null,
          verified_at: initialStatus === 'approved' ? new Date().toISOString() : null,
        })
        .select(`
          *,
          role:gig_roles(*)
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to apply for gig role', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    updateGigRoleApplication: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Verify ownership
      const { data: existing } = await supabase
        .from('user_gig_roles')
        .select('user_id, status')
        .eq('id', id)
        .single()

      if (!existing || existing.user_id !== userId) {
        throw new GraphQLError('Application not found or not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      if (existing.status !== 'pending') {
        throw new GraphQLError('Can only update pending applications', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      const { data, error } = await supabase
        .from('user_gig_roles')
        .update({
          portfolio_urls: input.portfolioUrls,
          certifications: input.certifications,
          experience_notes: input.experienceNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          role:gig_roles(*)
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to update application', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    withdrawGigRoleApplication: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: existing } = await supabase
        .from('user_gig_roles')
        .select('user_id, status')
        .eq('id', id)
        .single()

      if (!existing || existing.user_id !== userId) {
        throw new GraphQLError('Application not found or not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { error } = await supabase.from('user_gig_roles').delete().eq('id', id)

      if (error) {
        throw new GraphQLError('Failed to withdraw application', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return { success: true, message: 'Application withdrawn successfully' }
    },

    // ----- GIG MANAGER: ROLE REVIEW -----
    reviewGigRoleApplication: async (
      _: any,
      { id, approved, reason }: { id: string; approved: boolean; reason?: string },
      context: GraphQLContext,
    ) => {
      const managerId = await requireGigManager(context)

      const { data, error } = await supabase
        .from('user_gig_roles')
        .update({
          status: approved ? 'approved' : 'rejected',
          verified_at: approved ? new Date().toISOString() : null,
          verified_by: managerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          role:gig_roles(*),
          user:users(id, username, display_name)
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to review application', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Send notification to user about approval/rejection
      if (data.role && data.user) {
        const roleInfo = { id: data.role.id, name: data.role.name, slug: data.role.slug }
        if (approved) {
          notifyGigRoleApproved(data.user_id, roleInfo, managerId).catch(console.error)
        } else {
          notifyGigRoleRejected(data.user_id, roleInfo, reason).catch(console.error)
        }
      }

      return data
    },

    // ----- EVENT GIG MANAGEMENT -----
    createEventGig: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Verify user can manage this event's gigs
      const canManage = await canManageEventGigs(userId, input.eventId)
      if (!canManage) {
        throw new GraphQLError('Not authorized to create gigs for this event', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      // Get role info for default title
      const { data: role } = await supabase
        .from('gig_roles')
        .select('name')
        .eq('id', input.roleId)
        .single()

      const { data, error } = await supabase
        .from('event_gigs')
        .insert({
          event_id: input.eventId,
          role_id: input.roleId,
          title: input.title || role?.name || 'Gig',
          description: input.description,
          slots_available: input.slotsAvailable,
          danz_reward: input.danzReward,
          bonus_danz: input.bonusDanz || 0,
          time_commitment: input.timeCommitment,
          specific_requirements: input.specificRequirements,
          approval_mode: input.approvalMode?.toLowerCase() || 'manual',
          gig_source: input.gigSource?.toLowerCase() || 'public',
          requires_local: input.requiresLocal || false,
          local_radius_km: input.localRadiusKm || 50,
          created_by: userId,
        })
        .select(`
          *,
          role:gig_roles(*),
          event:events(id, title, start_date_time)
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to create event gig', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    updateEventGig: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get gig to check permissions
      const { data: gig } = await supabase
        .from('event_gigs')
        .select('event_id, created_by')
        .eq('id', id)
        .single()

      if (!gig) {
        throw new GraphQLError('Gig not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const canManage = await canManageEventGigs(userId, gig.event_id)
      if (!canManage) {
        throw new GraphQLError('Not authorized to update this gig', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const updateData: any = { updated_at: new Date().toISOString() }

      if (input.title !== undefined) updateData.title = input.title
      if (input.description !== undefined) updateData.description = input.description
      if (input.slotsAvailable !== undefined) updateData.slots_available = input.slotsAvailable
      if (input.danzReward !== undefined) updateData.danz_reward = input.danzReward
      if (input.bonusDanz !== undefined) updateData.bonus_danz = input.bonusDanz
      if (input.timeCommitment !== undefined) updateData.time_commitment = input.timeCommitment
      if (input.specificRequirements !== undefined)
        updateData.specific_requirements = input.specificRequirements
      if (input.approvalMode !== undefined)
        updateData.approval_mode = input.approvalMode.toLowerCase()
      if (input.gigSource !== undefined) updateData.gig_source = input.gigSource.toLowerCase()
      if (input.requiresLocal !== undefined) updateData.requires_local = input.requiresLocal
      if (input.localRadiusKm !== undefined) updateData.local_radius_km = input.localRadiusKm
      if (input.status !== undefined) updateData.status = input.status.toLowerCase()

      const { data, error } = await supabase
        .from('event_gigs')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          role:gig_roles(*),
          event:events(id, title)
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to update gig', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    deleteEventGig: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: gig } = await supabase
        .from('event_gigs')
        .select('event_id, slots_filled')
        .eq('id', id)
        .single()

      if (!gig) {
        throw new GraphQLError('Gig not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const canManage = await canManageEventGigs(userId, gig.event_id)
      if (!canManage) {
        throw new GraphQLError('Not authorized to delete this gig', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      if (gig.slots_filled > 0) {
        throw new GraphQLError('Cannot delete gig with approved applications. Cancel it instead.', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      const { error } = await supabase.from('event_gigs').delete().eq('id', id)

      if (error) {
        throw new GraphQLError('Failed to delete gig', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return { success: true, message: 'Gig deleted successfully' }
    },

    cancelEventGig: async (
      _: any,
      { id, reason }: { id: string; reason?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: gig } = await supabase
        .from('event_gigs')
        .select('event_id')
        .eq('id', id)
        .single()

      if (!gig) {
        throw new GraphQLError('Gig not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const canManage = await canManageEventGigs(userId, gig.event_id)
      if (!canManage) {
        throw new GraphQLError('Not authorized to cancel this gig', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      // Update gig status
      const { data, error } = await supabase
        .from('event_gigs')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          role:gig_roles(*)
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to cancel gig', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Get affected workers before updating
      const { data: affectedApplications } = await supabase
        .from('gig_applications')
        .select('user_id')
        .eq('gig_id', id)
        .eq('status', 'approved')

      // Update all approved applications to rejected with cancellation reason
      await supabase
        .from('gig_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason || 'Gig was cancelled by organizer',
          updated_at: new Date().toISOString(),
        })
        .eq('gig_id', id)
        .eq('status', 'approved')

      // Send notifications to affected workers
      if (affectedApplications && affectedApplications.length > 0) {
        const workerIds = affectedApplications.map(a => a.user_id)
        const gigInfo = {
          id,
          title: data.title,
          danz_reward: data.danz_reward,
          event_id: gig.event_id,
          role: data.role,
        }
        notifyGigCancelled(workerIds, gigInfo, reason).catch(console.error)
      }

      return data
    },

    // ----- GIG APPLICATIONS -----
    applyForGig: async (
      _: any,
      { gigId, note }: { gigId: string; note?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get gig info
      const { data: gig } = await supabase
        .from('event_gigs')
        .select('*, role:gig_roles(*)')
        .eq('id', gigId)
        .single()

      if (!gig) {
        throw new GraphQLError('Gig not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      if (gig.status !== 'open') {
        throw new GraphQLError('This gig is no longer accepting applications', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      if (gig.slots_filled >= gig.slots_available) {
        throw new GraphQLError('This gig is fully booked', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      // Check if user has the required role approved
      const { data: userRole } = await supabase
        .from('user_gig_roles')
        .select('id, status')
        .eq('user_id', userId)
        .eq('role_id', gig.role_id)
        .single()

      if (!userRole || userRole.status !== 'approved') {
        throw new GraphQLError('You need an approved role for this gig type', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      // Check for existing application
      const { data: existing } = await supabase
        .from('gig_applications')
        .select('id, status')
        .eq('gig_id', gigId)
        .eq('user_id', userId)
        .single()

      if (existing) {
        throw new GraphQLError('You have already applied for this gig', {
          extensions: { code: 'ALREADY_EXISTS' },
        })
      }

      // Determine initial status based on approval mode
      let initialStatus = 'pending'
      if (gig.approval_mode === 'auto') {
        initialStatus = 'approved'
      }

      const { data, error } = await supabase
        .from('gig_applications')
        .insert({
          gig_id: gigId,
          user_id: userId,
          user_role_id: userRole.id,
          status: initialStatus,
          application_note: note,
        })
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*), event:events(id, title)),
          userRole:user_gig_roles(*, role:gig_roles(*))
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to apply for gig', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Send notification to event organizer
      if (data.gig?.event) {
        // Get event facilitator
        const { data: event } = await supabase
          .from('events')
          .select('facilitator_id')
          .eq('id', gig.event_id)
          .single()

        if (event?.facilitator_id) {
          const { data: applicantUser } = await supabase
            .from('users')
            .select('id, username, display_name')
            .eq('id', userId)
            .single()

          if (applicantUser) {
            const gigInfo = {
              id: gigId,
              title: gig.title,
              danz_reward: gig.danz_reward,
              event_id: gig.event_id,
              role: gig.role,
            }
            notifyGigApplicationReceived(event.facilitator_id, applicantUser, gigInfo).catch(
              console.error,
            )
          }
        }
      }

      return data
    },

    withdrawGigApplication: async (
      _: any,
      { applicationId }: { applicationId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: application } = await supabase
        .from('gig_applications')
        .select('user_id, status')
        .eq('id', applicationId)
        .single()

      if (!application || application.user_id !== userId) {
        throw new GraphQLError('Application not found or not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      if (application.status === 'completed') {
        throw new GraphQLError('Cannot withdraw completed gig', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      const { data, error } = await supabase
        .from('gig_applications')
        .update({
          status: 'withdrawn',
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*))
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to withdraw application', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // ----- GIG MANAGER: APPLICATION REVIEW -----
    reviewGigApplication: async (
      _: any,
      { applicationId, input }: { applicationId: string; input: any },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get application and gig
      const { data: application } = await supabase
        .from('gig_applications')
        .select('*, gig:event_gigs(event_id)')
        .eq('id', applicationId)
        .single()

      if (!application) {
        throw new GraphQLError('Application not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const canManage = await canManageEventGigs(userId, application.gig.event_id)
      if (!canManage) {
        throw new GraphQLError('Not authorized to review this application', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { data, error } = await supabase
        .from('gig_applications')
        .update({
          status: input.approved ? 'approved' : 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: !input.approved ? input.reason : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*), event:events(id, title)),
          user:users(id, username, display_name),
          userRole:user_gig_roles(*, role:gig_roles(*))
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to review application', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Send notification to applicant
      if (data.gig && data.user_id) {
        const gigInfo = {
          id: data.gig.id,
          title: data.gig.title,
          danz_reward: data.gig.danz_reward,
          event_id: data.gig.event_id,
          event: data.gig.event,
          role: data.gig.role,
        }
        if (input.approved) {
          notifyGigApplicationApproved(data.user_id, gigInfo, applicationId).catch(console.error)
        } else {
          notifyGigApplicationRejected(data.user_id, gigInfo, applicationId, input.reason).catch(
            console.error,
          )
        }
      }

      return data
    },

    // ----- WORK COMPLETION -----
    checkInToGig: async (
      _: any,
      { applicationId }: { applicationId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: application } = await supabase
        .from('gig_applications')
        .select('user_id, status, check_in_time')
        .eq('id', applicationId)
        .single()

      if (!application || application.user_id !== userId) {
        throw new GraphQLError('Application not found or not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      if (application.status !== 'approved') {
        throw new GraphQLError('Can only check in to approved gigs', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      if (application.check_in_time) {
        throw new GraphQLError('Already checked in', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      const { data, error } = await supabase
        .from('gig_applications')
        .update({
          check_in_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*), event:events(id, title))
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to check in', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    checkOutFromGig: async (
      _: any,
      { applicationId }: { applicationId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: application } = await supabase
        .from('gig_applications')
        .select('user_id, status, check_in_time, check_out_time')
        .eq('id', applicationId)
        .single()

      if (!application || application.user_id !== userId) {
        throw new GraphQLError('Application not found or not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      if (!application.check_in_time) {
        throw new GraphQLError('Must check in before checking out', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      if (application.check_out_time) {
        throw new GraphQLError('Already checked out', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      const { data, error } = await supabase
        .from('gig_applications')
        .update({
          check_out_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*), event:events(id, title))
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to check out', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    submitGigProof: async (
      _: any,
      { applicationId, input }: { applicationId: string; input: any },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: application } = await supabase
        .from('gig_applications')
        .select('user_id, status')
        .eq('id', applicationId)
        .single()

      if (!application || application.user_id !== userId) {
        throw new GraphQLError('Application not found or not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      if (application.status !== 'approved') {
        throw new GraphQLError('Can only submit proof for approved gigs', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      const { data, error } = await supabase
        .from('gig_submissions')
        .insert({
          application_id: applicationId,
          submission_type: input.submissionType.toLowerCase(),
          content_url: input.contentUrl,
          content_text: input.contentText,
          metadata: input.metadata,
        })
        .select('*')
        .single()

      if (error) {
        throw new GraphQLError('Failed to submit proof', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // ----- GIG MANAGER: SUBMISSION REVIEW -----
    reviewGigSubmission: async (
      _: any,
      { submissionId, input }: { submissionId: string; input: any },
      context: GraphQLContext,
    ) => {
      const managerId = await requireGigManager(context)

      const { data, error } = await supabase
        .from('gig_submissions')
        .update({
          manual_review_status: input.approved ? 'approved' : 'rejected',
          ai_review_status: input.approved ? 'approved' : 'rejected',
          ai_review_notes: input.notes ? { manager_notes: input.notes } : null,
          reviewed_by: managerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select('*')
        .single()

      if (error) {
        throw new GraphQLError('Failed to review submission', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    completeGigAndAward: async (
      _: any,
      { applicationId, bonusDanz }: { applicationId: string; bonusDanz?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get application and gig
      const { data: application } = await supabase
        .from('gig_applications')
        .select('*, gig:event_gigs(event_id, danz_reward, bonus_danz)')
        .eq('id', applicationId)
        .single()

      if (!application) {
        throw new GraphQLError('Application not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const canManage = await canManageEventGigs(userId, application.gig.event_id)
      if (!canManage) {
        throw new GraphQLError('Not authorized to complete this gig', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      if (application.status === 'completed') {
        throw new GraphQLError('Gig already completed', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      // Calculate total reward
      const baseReward = application.gig.danz_reward || 0
      const bonus = bonusDanz || application.gig.bonus_danz || 0
      const totalReward = baseReward + bonus

      const { data, error } = await supabase
        .from('gig_applications')
        .update({
          status: 'completed',
          danz_awarded: totalReward,
          danz_awarded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*), event:events(id, title)),
          user:users(id, username, display_name),
          userRole:user_gig_roles(*, role:gig_roles(*))
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to complete gig', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Create point transaction
      await supabase.from('point_transactions').insert({
        user_id: application.user_id,
        action_key: 'gig_completion',
        points_amount: totalReward,
        transaction_type: 'earn',
        reference_id: applicationId,
        reference_type: 'gig',
        metadata: {
          gig_id: application.gig_id,
          event_id: application.gig.event_id,
          base_reward: baseReward,
          bonus: bonus,
        },
        status: 'completed',
      })

      // Send notification to worker
      if (data.gig && data.user_id) {
        const gigInfo = {
          id: data.gig.id,
          title: data.gig.title,
          danz_reward: data.gig.danz_reward,
          event_id: data.gig.event_id,
          event: data.gig.event,
          role: data.gig.role,
        }
        notifyGigCompleted(data.user_id, gigInfo, applicationId, totalReward).catch(console.error)
      }

      return data
    },

    // ----- RATINGS -----
    rateGigWorker: async (
      _: any,
      {
        applicationId,
        rating,
        feedback,
      }: { applicationId: string; rating: number; feedback?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      if (rating < 1 || rating > 5) {
        throw new GraphQLError('Rating must be between 1 and 5', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      const { data: application } = await supabase
        .from('gig_applications')
        .select('*, gig:event_gigs(event_id)')
        .eq('id', applicationId)
        .single()

      if (!application) {
        throw new GraphQLError('Application not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const canManage = await canManageEventGigs(userId, application.gig.event_id)
      if (!canManage) {
        throw new GraphQLError('Not authorized to rate this worker', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { data, error } = await supabase
        .from('gig_applications')
        .update({
          organizer_rating: rating,
          organizer_feedback: feedback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*)),
          user:users(id, username, display_name)
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to rate worker', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Award bonus for high rating
      if (rating >= 4.5 && application.status === 'completed') {
        await supabase.from('point_transactions').insert({
          user_id: application.user_id,
          action_key: 'gig_rating_bonus',
          points_amount: 25,
          transaction_type: 'bonus',
          reference_id: applicationId,
          reference_type: 'gig',
          metadata: { rating },
          status: 'completed',
        })
      }

      // Send notification to worker about the rating
      if (data.gig && data.user_id) {
        const gigInfo = {
          id: data.gig.id,
          title: data.gig.title,
          danz_reward: data.gig.danz_reward,
          event_id: application.gig.event_id,
          role: data.gig.role,
        }
        notifyGigRatingReceived(data.user_id, gigInfo, applicationId, rating, feedback).catch(
          console.error,
        )
      }

      return data
    },

    rateGigOrganizer: async (
      _: any,
      {
        applicationId,
        rating,
        feedback,
      }: { applicationId: string; rating: number; feedback?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      if (rating < 1 || rating > 5) {
        throw new GraphQLError('Rating must be between 1 and 5', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      const { data: application } = await supabase
        .from('gig_applications')
        .select('user_id, status')
        .eq('id', applicationId)
        .single()

      if (!application || application.user_id !== userId) {
        throw new GraphQLError('Application not found or not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      if (application.status !== 'completed') {
        throw new GraphQLError('Can only rate organizer after gig is completed', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      const { data, error } = await supabase
        .from('gig_applications')
        .update({
          worker_rating: rating,
          worker_feedback: feedback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*))
        `)
        .single()

      if (error) {
        throw new GraphQLError('Failed to rate organizer', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    // ----- EVENT GIG MANAGERS -----
    assignEventGigManager: async (
      _: any,
      { eventId, userId: targetUserId }: { eventId: string; userId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Check if current user is event owner or admin
      const { data: event } = await supabase
        .from('events')
        .select('facilitator_id')
        .eq('id', eventId)
        .single()

      if (!event) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (event.facilitator_id !== userId && !currentUser?.is_admin) {
        throw new GraphQLError('Only event creator or admin can assign gig managers', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { data, error } = await supabase
        .from('event_gig_managers')
        .insert({
          event_id: eventId,
          user_id: targetUserId,
          assigned_by: userId,
        })
        .select(`
          *,
          user:users!event_gig_managers_user_id_fkey(id, username, display_name, avatar_url),
          assigner:users!event_gig_managers_assigned_by_fkey(id, username, display_name)
        `)
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new GraphQLError('User is already a gig manager for this event', {
            extensions: { code: 'ALREADY_EXISTS' },
          })
        }
        throw new GraphQLError('Failed to assign gig manager', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    removeEventGigManager: async (
      _: any,
      { eventId, userId: targetUserId }: { eventId: string; userId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: event } = await supabase
        .from('events')
        .select('facilitator_id')
        .eq('id', eventId)
        .single()

      if (!event) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (event.facilitator_id !== userId && !currentUser?.is_admin) {
        throw new GraphQLError('Only event creator or admin can remove gig managers', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { error } = await supabase
        .from('event_gig_managers')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', targetUserId)

      if (error) {
        throw new GraphQLError('Failed to remove gig manager', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return { success: true, message: 'Gig manager removed successfully' }
    },

    // ----- ADMIN: GIG MANAGER PROMOTION -----
    promoteToGigManager: async (
      _: any,
      { userId: targetUserId }: { userId: string },
      context: GraphQLContext,
    ) => {
      const adminId = await requireAdmin(context)

      const { data, error } = await supabase
        .from('users')
        .update({
          is_gig_manager: true,
          gig_manager_approved_at: new Date().toISOString(),
          gig_manager_approved_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId)
        .select('*')
        .single()

      if (error) {
        throw new GraphQLError('Failed to promote user to gig manager', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    demoteGigManager: async (
      _: any,
      { userId: targetUserId }: { userId: string },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      const { data, error } = await supabase
        .from('users')
        .update({
          is_gig_manager: false,
          gig_manager_approved_at: null,
          gig_manager_approved_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId)
        .select('*')
        .single()

      if (error) {
        throw new GraphQLError('Failed to demote gig manager', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },
  },

  // ----- TYPE RESOLVERS -----
  GigRole: {
    category: (parent: any) => mapCategory(parent.category),
    baseDanzRate: (parent: any) => parent.base_danz_rate || 0,
    requiresVerification: (parent: any) => parent.requires_verification || false,
    verificationRequirements: (parent: any) => parent.verification_requirements,
    isActive: (parent: any) => parent.is_active,
    createdAt: (parent: any) => parent.created_at,

    registeredWorkers: async (parent: any) => {
      const { count } = await supabase
        .from('user_gig_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', parent.id)

      return count || 0
    },

    approvedWorkers: async (parent: any) => {
      const { count } = await supabase
        .from('user_gig_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', parent.id)
        .eq('status', 'approved')

      return count || 0
    },
  },

  UserGigRole: {
    userId: (parent: any) => parent.user_id,
    roleId: (parent: any) => parent.role_id,
    status: (parent: any) => mapStatus(parent.status),
    verifiedAt: (parent: any) => parent.verified_at,
    verifiedBy: (parent: any) => parent.verified_by,
    portfolioUrls: (parent: any) => parent.portfolio_urls || [],
    experienceNotes: (parent: any) => parent.experience_notes,
    totalGigsCompleted: (parent: any) => parent.total_gigs_completed || 0,
    totalDanzEarned: (parent: any) => parent.total_danz_earned || 0,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,

    user: async (parent: any) => {
      if (parent.user) return parent.user
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single()
      return data
    },

    role: (parent: any) => parent.role,
  },

  EventGig: {
    eventId: (parent: any) => parent.event_id,
    roleId: (parent: any) => parent.role_id,
    slotsAvailable: (parent: any) => parent.slots_available,
    slotsFilled: (parent: any) => parent.slots_filled || 0,
    danzReward: (parent: any) => parent.danz_reward,
    bonusDanz: (parent: any) => parent.bonus_danz || 0,
    timeCommitment: (parent: any) => parent.time_commitment,
    specificRequirements: (parent: any) => parent.specific_requirements,
    approvalMode: (parent: any) => parent.approval_mode?.toUpperCase() || 'MANUAL',
    gigSource: (parent: any) => parent.gig_source?.toUpperCase() || 'PUBLIC',
    requiresLocal: (parent: any) => parent.requires_local || false,
    localRadiusKm: (parent: any) => parent.local_radius_km,
    status: (parent: any) => parent.status?.toUpperCase() || 'OPEN',
    createdBy: (parent: any) => parent.created_by,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,

    event: (parent: any) => parent.event,
    role: (parent: any) => parent.role,

    applications: async (parent: any) => {
      const { data } = await supabase
        .from('gig_applications')
        .select('*')
        .eq('gig_id', parent.id)
        .order('created_at', { ascending: false })
      return data || []
    },

    approvedApplications: async (parent: any) => {
      const { data } = await supabase
        .from('gig_applications')
        .select(`
          *,
          user:users(id, username, display_name, avatar_url)
        `)
        .eq('gig_id', parent.id)
        .eq('status', 'approved')
      return data || []
    },

    myApplication: async (parent: any, _: any, context: GraphQLContext) => {
      if (!context.userId) return null
      const { data } = await supabase
        .from('gig_applications')
        .select('*')
        .eq('gig_id', parent.id)
        .eq('user_id', context.userId)
        .single()
      return data
    },

    canApply: async (parent: any, _: any, context: GraphQLContext) => {
      if (!context.userId) return false
      if (parent.status !== 'open') return false
      if (parent.slots_filled >= parent.slots_available) return false

      // Check if user has approved role
      const { data: userRole } = await supabase
        .from('user_gig_roles')
        .select('id')
        .eq('user_id', context.userId)
        .eq('role_id', parent.role_id)
        .eq('status', 'approved')
        .single()

      if (!userRole) return false

      // Check if already applied
      const { data: existing } = await supabase
        .from('gig_applications')
        .select('id')
        .eq('gig_id', parent.id)
        .eq('user_id', context.userId)
        .single()

      return !existing
    },
  },

  GigApplication: {
    gigId: (parent: any) => parent.gig_id,
    userId: (parent: any) => parent.user_id,
    userRoleId: (parent: any) => parent.user_role_id,
    status: (parent: any) => mapStatus(parent.status),
    applicationNote: (parent: any) => parent.application_note,
    aiReviewScore: (parent: any) => parent.ai_review_score,
    aiReviewNotes: (parent: any) => parent.ai_review_notes,
    aiReviewedAt: (parent: any) => parent.ai_reviewed_at,
    reviewedBy: (parent: any) => parent.reviewed_by,
    reviewedAt: (parent: any) => parent.reviewed_at,
    rejectionReason: (parent: any) => parent.rejection_reason,
    checkInTime: (parent: any) => parent.check_in_time,
    checkOutTime: (parent: any) => parent.check_out_time,
    completionProof: (parent: any) => parent.completion_proof,
    organizerRating: (parent: any) => parent.organizer_rating,
    organizerFeedback: (parent: any) => parent.organizer_feedback,
    workerRating: (parent: any) => parent.worker_rating,
    workerFeedback: (parent: any) => parent.worker_feedback,
    danzAwarded: (parent: any) => parent.danz_awarded || 0,
    danzAwardedAt: (parent: any) => parent.danz_awarded_at,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,

    gig: (parent: any) => parent.gig,
    user: (parent: any) => parent.user,
    userRole: (parent: any) => parent.userRole,

    reviewer: async (parent: any) => {
      if (!parent.reviewed_by) return null
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.reviewed_by)
        .single()
      return data
    },

    submissions: async (parent: any) => {
      if (parent.submissions) return parent.submissions
      const { data } = await supabase
        .from('gig_submissions')
        .select('*')
        .eq('application_id', parent.id)
        .order('created_at', { ascending: false })
      return data || []
    },
  },

  GigSubmission: {
    applicationId: (parent: any) => parent.application_id,
    submissionType: (parent: any) => parent.submission_type?.toUpperCase() || 'TEXT',
    contentUrl: (parent: any) => parent.content_url,
    contentText: (parent: any) => parent.content_text,
    aiReviewStatus: (parent: any) => parent.ai_review_status,
    aiReviewScore: (parent: any) => parent.ai_review_score,
    aiReviewNotes: (parent: any) => parent.ai_review_notes,
    manualReviewStatus: (parent: any) => parent.manual_review_status,
    reviewedBy: (parent: any) => parent.reviewed_by,
    reviewedAt: (parent: any) => parent.reviewed_at,
    createdAt: (parent: any) => parent.created_at,

    application: async (parent: any) => {
      if (parent.application) return parent.application
      const { data } = await supabase
        .from('gig_applications')
        .select('*')
        .eq('id', parent.application_id)
        .single()
      return data
    },
  },

  GigRewardRate: {
    roleId: (parent: any) => parent.role_id,
    actionType: (parent: any) => parent.action_type,
    rateName: (parent: any) => parent.rate_name,
    rateType: (parent: any) => parent.rate_type,
    baseAmount: (parent: any) => parent.base_amount,
    minAmount: (parent: any) => parent.min_amount,
    maxAmount: (parent: any) => parent.max_amount,
    isActive: (parent: any) => parent.is_active,
    createdAt: (parent: any) => parent.created_at,

    role: (parent: any) => parent.role,
  },

  EventGigManager: {
    eventId: (parent: any) => parent.event_id,
    userId: (parent: any) => parent.user_id,
    assignedBy: (parent: any) => parent.assigned_by,
    assignedAt: (parent: any) => parent.assigned_at,

    event: (parent: any) => parent.event,
    user: (parent: any) => parent.user,
    assigner: (parent: any) => parent.assigner,
  },
}
