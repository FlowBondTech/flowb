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

const getDateRange = (type: string) => {
  const now = new Date()
  let from = new Date()

  switch (type) {
    case 'WEEKLY':
      from.setDate(now.getDate() - 7)
      break
    case 'MONTHLY':
      from.setMonth(now.getMonth() - 1)
      break
    case 'ALL_TIME':
      from = new Date(0)
      break
    default:
      from.setDate(now.getDate() - 7)
  }

  return { from, to: now }
}

const buildLeaderboard = async (
  metric: string,
  type: string,
  limit: number,
  offset: number,
  userId?: string,
  filters?: { country?: string; city?: string; friendIds?: string[] },
) => {
  // Build the query based on metric
  let orderBy = 'xp'
  switch (metric) {
    case 'XP':
      orderBy = 'xp'
      break
    case 'POINTS':
      orderBy = 'total_points'
      break
    case 'DANCE_TIME':
      orderBy = 'total_dance_minutes'
      break
    case 'MOVEMENT_SCORE':
      orderBy = 'best_score'
      break
    case 'STREAK':
      orderBy = 'longest_streak'
      break
    case 'EVENTS_ATTENDED':
      orderBy = 'events_attended'
      break
    default:
      orderBy = 'xp'
  }

  let query = supabase
    .from('users')
    .select(
      'id, username, display_name, avatar_url, level, xp, total_points, total_dance_minutes, best_score, longest_streak, events_attended, country, city',
      { count: 'exact' },
    )
    .order(orderBy, { ascending: false })

  if (filters?.country) {
    query = query.eq('country', filters.country)
  }
  if (filters?.city) {
    query = query.eq('city', filters.city)
  }
  if (filters?.friendIds && filters.friendIds.length > 0) {
    query = query.in('id', filters.friendIds)
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    throw new GraphQLError('Failed to fetch leaderboard', {
      extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
    })
  }

  // Find current user's position
  let currentUserEntry = null
  const nearbyEntries: any[] = []

  if (userId) {
    // Get all users sorted for ranking
    const { data: allUsers } = await supabase
      .from('users')
      .select('id')
      .order(orderBy, { ascending: false })

    const userRank = (allUsers || []).findIndex(u => u.id === userId) + 1

    if (userRank > 0) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (currentUser) {
        currentUserEntry = {
          rank: userRank,
          previous_rank: null,
          rank_change: null,
          user_id: currentUser.id,
          username: currentUser.username || 'Anonymous',
          display_name: currentUser.display_name,
          avatar_url: currentUser.avatar_url,
          level: currentUser.level || 1,
          value: currentUser[orderBy] || 0,
          is_current_user: true,
          badges: [],
          country: currentUser.country,
          city: currentUser.city,
        }
      }

      // Get nearby entries (2 above and 2 below)
      const nearbyRanks = [userRank - 2, userRank - 1, userRank + 1, userRank + 2].filter(
        r => r > 0 && r <= (allUsers?.length || 0),
      )

      for (const rank of nearbyRanks) {
        const nearbyUserId = allUsers?.[rank - 1]?.id
        if (nearbyUserId) {
          const { data: nearbyUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', nearbyUserId)
            .single()

          if (nearbyUser) {
            nearbyEntries.push({
              rank,
              user_id: nearbyUser.id,
              username: nearbyUser.username || 'Anonymous',
              display_name: nearbyUser.display_name,
              avatar_url: nearbyUser.avatar_url,
              level: nearbyUser.level || 1,
              value: nearbyUser[orderBy] || 0,
              is_current_user: false,
            })
          }
        }
      }
    }
  }

  const entries = (data || []).map((user, index) => ({
    rank: offset + index + 1,
    previous_rank: null,
    rank_change: null,
    user_id: user.id,
    username: user.username || 'Anonymous',
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    level: user.level || 1,
    value: (user as any)[orderBy] || 0,
    is_current_user: user.id === userId,
    badges: [],
    country: user.country,
    city: user.city,
  }))

  return {
    type,
    metric,
    period: type,
    updated_at: new Date().toISOString(),
    total_participants: count || 0,
    entries,
    current_user_entry: currentUserEntry,
    nearby_entries: nearbyEntries,
  }
}

export const leaderboardResolvers = {
  Query: {
    leaderboard: async (
      _: any,
      {
        type,
        metric,
        limit = 100,
        offset = 0,
      }: { type: string; metric: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      return buildLeaderboard(metric, type, limit, offset, userId)
    },

    globalLeaderboard: async (
      _: any,
      { metric, limit = 100 }: { metric: string; limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      return buildLeaderboard(metric, 'GLOBAL', limit, 0, userId)
    },

    weeklyLeaderboard: async (
      _: any,
      { metric, limit = 100 }: { metric: string; limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      return buildLeaderboard(metric, 'WEEKLY', limit, 0, userId)
    },

    monthlyLeaderboard: async (
      _: any,
      { metric, limit = 100 }: { metric: string; limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      return buildLeaderboard(metric, 'MONTHLY', limit, 0, userId)
    },

    friendsLeaderboard: async (
      _: any,
      { metric, limit = 100 }: { metric: string; limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get user's friends
      const { data: bonds } = await supabase
        .from('dance_bonds')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

      const friendIds = (bonds || []).map(b => (b.user1_id === userId ? b.user2_id : b.user1_id))
      friendIds.push(userId) // Include self

      return buildLeaderboard(metric, 'FRIENDS', limit, 0, userId, { friendIds })
    },

    regionalLeaderboard: async (
      _: any,
      {
        metric,
        country,
        city,
        limit = 100,
      }: { metric: string; country?: string; city?: string; limit?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const leaderboard = await buildLeaderboard(metric, 'REGIONAL', limit, 0, userId, {
        country,
        city,
      })

      return {
        region: city || country || 'Global',
        country,
        city,
        leaderboard,
      }
    },

    eventLeaderboard: async (
      _: any,
      { eventId, limit = 100 }: { eventId: string; limit?: number },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      // Get event details
      const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single()

      if (!event) {
        throw new GraphQLError('Event not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Get registrations with user data
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('user_id, xp_earned')
        .eq('event_id', eventId)
        .order('xp_earned', { ascending: false })
        .limit(limit)

      const userIds = (registrations || []).map(r => r.user_id)
      const { data: users } = await supabase.from('users').select('*').in('id', userIds)

      const userMap = new Map((users || []).map(u => [u.id, u]))

      const entries = (registrations || []).map((reg, index) => {
        const user = userMap.get(reg.user_id)
        return {
          rank: index + 1,
          user_id: reg.user_id,
          username: user?.username || 'Anonymous',
          display_name: user?.display_name,
          avatar_url: user?.avatar_url,
          level: user?.level || 1,
          value: reg.xp_earned || 0,
          is_current_user: false,
        }
      })

      return {
        event_id: eventId,
        event_name: event.title,
        leaderboard: {
          type: 'EVENT',
          metric: 'XP',
          period: 'EVENT',
          updated_at: new Date().toISOString(),
          total_participants: entries.length,
          entries,
        },
        prizes: [],
      }
    },

    currentSeasonLeaderboard: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // For now, return a simple season leaderboard
      const leaderboard = await buildLeaderboard('XP', 'MONTHLY', 100, 0, userId)

      return {
        season_id: 'season-1',
        season_name: 'Season 1',
        starts_at: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        ends_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
        current_rewards: [
          {
            tier: 'Gold',
            min_rank: 1,
            max_rank: 10,
            rewards: { xp_bonus: 1000, badge: 'gold_champion' },
          },
          {
            tier: 'Silver',
            min_rank: 11,
            max_rank: 50,
            rewards: { xp_bonus: 500, badge: 'silver_champion' },
          },
          {
            tier: 'Bronze',
            min_rank: 51,
            max_rank: 100,
            rewards: { xp_bonus: 250, badge: 'bronze_champion' },
          },
        ],
        leaderboard,
      }
    },

    seasonLeaderboard: async (
      _: any,
      { seasonId }: { seasonId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      const leaderboard = await buildLeaderboard('XP', 'MONTHLY', 100, 0, userId)

      return {
        season_id: seasonId,
        season_name: `Season ${seasonId}`,
        starts_at: new Date().toISOString(),
        ends_at: new Date().toISOString(),
        current_rewards: [],
        leaderboard,
      }
    },

    myLeaderboardSummary: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get user's ranks
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, xp')
        .order('xp', { ascending: false })

      const globalRank = (allUsers || []).findIndex(u => u.id === userId) + 1
      const totalUsers = (allUsers || []).length

      const percentile = totalUsers > 0 ? ((totalUsers - globalRank) / totalUsers) * 100 : 0

      return {
        global_rank: globalRank || null,
        regional_rank: null,
        friends_rank: null,
        weekly_change: null,
        monthly_change: null,
        top_metric: 'XP',
        top_metric_rank: globalRank,
        percentile,
      }
    },

    myLeaderboardHistory: async (
      _: any,
      { metric, days = 30 }: { metric: string; days?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // For now, return placeholder data
      // In production, this would query a rank_history table
      const dates: string[] = []
      const ranks: number[] = []
      const values: number[] = []

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toISOString().split('T')[0])
        ranks.push(Math.floor(Math.random() * 100) + 1)
        values.push(Math.floor(Math.random() * 10000))
      }

      return { dates, ranks, values }
    },

    nearbyUsers: async (
      _: any,
      { metric, range = 5 }: { metric: string; range?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const orderBy = metric === 'XP' ? 'xp' : metric === 'POINTS' ? 'total_points' : 'xp'

      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order(orderBy, { ascending: false })

      const userIndex = (allUsers || []).findIndex(u => u.id === userId)
      if (userIndex === -1) return []

      const start = Math.max(0, userIndex - range)
      const end = Math.min((allUsers || []).length, userIndex + range + 1)

      return (allUsers || []).slice(start, end).map((user, index) => ({
        rank: start + index + 1,
        user_id: user.id,
        username: user.username || 'Anonymous',
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        level: user.level || 1,
        value: (user as any)[orderBy] || 0,
        is_current_user: user.id === userId,
      }))
    },

    topPerformers: async (
      _: any,
      { metric, period, limit = 10 }: { metric: string; period: string; limit?: number },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      const orderBy = metric === 'XP' ? 'xp' : metric === 'POINTS' ? 'total_points' : 'xp'

      const { data } = await supabase
        .from('users')
        .select('*')
        .order(orderBy, { ascending: false })
        .limit(limit)

      return (data || []).map((user, index) => ({
        rank: index + 1,
        user_id: user.id,
        username: user.username || 'Anonymous',
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        level: user.level || 1,
        value: (user as any)[orderBy] || 0,
        is_current_user: false,
      }))
    },
  },

  Mutation: {
    refreshLeaderboard: async (
      _: any,
      { type, metric }: { type: string; metric: string },
      context: GraphQLContext,
    ) => {
      // Admin only in production
      return buildLeaderboard(metric, type, 100, 0)
    },

    refreshAllLeaderboards: async (_: any, __: any, context: GraphQLContext) => {
      requireAuth(context)
      return { success: true, message: 'Leaderboards refreshed', code: 'SUCCESS' }
    },

    createSeason: async (
      _: any,
      {
        name,
        startsAt,
        endsAt,
        rewards,
      }: { name: string; startsAt: string; endsAt: string; rewards: any },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      // In production, this would create a season record
      return {
        season_id: `season-${Date.now()}`,
        season_name: name,
        starts_at: startsAt,
        ends_at: endsAt,
        current_rewards: rewards,
        leaderboard: await buildLeaderboard('XP', 'GLOBAL', 100, 0),
      }
    },

    endSeason: async (_: any, { seasonId }: { seasonId: string }, context: GraphQLContext) => {
      requireAuth(context)
      return { success: true, message: `Season ${seasonId} ended`, code: 'SUCCESS' }
    },

    createEventLeaderboard: async (
      _: any,
      { eventId, prizes }: { eventId: string; prizes?: any },
      context: GraphQLContext,
    ) => {
      requireAuth(context)
      return leaderboardResolvers.Query.eventLeaderboard(_, { eventId }, context)
    },

    finalizeEventLeaderboard: async (
      _: any,
      { eventId }: { eventId: string },
      context: GraphQLContext,
    ) => {
      requireAuth(context)
      return leaderboardResolvers.Query.eventLeaderboard(_, { eventId }, context)
    },
  },
}
