import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

const requireAdmin = async (context: GraphQLContext) => {
  const userId = requireAuth(context)
  const { data: user } = await supabase
    .from('users')
    .select('is_admin')
    .eq('privy_id', userId)
    .single()

  if (!user?.is_admin) {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' },
    })
  }
  return userId
}

const ACTIVITY_ICONS: Record<string, string> = {
  USER_JOINED: '👋',
  USER_LEVEL_UP: '⬆️',
  USER_ACHIEVEMENT: '🏆',
  USER_STREAK: '🔥',
  DANCE_SESSION_COMPLETED: '💃',
  DANCE_SESSION_SHARED: '📤',
  HIGH_SCORE_ACHIEVED: '🌟',
  DANCE_MILESTONE: '🎯',
  NEW_DANCE_BOND: '🤝',
  DANCE_BOND_STRENGTHENED: '💪',
  POST_CREATED: '📝',
  POST_LIKED: '❤️',
  POST_COMMENTED: '💬',
  EVENT_CREATED: '📅',
  EVENT_JOINED: '✅',
  EVENT_CHECKIN: '📍',
  EVENT_COMPLETED: '🎉',
  CHALLENGE_STARTED: '🏁',
  CHALLENGE_COMPLETED: '🏅',
  CHALLENGE_STREAK: '🔥',
  REFERRAL_INVITED: '📧',
  REFERRAL_JOINED: '🎊',
  REFERRAL_BONUS: '🎁',
  LEADERBOARD_RANK_UP: '📈',
  SEASON_REWARD: '👑',
  SPECIAL_ANNOUNCEMENT: '📢',
}

const ACTIVITY_COLORS: Record<string, string> = {
  USER_LEVEL_UP: '#FFD700',
  USER_ACHIEVEMENT: '#9333EA',
  HIGH_SCORE_ACHIEVED: '#EC4899',
  CHALLENGE_COMPLETED: '#10B981',
  SPECIAL_ANNOUNCEMENT: '#3B82F6',
}

export const activityFeedResolvers = {
  Query: {
    activityFeed: async (
      _: any,
      { filter, limit = 20, after }: { filter?: any; limit?: number; after?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      let query = supabase
        .from('activities')
        .select('*', { count: 'exact' })
        .or(`visibility.eq.PUBLIC,and(visibility.eq.FRIENDS,user_id.eq.${userId})`)
        .order('created_at', { ascending: false })

      if (filter?.types && filter.types.length > 0) {
        query = query.in('activity_type', filter.types)
      }
      if (filter?.user_id) {
        query = query.eq('user_id', filter.user_id)
      }
      if (filter?.from_date) {
        query = query.gte('created_at', filter.from_date)
      }
      if (filter?.to_date) {
        query = query.lte('created_at', filter.to_date)
      }
      if (after) {
        query = query.lt('id', after)
      }

      const { data, count, error } = await query.limit(limit)

      if (error) {
        throw new GraphQLError('Failed to fetch activity feed', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      // Check which activities user has liked
      const activityIds = (data || []).map(a => a.id)
      const { data: likes } = await supabase
        .from('activity_likes')
        .select('activity_id')
        .eq('user_id', userId)
        .in('activity_id', activityIds)

      const likedIds = new Set((likes || []).map(l => l.activity_id))

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .or(`visibility.eq.PUBLIC,and(visibility.eq.FRIENDS,user_id.eq.${userId})`)
        .eq('is_read', false)
        .neq('user_id', userId)

      const activities = (data || []).map(a => ({
        ...a,
        icon: ACTIVITY_ICONS[a.activity_type] || '📌',
        color: ACTIVITY_COLORS[a.activity_type] || '#6366F1',
        is_liked_by_me: likedIds.has(a.id),
      }))

      return {
        activities,
        total_count: count || 0,
        has_more: (count || 0) > (data || []).length,
        last_activity_id: activities[activities.length - 1]?.id || null,
        unread_count: unreadCount || 0,
      }
    },

    globalActivityFeed: async (
      _: any,
      { limit = 20, after }: { limit?: number; after?: string },
      context: GraphQLContext,
    ) => {
      return activityFeedResolvers.Query.activityFeed(
        _,
        { filter: { visibility: 'PUBLIC' }, limit, after },
        context,
      )
    },

    friendsActivityFeed: async (
      _: any,
      { limit = 20, after }: { limit?: number; after?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get friend IDs
      const { data: bonds } = await supabase
        .from('dance_bonds')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

      const friendIds = (bonds || []).map(b => (b.user1_id === userId ? b.user2_id : b.user1_id))

      if (friendIds.length === 0) {
        return {
          activities: [],
          total_count: 0,
          has_more: false,
          last_activity_id: null,
          unread_count: 0,
        }
      }

      let query = supabase
        .from('activities')
        .select('*', { count: 'exact' })
        .in('user_id', friendIds)
        .in('visibility', ['PUBLIC', 'FRIENDS'])
        .order('created_at', { ascending: false })

      if (after) {
        query = query.lt('id', after)
      }

      const { data, count, error } = await query.limit(limit)

      if (error) {
        throw new GraphQLError('Failed to fetch friends activity', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      const activities = (data || []).map(a => ({
        ...a,
        icon: ACTIVITY_ICONS[a.activity_type] || '📌',
        color: ACTIVITY_COLORS[a.activity_type] || '#6366F1',
      }))

      return {
        activities,
        total_count: count || 0,
        has_more: (count || 0) > limit,
        last_activity_id: activities[activities.length - 1]?.id || null,
        unread_count: 0,
      }
    },

    myActivityFeed: async (
      _: any,
      { limit = 20, after }: { limit?: number; after?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      let query = supabase
        .from('activities')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (after) {
        query = query.lt('id', after)
      }

      const { data, count, error } = await query.limit(limit)

      if (error) {
        throw new GraphQLError('Failed to fetch my activity', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      const activities = (data || []).map(a => ({
        ...a,
        icon: ACTIVITY_ICONS[a.activity_type] || '📌',
        color: ACTIVITY_COLORS[a.activity_type] || '#6366F1',
      }))

      return {
        activities,
        total_count: count || 0,
        has_more: (count || 0) > limit,
        last_activity_id: activities[activities.length - 1]?.id || null,
        unread_count: 0,
      }
    },

    activity: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context)

      const { data, error } = await supabase.from('activities').select('*').eq('id', id).single()

      if (error || !data) {
        throw new GraphQLError('Activity not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return {
        ...data,
        icon: ACTIVITY_ICONS[data.activity_type] || '📌',
        color: ACTIVITY_COLORS[data.activity_type] || '#6366F1',
      }
    },

    userActivities: async (
      _: any,
      { userId: targetUserId, limit = 20 }: { userId: string; limit?: number },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('visibility', 'PUBLIC')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new GraphQLError('Failed to fetch user activities', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return (data || []).map(a => ({
        ...a,
        icon: ACTIVITY_ICONS[a.activity_type] || '📌',
        color: ACTIVITY_COLORS[a.activity_type] || '#6366F1',
      }))
    },

    activityFeedGrouped: async (
      _: any,
      { groupBy, limit = 7 }: { groupBy: string; limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .or(`visibility.eq.PUBLIC,and(visibility.eq.FRIENDS,user_id.eq.${userId})`)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw new GraphQLError('Failed to fetch activities', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      // Group by date
      const grouped: Record<string, any[]> = {}
      ;(data || []).forEach(activity => {
        const date = new Date(activity.created_at).toISOString().split('T')[0]
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push({
          ...activity,
          icon: ACTIVITY_ICONS[activity.activity_type] || '📌',
          color: ACTIVITY_COLORS[activity.activity_type] || '#6366F1',
        })
      })

      return Object.entries(grouped)
        .slice(0, limit)
        .map(([date, activities]) => ({
          date,
          activities,
          summary: `${activities.length} activities`,
        }))
    },

    trendingActivities: async (
      _: any,
      { limit = 10 }: { limit?: number },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('visibility', 'PUBLIC')
        .order('likes_count', { ascending: false })
        .limit(limit)

      if (error) {
        throw new GraphQLError('Failed to fetch trending activities', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return (data || []).map((a, index) => ({
        activity: {
          ...a,
          icon: ACTIVITY_ICONS[a.activity_type] || '📌',
          color: ACTIVITY_COLORS[a.activity_type] || '#6366F1',
        },
        engagement_score: a.likes_count + a.comments_count * 2,
        trending_rank: index + 1,
      }))
    },

    trendingNow: async (_: any, __: any, context: GraphQLContext) => {
      requireAuth(context)

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('visibility', 'PUBLIC')
        .gte('created_at', oneHourAgo)
        .order('likes_count', { ascending: false })
        .limit(5)

      if (error) {
        throw new GraphQLError('Failed to fetch trending now', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return (data || []).map(a => ({
        ...a,
        icon: ACTIVITY_ICONS[a.activity_type] || '📌',
        color: ACTIVITY_COLORS[a.activity_type] || '#6366F1',
      }))
    },

    activityStats: async (_: any, __: any, context: GraphQLContext) => {
      requireAuth(context)

      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { count: todayCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      const { count: weekCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo)

      const { count: totalCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })

      const { data: trending } = await supabase
        .from('activities')
        .select('*')
        .eq('visibility', 'PUBLIC')
        .order('likes_count', { ascending: false })
        .limit(5)

      return {
        today_activities: todayCount || 0,
        this_week_activities: weekCount || 0,
        total_activities: totalCount || 0,
        most_active_type: 'DANCE_SESSION_COMPLETED',
        engagement_rate: 0.15,
        trending_now: (trending || []).map(a => ({
          ...a,
          icon: ACTIVITY_ICONS[a.activity_type] || '📌',
          color: ACTIVITY_COLORS[a.activity_type] || '#6366F1',
        })),
      }
    },

    myActivityStats: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { count: todayCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today)

      const { count: weekCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekAgo)

      const { count: totalCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      return {
        today_activities: todayCount || 0,
        this_week_activities: weekCount || 0,
        total_activities: totalCount || 0,
        most_active_type: null,
        engagement_rate: 0,
        trending_now: [],
      }
    },

    recentActivities: async (
      _: any,
      { since, types }: { since: string; types?: string[] },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      let query = supabase
        .from('activities')
        .select('*')
        .or(`visibility.eq.PUBLIC,and(visibility.eq.FRIENDS,user_id.eq.${userId})`)
        .gte('created_at', since)
        .order('created_at', { ascending: false })

      if (types && types.length > 0) {
        query = query.in('activity_type', types)
      }

      const { data, error } = await query.limit(50)

      if (error) {
        throw new GraphQLError('Failed to fetch recent activities', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return (data || []).map(a => ({
        ...a,
        icon: ACTIVITY_ICONS[a.activity_type] || '📌',
        color: ACTIVITY_COLORS[a.activity_type] || '#6366F1',
      }))
    },
  },

  Mutation: {
    likeActivity: async (
      _: any,
      { activityId }: { activityId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Insert like
      await supabase.from('activity_likes').upsert([{ activity_id: activityId, user_id: userId }])

      // Increment counter
      await supabase.rpc('increment_activity_likes', { p_activity_id: activityId })

      const { data } = await supabase.from('activities').select('*').eq('id', activityId).single()

      return {
        ...data,
        is_liked_by_me: true,
        icon: ACTIVITY_ICONS[data?.activity_type] || '📌',
        color: ACTIVITY_COLORS[data?.activity_type] || '#6366F1',
      }
    },

    unlikeActivity: async (
      _: any,
      { activityId }: { activityId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      await supabase
        .from('activity_likes')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', userId)

      await supabase.rpc('decrement_activity_likes', { p_activity_id: activityId })

      const { data } = await supabase.from('activities').select('*').eq('id', activityId).single()

      return {
        ...data,
        is_liked_by_me: false,
        icon: ACTIVITY_ICONS[data?.activity_type] || '📌',
        color: ACTIVITY_COLORS[data?.activity_type] || '#6366F1',
      }
    },

    commentOnActivity: async (
      _: any,
      { activityId, comment }: { activityId: string; comment: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      await supabase
        .from('activity_comments')
        .insert([{ activity_id: activityId, user_id: userId, content: comment }])

      await supabase.rpc('increment_activity_comments', { p_activity_id: activityId })

      const { data } = await supabase.from('activities').select('*').eq('id', activityId).single()

      return {
        ...data,
        icon: ACTIVITY_ICONS[data?.activity_type] || '📌',
        color: ACTIVITY_COLORS[data?.activity_type] || '#6366F1',
      }
    },

    hideActivity: async (
      _: any,
      { activityId }: { activityId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      await supabase
        .from('hidden_activities')
        .insert([{ activity_id: activityId, user_id: userId }])

      return { success: true, message: 'Activity hidden', code: 'SUCCESS' }
    },

    reportActivity: async (
      _: any,
      { activityId, reason }: { activityId: string; reason: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      await supabase
        .from('activity_reports')
        .insert([{ activity_id: activityId, reported_by: userId, reason }])

      return { success: true, message: 'Activity reported', code: 'SUCCESS' }
    },

    createActivity: async (
      _: any,
      args: {
        type: string
        userId: string
        targetUserId?: string
        title: string
        description?: string
        metadata?: any
        visibility?: string
      },
      context: GraphQLContext,
    ) => {
      // This is typically called internally
      const { data, error } = await supabase
        .from('activities')
        .insert([
          {
            activity_type: args.type,
            user_id: args.userId,
            target_user_id: args.targetUserId,
            title: args.title,
            description: args.description,
            metadata: args.metadata,
            visibility: args.visibility || 'PUBLIC',
            likes_count: 0,
            comments_count: 0,
            is_highlighted: false,
          },
        ])
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create activity', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return {
        ...data,
        icon: ACTIVITY_ICONS[data.activity_type] || '📌',
        color: ACTIVITY_COLORS[data.activity_type] || '#6366F1',
      }
    },

    markActivitiesRead: async (
      _: any,
      { activityIds }: { activityIds: string[] },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      await supabase.from('activities').update({ is_read: true }).in('id', activityIds)

      return { success: true, message: 'Activities marked as read', code: 'SUCCESS' }
    },

    markAllActivitiesRead: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      await supabase.from('activities').update({ is_read: true }).neq('user_id', userId)

      return { success: true, message: 'All activities marked as read', code: 'SUCCESS' }
    },

    highlightActivity: async (
      _: any,
      { activityId }: { activityId: string },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      const { data, error } = await supabase
        .from('activities')
        .update({ is_highlighted: true })
        .eq('id', activityId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to highlight activity', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return {
        ...data,
        icon: ACTIVITY_ICONS[data.activity_type] || '📌',
        color: ACTIVITY_COLORS[data.activity_type] || '#6366F1',
      }
    },

    deleteActivity: async (
      _: any,
      { activityId }: { activityId: string },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      const { error } = await supabase.from('activities').delete().eq('id', activityId)

      if (error) {
        throw new GraphQLError('Failed to delete activity', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return { success: true, message: 'Activity deleted', code: 'SUCCESS' }
    },

    createAnnouncement: async (
      _: any,
      { title, description, metadata }: { title: string; description: string; metadata?: any },
      context: GraphQLContext,
    ) => {
      const userId = await requireAdmin(context)

      const { data, error } = await supabase
        .from('activities')
        .insert([
          {
            activity_type: 'SPECIAL_ANNOUNCEMENT',
            user_id: userId,
            title,
            description,
            metadata,
            visibility: 'PUBLIC',
            likes_count: 0,
            comments_count: 0,
            is_highlighted: true,
          },
        ])
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create announcement', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return {
        ...data,
        icon: ACTIVITY_ICONS[data.activity_type] || '📢',
        color: ACTIVITY_COLORS[data.activity_type] || '#3B82F6',
      }
    },
  },

  Activity: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()
      return data
    },
    target_user: async (parent: any) => {
      if (!parent.target_user_id) return null
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.target_user_id)
        .single()
      return data
    },
  },
}
