import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

const requireAdmin = async (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }

  // Fetch user to check admin role
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('privy_id', context.userId)
    .single()

  if (!user || user.role !== 'admin') {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return context.userId
}

export const adminResolvers = {
  Query: {
    getAllUsers: async (_: any, __: any, context: GraphQLContext) => {
      await requireAdmin(context)

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        throw new GraphQLError('Failed to fetch users', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return users || []
    },

    getAllEventRegistrations: async (_: any, __: any, context: GraphQLContext) => {
      await requireAdmin(context)

      const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          user:users!event_registrations_user_id_fkey(
            privy_id,
            username,
            display_name
          ),
          event:events!event_registrations_event_id_fkey(
            id,
            title,
            start_date_time,
            location_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching event registrations:', error)
        throw new GraphQLError('Failed to fetch event registrations', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return registrations || []
    },

    getAllEvents: async (
      _: any,
      { status, category, facilitator_id, limit = 50, offset = 0 }: any,
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      const now = new Date().toISOString()

      // Build query - include registrations for count
      let query = supabase
        .from('events')
        .select('*, facilitator:users!facilitator_id(*), event_registrations(id)', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })

      // Apply filters
      if (category) {
        query = query.eq('category', category)
      }
      if (facilitator_id) {
        query = query.eq('facilitator_id', facilitator_id)
      }

      // Status filter
      if (status === 'upcoming') {
        query = query.gt('end_date_time', now).eq('is_cancelled', false)
      } else if (status === 'past') {
        query = query.lt('end_date_time', now)
      } else if (status === 'cancelled') {
        query = query.eq('is_cancelled', true)
      } else if (status === 'ongoing') {
        query = query.lte('start_date_time', now).gte('end_date_time', now)
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data: events, error, count } = await query

      if (error) {
        console.error('Error fetching events:', error)
        throw new GraphQLError('Failed to fetch events', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // Get counts for each status
      const { count: upcomingCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gt('end_date_time', now)
        .eq('is_cancelled', false)

      const { count: pastCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .lt('end_date_time', now)

      const { count: cancelledCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_cancelled', true)

      // Add status and registration count to each event
      const eventsWithStatus = (events || []).map((event: any) => {
        const startDate = new Date(event.start_date_time)
        const endDate = new Date(event.end_date_time)
        const nowDate = new Date()

        let eventStatus = 'upcoming'
        if (event.is_cancelled) {
          eventStatus = 'cancelled'
        } else if (nowDate > endDate) {
          eventStatus = 'past'
        } else if (nowDate >= startDate && nowDate <= endDate) {
          eventStatus = 'ongoing'
        }

        // Calculate registration count from nested registrations
        const registrationCount = event.event_registrations?.length || 0

        // Remove the nested registrations array to avoid bloating response
        const { event_registrations, ...eventWithoutRegistrations } = event

        return {
          ...eventWithoutRegistrations,
          status: eventStatus,
          registration_count: registrationCount,
        }
      })

      return {
        events: eventsWithStatus,
        totalCount: count || 0,
        upcomingCount: upcomingCount || 0,
        pastCount: pastCount || 0,
        cancelledCount: cancelledCount || 0,
      }
    },

    adminStats: async (_: any, __: any, context: GraphQLContext) => {
      await requireAdmin(context)

      // Get total users
      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact' })

      // Get total events
      const { count: totalEvents } = await supabase.from('events').select('*', { count: 'exact' })

      // Get active users (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', thirtyDaysAgo.toISOString())

      // Get upcoming events (not cancelled)
      const now = new Date().toISOString()
      const { count: upcomingEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gt('start_date_time', now)
        .eq('is_cancelled', false)

      // Get new users this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { count: newUsersThisMonth } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .gte('created_at', startOfMonth.toISOString())

      // Get events this month
      const { count: eventsThisMonth } = await supabase
        .from('events')
        .select('*', { count: 'exact' })
        .gte('created_at', startOfMonth.toISOString())

      // Calculate total revenue (simplified - would need payment records)
      const { data: paidRegistrations } = await supabase
        .from('event_registrations')
        .select('payment_amount')
        .eq('payment_status', 'paid')

      const totalRevenue =
        paidRegistrations?.reduce((sum, reg) => sum + (reg.payment_amount || 0), 0) || 0

      return {
        totalUsers: totalUsers || 0,
        totalEvents: totalEvents || 0,
        totalRevenue,
        activeUsers: activeUsers || 0,
        upcomingEvents: upcomingEvents || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        eventsThisMonth: eventsThisMonth || 0,
      }
    },

    pendingOrganizers: async (_: any, { pagination }: any, context: GraphQLContext) => {
      await requireAdmin(context)

      const limit = pagination?.limit || 20
      const offset = pagination?.offset || 0

      // Query for users who requested organizer status but not yet approved
      const {
        data: users,
        error,
        count,
      } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('is_organizer_approved', false)
        .not('organizer_requested_at', 'is', null)
        .order('organizer_requested_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('[pendingOrganizers] Error:', error)
        throw new GraphQLError('Failed to fetch pending organizers', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      const totalCount = count || 0
      const hasNextPage = offset + limit < totalCount
      const hasPreviousPage = offset > 0

      return {
        users: users || [],
        pageInfo: {
          hasNextPage,
          hasPreviousPage,
          startCursor: users?.[0]?.privy_id || null,
          endCursor: users?.[users.length - 1]?.privy_id || null,
        },
        totalCount,
      }
    },

    reportedContent: async (_: any, { type, status }: any, context: GraphQLContext) => {
      await requireAdmin(context)

      // This would query a reports table in production
      return []
    },

    getAllNotifications: async (
      _: any,
      { type, limit = 50, offset = 0 }: { type?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      let query = supabase
        .from('notifications')
        .select(
          `
          *,
          recipient:users!notifications_recipient_id_fkey(privy_id, username, display_name),
          sender:users!notifications_sender_id_fkey(privy_id, username, display_name)
        `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })

      if (type) {
        query = query.eq('type', type)
      }

      query = query.range(offset, offset + limit - 1)

      const { data: notifications, error, count } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        throw new GraphQLError('Failed to fetch notifications', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)

      return {
        notifications: notifications || [],
        totalCount: count || 0,
        unreadCount: unreadCount || 0,
      }
    },

    getAdminReferralStats: async (_: any, __: any, context: GraphQLContext) => {
      await requireAdmin(context)

      // Get total referrals
      const { count: totalReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })

      // Get completed referrals
      const { count: completedReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      // Get pending referrals (signed_up but not completed)
      const { count: pendingReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'signed_up')

      // Get total points awarded from referral_rewards
      const { data: rewardsData } = await supabase.from('referral_rewards').select('points_awarded')

      const totalPointsAwarded =
        rewardsData?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) || 0

      // Get top referrers
      const { data: topReferrersData } = await supabase
        .from('users')
        .select('privy_id, username, display_name, referral_count, referral_points_earned')
        .gt('referral_count', 0)
        .order('referral_count', { ascending: false })
        .limit(10)

      const topReferrers = (topReferrersData || []).map(u => ({
        user_id: u.privy_id,
        username: u.username,
        display_name: u.display_name,
        referral_count: u.referral_count || 0,
        points_earned: u.referral_points_earned || 0,
      }))

      // Get referrals this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: referralsThisMonth } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())

      // Calculate conversion rate (completed / total)
      const conversionRate =
        totalReferrals && totalReferrals > 0
          ? ((completedReferrals || 0) / totalReferrals) * 100
          : 0

      return {
        totalReferrals: totalReferrals || 0,
        completedReferrals: completedReferrals || 0,
        pendingReferrals: pendingReferrals || 0,
        totalPointsAwarded,
        topReferrers,
        referralsThisMonth: referralsThisMonth || 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
      }
    },
  },

  Mutation: {
    updateUserRole: async (
      _: any,
      { userId, role }: { userId: string; role: string },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      const { data, error } = await supabase
        .from('users')
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('privy_id', userId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update user role', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data
    },

    approveOrganizer: async (
      _: any,
      {
        userId,
        approved,
        rejection_reason,
      }: { userId: string; approved: boolean; rejection_reason?: string },
      context: GraphQLContext,
    ) => {
      const adminId = await requireAdmin(context)

      const updateData: any = {
        is_organizer_approved: approved,
        updated_at: new Date().toISOString(),
      }

      if (approved) {
        updateData.organizer_approved_by = adminId
        updateData.organizer_approved_at = new Date().toISOString()
        updateData.role = 'organizer'
      } else {
        updateData.organizer_rejection_reason = rejection_reason || 'Application not approved'
        // Notify the user about the rejection
        try {
          await supabase.from('notifications').insert({
            type: 'system',
            title: 'Organizer Application Update',
            message: `Your organizer application was not approved. ${rejection_reason ? `Reason: ${rejection_reason}` : 'Please contact support for more information.'}`,
            sender_type: 'admin',
            recipient_id: userId,
            action_type: 'open_profile',
            action_data: { user_id: userId },
          })
        } catch (notifyErr) {
          console.error('[approveOrganizer] Failed to notify user about rejection:', notifyErr)
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('privy_id', userId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update organizer status', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // Notify all users about new organizer (if approved)
      if (approved && data) {
        try {
          const { data: allUsers } = await supabase
            .from('users')
            .select('privy_id')
            .neq('privy_id', userId) // Exclude the new organizer

          if (allUsers && allUsers.length > 0) {
            const notifications = allUsers.map(u => ({
              type: 'system',
              title: 'New Event Organizer!',
              message: `${data.display_name || data.username || 'A new organizer'} just joined DANZ! Check out their upcoming events.`,
              sender_type: 'system',
              recipient_id: u.privy_id,
              action_type: 'open_profile',
              action_data: { user_id: userId },
              is_broadcast: true,
              broadcast_target: 'all_users',
            }))

            await supabase.from('notifications').insert(notifications)
            console.log(
              `[approveOrganizer] Notified ${allUsers.length} users about new organizer: ${userId}`,
            )
          }
        } catch (notifyErr) {
          console.error('[approveOrganizer] Failed to notify users:', notifyErr)
        }
      }

      return data
    },

    featureEvent: async (
      _: any,
      { eventId, featured }: { eventId: string; featured: boolean },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      const { data, error } = await supabase
        .from('events')
        .update({
          is_featured: featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .select('*, facilitator:users!facilitator_id(username, display_name)')
        .single()

      if (error) {
        throw new GraphQLError('Failed to update event featured status', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // Notify all users about featured event
      if (featured && data) {
        try {
          const { data: allUsers } = await supabase.from('users').select('privy_id')

          if (allUsers && allUsers.length > 0) {
            const notifications = allUsers.map(u => ({
              type: 'event_update',
              title: '⭐ Featured Event!',
              message: `Don't miss "${data.title}" - now featured on DANZ!`,
              sender_type: 'admin',
              recipient_id: u.privy_id,
              event_id: eventId,
              action_type: 'open_event',
              action_data: { event_id: eventId },
              is_broadcast: true,
              broadcast_target: 'all_users',
            }))

            await supabase.from('notifications').insert(notifications)
            console.log(
              `[featureEvent] Notified ${allUsers.length} users about featured event: ${eventId}`,
            )
          }
        } catch (notifyErr) {
          console.error('[featureEvent] Failed to notify users:', notifyErr)
        }
      }

      return data
    },

    adminDeleteEvent: async (_: any, { eventId }: { eventId: string }, context: GraphQLContext) => {
      await requireAdmin(context)

      // Get event details first for notification
      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .single()

      if (!event) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Delete the event
      const { error } = await supabase.from('events').delete().eq('id', eventId)

      if (error) {
        throw new GraphQLError('Failed to delete event', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        success: true,
        message: `Event "${event.title}" deleted successfully`,
      }
    },
  },
}
