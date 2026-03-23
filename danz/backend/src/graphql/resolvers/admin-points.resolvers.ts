import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

// ========================================
// HELPER FUNCTIONS
// ========================================

const requireAdmin = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

const checkAdminRole = async (userId: string) => {
  const { data: user } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (!user?.is_admin) {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}

// ========================================
// RESOLVERS
// ========================================

export const adminPointsResolvers = {
  Query: {
    // ========================================
    // POINT ACTIONS
    // ========================================

    getAllPointActions: async (
      _: any,
      args: { category?: string; is_active?: boolean },
      context: GraphQLContext,
    ) => {
      const { category, is_active } = args

      let query = supabase
        .from('admin_points_overview')
        .select('*')
        .order('category', { ascending: true })
        .order('action_name', { ascending: true })

      if (category) {
        query = query.eq('category', category)
      }

      if (typeof is_active !== 'undefined') {
        query = query.eq('is_active', is_active)
      }

      const { data, error } = await query

      if (error) {
        throw new GraphQLError(`Failed to fetch point actions: ${error.message}`)
      }

      return data || []
    },

    getPointAction: async (_: any, args: { action_key: string }) => {
      const { data, error } = await supabase
        .from('admin_points_overview')
        .select('*')
        .eq('action_key', args.action_key)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError(`Failed to fetch point action: ${error.message}`)
      }

      return data
    },

    // ========================================
    // TRANSACTIONS
    // ========================================

    getUserTransactions: async (
      _: any,
      args: {
        user_id: string
        limit?: number
        offset?: number
        status?: string
      },
      context: GraphQLContext,
    ) => {
      const userId = requireAdmin(context)
      const { user_id, limit = 50, offset = 0, status } = args

      // Users can view their own, admins can view anyone's
      if (userId !== user_id) {
        await checkAdminRole(userId)
      }

      // Query point_transactions for this user
      let ptQuery = supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

      if (status) {
        ptQuery = ptQuery.eq('status', status)
      }

      const { data: ptData, error: ptError } = await ptQuery

      if (ptError) {
        throw new GraphQLError(`Failed to fetch transactions: ${ptError.message}`)
      }

      // Also query referral_rewards for this user
      let referralTransactions: any[] = []
      const { data: rrData, error: rrError } = await supabase
        .from('referral_rewards')
        .select(`
          id,
          referral_id,
          user_id,
          points_awarded,
          awarded_at
        `)
        .eq('user_id', user_id)
        .order('awarded_at', { ascending: false })

      if (!rrError && rrData) {
        // Map referral_rewards to PointTransaction format
        referralTransactions = rrData.map(rr => ({
          id: rr.id,
          user_id: rr.user_id,
          action_key: 'referral_complete',
          points_amount: rr.points_awarded,
          transaction_type: 'earn',
          reference_id: rr.referral_id,
          reference_type: 'referral',
          metadata: {},
          admin_user_id: null,
          admin_note: null,
          status: 'completed',
          created_at: rr.awarded_at,
        }))
      }

      // Combine and sort by created_at descending
      const allTransactions = [...(ptData || []), ...referralTransactions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      // Apply pagination
      const total_count = allTransactions.length
      const paginatedTransactions = allTransactions.slice(offset, offset + limit)

      return {
        transactions: paginatedTransactions,
        total_count,
        has_more: total_count > offset + limit,
      }
    },

    getAllTransactions: async (
      _: any,
      args: {
        limit?: number
        offset?: number
        action_key?: string
        status?: string
        start_date?: string
        end_date?: string
      },
      context: GraphQLContext,
    ) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { limit = 100, offset = 0, action_key, status, start_date, end_date } = args

      // Query point_transactions
      let ptQuery = supabase
        .from('point_transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (action_key) {
        ptQuery = ptQuery.eq('action_key', action_key)
      }

      if (status) {
        ptQuery = ptQuery.eq('status', status)
      }

      if (start_date) {
        ptQuery = ptQuery.gte('created_at', start_date)
      }

      if (end_date) {
        ptQuery = ptQuery.lte('created_at', end_date)
      }

      const { data: ptData, error: ptError } = await ptQuery

      if (ptError) {
        throw new GraphQLError(`Failed to fetch point transactions: ${ptError.message}`)
      }

      // Also query referral_rewards (these are point transactions too)
      // Only include if no action_key filter OR action_key is 'referral_complete'
      let referralTransactions: any[] = []
      if (!action_key || action_key === 'referral_complete') {
        let rrQuery = supabase
          .from('referral_rewards')
          .select(`
            id,
            referral_id,
            user_id,
            points_awarded,
            awarded_at
          `)
          .order('awarded_at', { ascending: false })

        if (start_date) {
          rrQuery = rrQuery.gte('awarded_at', start_date)
        }

        if (end_date) {
          rrQuery = rrQuery.lte('awarded_at', end_date)
        }

        const { data: rrData, error: rrError } = await rrQuery

        if (!rrError && rrData) {
          // Map referral_rewards to PointTransaction format
          referralTransactions = rrData.map(rr => ({
            id: rr.id,
            user_id: rr.user_id,
            action_key: 'referral_complete',
            points_amount: rr.points_awarded,
            transaction_type: 'earn',
            reference_id: rr.referral_id,
            reference_type: 'referral',
            metadata: {},
            admin_user_id: null,
            admin_note: null,
            status: 'completed',
            created_at: rr.awarded_at,
          }))
        }
      }

      // Combine and sort by created_at descending
      const allTransactions = [...(ptData || []), ...referralTransactions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      // Apply pagination
      const total_count = allTransactions.length
      const paginatedTransactions = allTransactions.slice(offset, offset + limit)

      return {
        transactions: paginatedTransactions,
        total_count,
        has_more: total_count > offset + limit,
      }
    },

    // ========================================
    // DAILY ACTIVITY
    // ========================================

    getUserDailyActivity: async (
      _: any,
      args: { user_id: string; start_date: string; end_date: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAdmin(context)
      const { user_id, start_date, end_date } = args

      // Users can view their own, admins can view anyone's
      if (userId !== user_id) {
        await checkAdminRole(userId)
      }

      const { data, error } = await supabase
        .from('daily_activity_tracking')
        .select('*')
        .eq('user_id', user_id)
        .gte('activity_date', start_date)
        .lte('activity_date', end_date)
        .order('activity_date', { ascending: false })

      if (error) {
        throw new GraphQLError(`Failed to fetch daily activity: ${error.message}`)
      }

      return data || []
    },

    // ========================================
    // EVENT ATTENDANCE
    // ========================================

    getEventAttendance: async (_: any, args: { event_id: string }, context: GraphQLContext) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { data, error } = await supabase
        .from('event_attendance')
        .select('*')
        .eq('event_id', args.event_id)
        .order('checked_in_at', { ascending: false })

      if (error) {
        throw new GraphQLError(`Failed to fetch event attendance: ${error.message}`)
      }

      return data || []
    },

    getUserEventAttendance: async (_: any, args: { user_id: string }, context: GraphQLContext) => {
      const userId = requireAdmin(context)

      // Users can view their own, admins can view anyone's
      if (userId !== args.user_id) {
        await checkAdminRole(userId)
      }

      const { data, error } = await supabase
        .from('event_attendance')
        .select('*')
        .eq('user_id', args.user_id)
        .order('checked_in_at', { ascending: false })

      if (error) {
        throw new GraphQLError(`Failed to fetch user event attendance: ${error.message}`)
      }

      return data || []
    },

    // ========================================
    // ANALYTICS (ADMIN ONLY)
    // ========================================

    getPointsOverview: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      // Get total points issued from point_transactions
      const { data: totalData } = await supabase
        .from('point_transactions')
        .select('points_amount')
        .eq('status', 'completed')
        .eq('transaction_type', 'earn')

      const ptPointsIssued = totalData?.reduce((sum, t) => sum + t.points_amount, 0) || 0

      // Also get referral rewards (these are points too!)
      const { data: referralData } = await supabase
        .from('referral_rewards')
        .select('points_awarded')

      const referralPointsIssued =
        referralData?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) || 0

      const total_points_issued = ptPointsIssued + referralPointsIssued

      // Get total points spent
      const { data: spentData } = await supabase
        .from('point_transactions')
        .select('points_amount')
        .eq('status', 'completed')
        .eq('transaction_type', 'spend')

      const total_points_spent =
        spentData?.reduce((sum, t) => sum + Math.abs(t.points_amount), 0) || 0

      // Get active users count
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('current_points_balance', 0)

      // Get top earning action
      const { data: topAction } = await supabase
        .from('admin_points_overview')
        .select('*')
        .order('total_points_awarded', { ascending: false })
        .limit(1)
        .single()

      // Get points issued today (from both sources)
      const today = new Date().toISOString().split('T')[0]
      const { data: todayData } = await supabase
        .from('point_transactions')
        .select('points_amount')
        .eq('status', 'completed')
        .gte('created_at', today)

      const { data: todayReferralData } = await supabase
        .from('referral_rewards')
        .select('points_awarded')
        .gte('awarded_at', today)

      const points_issued_today =
        (todayData?.reduce((sum, t) => sum + t.points_amount, 0) || 0) +
        (todayReferralData?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) || 0)

      // Get points issued this week (from both sources)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: weekData } = await supabase
        .from('point_transactions')
        .select('points_amount')
        .eq('status', 'completed')
        .gte('created_at', weekAgo)

      const { data: weekReferralData } = await supabase
        .from('referral_rewards')
        .select('points_awarded')
        .gte('awarded_at', weekAgo)

      const points_issued_this_week =
        (weekData?.reduce((sum, t) => sum + t.points_amount, 0) || 0) +
        (weekReferralData?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) || 0)

      // Get points issued this month (from both sources)
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: monthData } = await supabase
        .from('point_transactions')
        .select('points_amount')
        .eq('status', 'completed')
        .gte('created_at', monthAgo)

      const { data: monthReferralData } = await supabase
        .from('referral_rewards')
        .select('points_awarded')
        .gte('awarded_at', monthAgo)

      const points_issued_this_month =
        (monthData?.reduce((sum, t) => sum + t.points_amount, 0) || 0) +
        (monthReferralData?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) || 0)

      return {
        total_points_issued,
        total_points_spent,
        total_active_users: activeUsers || 0,
        avg_points_per_user: activeUsers ? total_points_issued / activeUsers : 0,
        top_earning_action: topAction,
        points_issued_today,
        points_issued_this_week,
        points_issued_this_month,
      }
    },

    getUserPointsSummaries: async (
      _: any,
      args: {
        limit?: number
        offset?: number
        sort_by?: string
        sort_order?: string
      },
      context: GraphQLContext,
    ) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { limit = 50, offset = 0, sort_by = 'total_points_earned', sort_order = 'DESC' } = args

      const { data, error } = await supabase
        .from('admin_user_points_summary')
        .select('*')
        .order(sort_by, { ascending: sort_order === 'ASC' })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError(`Failed to fetch user summaries: ${error.message}`)
      }

      return data || []
    },

    getEventAttendanceSummaries: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { data, error } = await supabase
        .from('event_attendance_summary')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) {
        throw new GraphQLError(`Failed to fetch event summaries: ${error.message}`)
      }

      return data || []
    },
  },

  Mutation: {
    // ========================================
    // POINT ACTIONS MANAGEMENT
    // ========================================

    createPointAction: async (_: any, args: { input: any }, context: GraphQLContext) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { data, error } = await supabase
        .from('point_actions')
        .insert(args.input)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to create point action: ${error.message}`)
      }

      return data
    },

    updatePointAction: async (_: any, args: { input: any }, context: GraphQLContext) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { action_key, ...updates } = args.input

      const { data, error } = await supabase
        .from('point_actions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('action_key', action_key)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to update point action: ${error.message}`)
      }

      return data
    },

    deletePointAction: async (_: any, args: { action_key: string }, context: GraphQLContext) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { error } = await supabase
        .from('point_actions')
        .delete()
        .eq('action_key', args.action_key)

      if (error) {
        throw new GraphQLError(`Failed to delete point action: ${error.message}`)
      }

      return {
        success: true,
        message: 'Point action deleted successfully',
      }
    },

    togglePointAction: async (_: any, args: { action_key: string }, context: GraphQLContext) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      // Get current state
      const { data: current } = await supabase
        .from('point_actions')
        .select('is_active')
        .eq('action_key', args.action_key)
        .single()

      if (!current) {
        throw new GraphQLError('Point action not found')
      }

      // Toggle
      const { data, error } = await supabase
        .from('point_actions')
        .update({
          is_active: !current.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('action_key', args.action_key)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to toggle point action: ${error.message}`)
      }

      return data
    },

    // ========================================
    // AWARD POINTS
    // ========================================

    awardPoints: async (_: any, args: { input: any }, context: GraphQLContext) => {
      // Require admin authentication
      const adminId = requireAdmin(context)
      await checkAdminRole(adminId)

      const { user_id, action_key, reference_id, reference_type, metadata } = args.input

      // Call database function
      const { data, error } = await supabase.rpc('award_points', {
        p_user_id: user_id,
        p_action_key: action_key,
        p_reference_id: reference_id || null,
        p_reference_type: reference_type || null,
        p_metadata: metadata || {},
      })

      if (error) {
        throw new GraphQLError(`Failed to award points: ${error.message}`)
      }

      // Get the created transaction
      const { data: transaction } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('id', data)
        .single()

      return transaction
    },

    awardManualPoints: async (_: any, args: { input: any }, context: GraphQLContext) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { user_id, points_amount, transaction_type, admin_note, metadata } = args.input

      // Map transaction types to appropriate action keys
      const actionKeyMap: Record<string, string> = {
        bonus: 'admin_bonus',
        penalty: 'admin_penalty',
        adjustment: 'admin_adjustment',
        refund: 'admin_refund',
      }
      const action_key = actionKeyMap[transaction_type] || 'admin_adjustment'

      const { data, error } = await supabase
        .from('point_transactions')
        .insert({
          user_id,
          action_key,
          points_amount,
          transaction_type,
          admin_user_id: userId,
          admin_note,
          metadata: metadata || {},
          status: 'completed',
          reference_type: 'admin',
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to award manual points: ${error.message}`)
      }

      return data
    },

    verifyPointTransaction: async (
      _: any,
      args: { transaction_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { data, error } = await supabase
        .from('point_transactions')
        .update({ status: 'completed' })
        .eq('id', args.transaction_id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to verify transaction: ${error.message}`)
      }

      return data
    },

    reversePointTransaction: async (
      _: any,
      args: { transaction_id: string; reason: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      // Get original transaction
      const { data: original } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('id', args.transaction_id)
        .single()

      if (!original) {
        throw new GraphQLError('Transaction not found')
      }

      // Mark original as reversed
      await supabase
        .from('point_transactions')
        .update({ status: 'reversed' })
        .eq('id', args.transaction_id)

      // Create reversal transaction
      const { data, error } = await supabase
        .from('point_transactions')
        .insert({
          user_id: original.user_id,
          action_key: original.action_key,
          points_amount: -original.points_amount,
          transaction_type: 'refund',
          reference_id: original.id,
          reference_type: 'admin',
          admin_user_id: userId,
          admin_note: `Reversal: ${args.reason}`,
          status: 'completed',
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to reverse transaction: ${error.message}`)
      }

      return data
    },

    // ========================================
    // EVENT ATTENDANCE
    // ========================================

    checkInEvent: async (_: any, args: { input: any }, context: GraphQLContext) => {
      const { event_id, user_id } = args.input

      const { data, error } = await supabase
        .from('event_attendance')
        .insert({
          event_id,
          user_id,
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to check in: ${error.message}`)
      }

      // Award check-in points
      try {
        await supabase.rpc('award_points', {
          p_user_id: user_id,
          p_action_key: 'event_attend_checkin',
          p_reference_id: data.id,
          p_reference_type: 'event',
          p_metadata: { event_id },
        })
      } catch (e) {
        // Points already awarded or not configured
      }

      return data
    },

    checkOutEvent: async (_: any, args: { input: any }, context: GraphQLContext) => {
      const { attendance_id } = args.input

      // Get attendance record
      const { data: attendance } = await supabase
        .from('event_attendance')
        .select('*')
        .eq('id', attendance_id)
        .single()

      if (!attendance) {
        throw new GraphQLError('Attendance record not found')
      }

      const now = new Date()
      const checkedInAt = new Date(attendance.checked_in_at)
      const durationMinutes = Math.floor((now.getTime() - checkedInAt.getTime()) / (1000 * 60))

      const { data, error } = await supabase
        .from('event_attendance')
        .update({
          checked_out: true,
          checked_out_at: now.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', attendance_id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to check out: ${error.message}`)
      }

      // Award duration-based points
      const user_id = attendance.user_id
      const event_id = attendance.event_id

      if (durationMinutes >= 60) {
        await supabase.rpc('award_points', {
          p_user_id: user_id,
          p_action_key: 'event_attend_60min',
          p_reference_id: attendance_id,
          p_reference_type: 'event',
          p_metadata: { event_id, duration_minutes: durationMinutes },
        })
      } else if (durationMinutes >= 30) {
        await supabase.rpc('award_points', {
          p_user_id: user_id,
          p_action_key: 'event_attend_30min',
          p_reference_id: attendance_id,
          p_reference_type: 'event',
          p_metadata: { event_id, duration_minutes: durationMinutes },
        })
      }

      return data
    },

    verifyEventAttendance: async (_: any, args: { input: any }, context: GraphQLContext) => {
      const userId = requireAdmin(context)
      await checkAdminRole(userId)

      const { attendance_id, points_awarded } = args.input

      const { data, error } = await supabase
        .from('event_attendance')
        .update({
          attendance_verified: true,
          verified_by: userId,
          verified_at: new Date().toISOString(),
          points_earned: points_awarded,
        })
        .eq('id', attendance_id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to verify attendance: ${error.message}`)
      }

      return data
    },

    // ========================================
    // DAILY ACTIVITY
    // ========================================

    trackAppOpen: async (_: any, args: { user_id: string }, context: GraphQLContext) => {
      const { user_id } = args

      // Track app open
      await supabase.rpc('track_daily_activity', {
        p_user_id: user_id,
        p_activity_type: 'app_open',
      })

      // Award points for first open of the day
      try {
        await supabase.rpc('award_points', {
          p_user_id: user_id,
          p_action_key: 'daily_app_open',
          p_reference_type: 'activity',
          p_metadata: {},
        })
      } catch (e) {
        // Already awarded today
      }

      // Get today's activity
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('daily_activity_tracking')
        .select('*')
        .eq('user_id', user_id)
        .eq('activity_date', today)
        .single()

      return data
    },
  },

  // ========================================
  // TYPE RESOLVERS
  // ========================================

  PointTransaction: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single()
      return data
    },

    action: async (parent: any) => {
      const { data } = await supabase
        .from('point_actions')
        .select('*')
        .eq('action_key', parent.action_key)
        .single()
      return data
    },

    admin_user: async (parent: any) => {
      if (!parent.admin_user_id) return null
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.admin_user_id)
        .single()
      return data
    },
  },

  DailyActivity: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single()
      return data
    },
  },

  EventAttendance: {
    event: async (parent: any) => {
      const { data } = await supabase.from('events').select('*').eq('id', parent.event_id).single()
      return data
    },

    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single()
      return data
    },

    verifier: async (parent: any) => {
      if (!parent.verified_by) return null
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.verified_by)
        .single()
      return data
    },
  },
}
