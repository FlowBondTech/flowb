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

export const challengeResolvers = {
  Query: {
    dailyChallenges: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const today = new Date().toISOString().split('T')[0]

      // Get today's daily challenges
      const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('challenge_type', 'DAILY')
        .eq('is_active', true)
        .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)

      if (error) {
        throw new GraphQLError('Failed to fetch daily challenges', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      // Get user's progress on these challenges
      const challengeIds = (challenges || []).map(c => c.id)
      const { data: userProgress } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', userId)
        .in('challenge_id', challengeIds)

      const totalXP = (challenges || []).reduce((sum, c) => sum + (c.xp_reward || 0), 0)
      const totalPoints = (challenges || []).reduce((sum, c) => sum + (c.points_reward || 0), 0)

      return {
        date: today,
        challenges: challenges || [],
        user_progress: userProgress || [],
        total_xp_available: totalXP,
        total_points_available: totalPoints,
      }
    },

    weeklyChallenges: async (_: any, __: any, context: GraphQLContext) => {
      requireAuth(context)

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('challenge_type', 'WEEKLY')
        .eq('is_active', true)
        .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)

      if (error) {
        throw new GraphQLError('Failed to fetch weekly challenges', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    specialChallenges: async (_: any, __: any, context: GraphQLContext) => {
      requireAuth(context)

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .in('challenge_type', ['SPECIAL', 'EVENT'])
        .eq('is_active', true)
        .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)

      if (error) {
        throw new GraphQLError('Failed to fetch special challenges', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    availableChallenges: async (
      _: any,
      { type, category }: { type?: string; category?: string },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      let query = supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)

      if (type) {
        query = query.eq('challenge_type', type)
      }
      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) {
        throw new GraphQLError('Failed to fetch challenges', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    myActiveChallenges: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('user_challenges')
        .select('*, challenge:challenges(*)')
        .eq('user_id', userId)
        .in('status', ['IN_PROGRESS', 'AVAILABLE'])
        .order('started_at', { ascending: false })

      if (error) {
        throw new GraphQLError('Failed to fetch active challenges', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    myCompletedChallenges: async (
      _: any,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('user_challenges')
        .select('*, challenge:challenges(*)')
        .eq('user_id', userId)
        .in('status', ['COMPLETED', 'CLAIMED'])
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch completed challenges', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    myChallengeProgress: async (
      _: any,
      { challengeId }: { challengeId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single()

      if (challengeError || !challenge) {
        throw new GraphQLError('Challenge not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const { data: userChallenge } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .single()

      const currentProgress = userChallenge?.progress || 0
      const percentage = (currentProgress / challenge.target_value) * 100

      let timeRemaining = null
      if (userChallenge?.expires_at) {
        timeRemaining =
          Math.max(0, new Date(userChallenge.expires_at).getTime() - Date.now()) / 1000
      }

      return {
        challenge,
        user_challenge: userChallenge,
        current_progress: currentProgress,
        target_value: challenge.target_value,
        percentage: Math.min(100, percentage),
        time_remaining: timeRemaining ? Math.floor(timeRemaining) : null,
        is_claimable: userChallenge?.status === 'COMPLETED',
      }
    },

    myChallengeStats: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: userChallenges } = await supabase
        .from('user_challenges')
        .select('*, challenge:challenges(*)')
        .eq('user_id', userId)

      const completed = (userChallenges || []).filter(
        uc => uc.status === 'COMPLETED' || uc.status === 'CLAIMED',
      )

      const totalXP = completed.reduce((sum, uc) => sum + (uc.challenge?.xp_reward || 0), 0)
      const totalPoints = completed.reduce((sum, uc) => sum + (uc.challenge?.points_reward || 0), 0)

      // Count by difficulty
      const byDifficulty: Record<string, number> = {}
      completed.forEach(uc => {
        const diff = uc.challenge?.difficulty || 'UNKNOWN'
        byDifficulty[diff] = (byDifficulty[diff] || 0) + 1
      })

      // Find favorite category
      const categoryCount: Record<string, number> = {}
      completed.forEach(uc => {
        const cat = uc.challenge?.category || 'UNKNOWN'
        categoryCount[cat] = (categoryCount[cat] || 0) + 1
      })
      const favoriteCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0]

      // Get streak info from user
      const { data: user } = await supabase
        .from('users')
        .select('current_streak, longest_streak')
        .eq('privy_id', userId)
        .single()

      const total = (userChallenges || []).length
      const completionRate = total > 0 ? (completed.length / total) * 100 : 0

      return {
        total_completed: completed.length,
        total_xp_earned: totalXP,
        total_points_earned: totalPoints,
        current_streak: user?.current_streak || 0,
        longest_streak: user?.longest_streak || 0,
        badges_earned: [],
        favorite_category: favoriteCategory || null,
        completion_rate: completionRate,
        challenges_by_difficulty: byDifficulty,
      }
    },

    challengeLeaderboard: async (
      _: any,
      { type, period }: { type: string; period: string },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      // Get completed challenges in the period
      let fromDate = new Date()
      if (period === 'WEEKLY') {
        fromDate.setDate(fromDate.getDate() - 7)
      } else if (period === 'MONTHLY') {
        fromDate.setMonth(fromDate.getMonth() - 1)
      } else if (period === 'ALL_TIME') {
        fromDate = new Date(0)
      }

      const { data } = await supabase
        .from('user_challenges')
        .select('user_id, challenge:challenges(xp_reward, points_reward)')
        .eq('status', 'CLAIMED')
        .gte('claimed_at', fromDate.toISOString())

      // Aggregate by user
      const userStats: Record<string, { challenges: number; xp: number; points: number }> = {}
      ;(data || []).forEach((uc: any) => {
        if (!userStats[uc.user_id]) {
          userStats[uc.user_id] = { challenges: 0, xp: 0, points: 0 }
        }
        userStats[uc.user_id].challenges++
        userStats[uc.user_id].xp += uc.challenge?.xp_reward || 0
        userStats[uc.user_id].points += uc.challenge?.points_reward || 0
      })

      // Sort and rank
      const sorted = Object.entries(userStats)
        .sort((a, b) => b[1].challenges - a[1].challenges)
        .slice(0, 100)

      // Get user details
      const userIds = sorted.map(([id]) => id)
      const { data: users } = await supabase.from('users').select('*').in('privy_id', userIds)

      const userMap = new Map((users || []).map(u => [u.privy_id, u]))

      const entries = sorted.map(([userId, stats], index) => ({
        rank: index + 1,
        user: userMap.get(userId),
        challenges_completed: stats.challenges,
        xp_earned: stats.xp,
        points_earned: stats.points,
      }))

      return {
        period,
        entries,
      }
    },

    allChallenges: async (
      _: any,
      { type, isActive }: { type?: string; isActive?: boolean },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      let query = supabase.from('challenges').select('*').order('created_at', { ascending: false })

      if (type) {
        query = query.eq('challenge_type', type)
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive)
      }

      const { data, error } = await query

      if (error) {
        throw new GraphQLError('Failed to fetch challenges', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    challengeById: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context)

      const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single()

      if (error || !data) {
        throw new GraphQLError('Challenge not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return data
    },
  },

  Mutation: {
    startChallenge: async (
      _: any,
      { challengeId }: { challengeId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Check if challenge exists and is available
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('is_active', true)
        .single()

      if (challengeError || !challenge) {
        throw new GraphQLError('Challenge not found or not available', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check if already started
      const { data: existing } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .in('status', ['IN_PROGRESS', 'COMPLETED'])
        .single()

      if (existing) {
        throw new GraphQLError('Challenge already started', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      // Calculate expiry
      let expiresAt = null
      if (challenge.time_limit_hours) {
        expiresAt = new Date(Date.now() + challenge.time_limit_hours * 60 * 60 * 1000).toISOString()
      }

      const { data, error } = await supabase
        .from('user_challenges')
        .insert([
          {
            user_id: userId,
            challenge_id: challengeId,
            status: 'IN_PROGRESS',
            progress: 0,
            started_at: new Date().toISOString(),
            expires_at: expiresAt,
            completion_count: 0,
          },
        ])
        .select('*, challenge:challenges(*)')
        .single()

      if (error) {
        throw new GraphQLError('Failed to start challenge', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    updateChallengeProgress: async (
      _: any,
      { challengeId, progress }: { challengeId: string; progress: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get user challenge
      const { data: userChallenge, error: ucError } = await supabase
        .from('user_challenges')
        .select('*, challenge:challenges(*)')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .eq('status', 'IN_PROGRESS')
        .single()

      if (ucError || !userChallenge) {
        throw new GraphQLError('Active challenge not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check if completed
      const isCompleted = progress >= userChallenge.challenge.target_value
      const newStatus = isCompleted ? 'COMPLETED' : 'IN_PROGRESS'

      const { data, error } = await supabase
        .from('user_challenges')
        .update({
          progress,
          status: newStatus,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', userChallenge.id)
        .select('*, challenge:challenges(*)')
        .single()

      if (error) {
        throw new GraphQLError('Failed to update progress', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    claimChallengeReward: async (
      _: any,
      { challengeId }: { challengeId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get completed challenge
      const { data: userChallenge, error: ucError } = await supabase
        .from('user_challenges')
        .select('*, challenge:challenges(*)')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .eq('status', 'COMPLETED')
        .single()

      if (ucError || !userChallenge) {
        throw new GraphQLError('Completed challenge not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Award XP and points
      const xpReward = userChallenge.challenge.xp_reward || 0
      const pointsReward = userChallenge.challenge.points_reward || 0

      await supabase.rpc('increment_user_stats', {
        p_user_id: userId,
        p_xp: xpReward,
        p_points: pointsReward,
      })

      // Mark as claimed
      const { data, error } = await supabase
        .from('user_challenges')
        .update({
          status: 'CLAIMED',
          claimed_at: new Date().toISOString(),
          completion_count: (userChallenge.completion_count || 0) + 1,
        })
        .eq('id', userChallenge.id)
        .select('*, challenge:challenges(*)')
        .single()

      if (error) {
        throw new GraphQLError('Failed to claim reward', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    abandonChallenge: async (
      _: any,
      { challengeId }: { challengeId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { error } = await supabase
        .from('user_challenges')
        .delete()
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .eq('status', 'IN_PROGRESS')

      if (error) {
        throw new GraphQLError('Failed to abandon challenge', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return { success: true, message: 'Challenge abandoned', code: 'SUCCESS' }
    },

    createChallenge: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      await requireAdmin(context)

      const { data, error } = await supabase
        .from('challenges')
        .insert([
          {
            ...input,
            is_active: true,
          },
        ])
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create challenge', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    updateChallenge: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      const { data, error } = await supabase
        .from('challenges')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update challenge', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    deleteChallenge: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      await requireAdmin(context)

      const { error } = await supabase.from('challenges').delete().eq('id', id)

      if (error) {
        throw new GraphQLError('Failed to delete challenge', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return { success: true, message: 'Challenge deleted', code: 'SUCCESS' }
    },

    activateChallenge: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      await requireAdmin(context)

      const { data, error } = await supabase
        .from('challenges')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to activate challenge', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    deactivateChallenge: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      await requireAdmin(context)

      const { data, error } = await supabase
        .from('challenges')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to deactivate challenge', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    refreshDailyChallenges: async (_: any, __: any, context: GraphQLContext) => {
      await requireAdmin(context)
      // This would typically be called by a cron job
      // For now, just return today's challenges
      return challengeResolvers.Query.dailyChallenges(_, __, context)
    },

    processExpiredChallenges: async (_: any, __: any, context: GraphQLContext) => {
      await requireAdmin(context)

      const { error } = await supabase
        .from('user_challenges')
        .update({ status: 'EXPIRED' })
        .eq('status', 'IN_PROGRESS')
        .lt('expires_at', new Date().toISOString())

      if (error) {
        throw new GraphQLError('Failed to process expired challenges', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return { success: true, message: 'Expired challenges processed', code: 'SUCCESS' }
    },
  },

  UserChallenge: {
    challenge: async (parent: any) => {
      if (parent.challenge) return parent.challenge
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', parent.challenge_id)
        .single()
      return data
    },
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()
      return data
    },
  },
}
