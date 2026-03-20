import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'
import { checkAndUnlockAchievements } from './achievement.resolvers.js'

const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

interface CreateFreestyleSessionInput {
  duration_seconds: number
  movement_score: number
  music_source?: 'licensed' | 'user_library' | 'none'
  motion_data?: any
  completed?: boolean
}

interface UpdateUserPreferencesInput {
  daily_reminder_enabled?: boolean
  daily_reminder_time?: string
  live_sessions_enabled?: boolean
}

// Calculate points based on duration and movement quality
const calculatePoints = (durationSeconds: number, movementScore: number): number => {
  // Minimum 10 seconds to earn points
  if (durationSeconds < 10) return 0

  // Base points: 1 point per 6 seconds (10 points per minute)
  const basePoints = Math.floor(durationSeconds / 6)

  // Quality multiplier: 1.0x to 2.0x based on movement score (0-100)
  const qualityMultiplier = 1 + movementScore / 100

  // Apply multiplier
  const totalPoints = Math.floor(basePoints * qualityMultiplier)

  // Minimum 5 points for any completed session (10+ seconds)
  return Math.max(totalPoints, 5)
}

// Points breakdown:
// 1 min (60s), 50% movement → 10 * 1.5 = 15 points
// 5 min (300s), 80% movement → 50 * 1.8 = 90 points
// 10 min (600s), 100% movement → 100 * 2.0 = 200 points

export const freestyleSessionResolvers = {
  Query: {
    myFreestyleSessions: async (
      _: any,
      args: { limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      const limit = args.limit || 20
      const offset = args.offset || 0

      const { data, error } = await supabase
        .from('freestyle_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('session_date', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch freestyle sessions', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    freestyleSession: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('freestyle_sessions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error) {
        throw new GraphQLError('Freestyle session not found', {
          extensions: { code: 'NOT_FOUND', details: error },
        })
      }

      return data
    },

    myFreestyleStats: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get all sessions for stats
      const { data: sessions, error } = await supabase
        .from('freestyle_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', true)

      if (error) {
        throw new GraphQLError('Failed to fetch freestyle stats', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      if (!sessions || sessions.length === 0) {
        return {
          total_sessions: 0,
          total_duration_seconds: 0,
          total_points: 0,
          average_movement_score: 0,
          best_movement_score: 0,
          sessions_this_week: 0,
          current_streak: 0,
          longest_streak: 0,
          last_session_date: null,
        }
      }

      // Calculate stats
      const totalSessions = sessions.length
      const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)
      const totalPoints = sessions.reduce((sum, s) => sum + s.points_awarded, 0)
      const avgMovementScore =
        sessions.reduce((sum, s) => sum + s.movement_score, 0) / totalSessions
      const bestMovementScore = Math.max(...sessions.map(s => s.movement_score))

      // Sessions this week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const sessionsThisWeek = sessions.filter(s => new Date(s.session_date) > weekAgo).length

      // Calculate streak
      const sortedSessions = [...sessions].sort(
        (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime(),
      )

      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 1
      let lastDate = new Date(sortedSessions[0].session_date)

      for (let i = 1; i < sortedSessions.length; i++) {
        const currentDate = new Date(sortedSessions[i].session_date)
        const dayDiff = Math.floor(
          (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
        )

        if (dayDiff === 1) {
          tempStreak++
        } else if (dayDiff > 1) {
          longestStreak = Math.max(longestStreak, tempStreak)
          tempStreak = 1
        }

        lastDate = currentDate
      }

      longestStreak = Math.max(longestStreak, tempStreak)

      // Current streak (from today)
      const today = new Date()
      const daysSinceLastSession = Math.floor(
        (today.getTime() - new Date(sortedSessions[0].session_date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
      currentStreak = daysSinceLastSession <= 1 ? tempStreak : 0

      return {
        total_sessions: totalSessions,
        total_duration_seconds: totalDuration,
        total_points: totalPoints,
        average_movement_score: avgMovementScore,
        best_movement_score: bestMovementScore,
        sessions_this_week: sessionsThisWeek,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_session_date: sortedSessions[0].session_date,
      }
    },

    myFreestylePreferences: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('users')
        .select('daily_reminder_enabled, daily_reminder_time, live_sessions_enabled')
        .eq('privy_id', userId)
        .single()

      if (error) {
        throw new GraphQLError('Failed to fetch preferences', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return {
        daily_reminder_enabled: data.daily_reminder_enabled ?? true,
        daily_reminder_time: data.daily_reminder_time || '09:00:00',
        live_sessions_enabled: data.live_sessions_enabled ?? false,
      }
    },

    completedFreestyleToday: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('freestyle_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('session_date', today.toISOString())
        .limit(1)

      if (error) {
        throw new GraphQLError('Failed to check freestyle completion', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return (data?.length || 0) > 0
    },
  },

  Mutation: {
    createFreestyleSession: async (
      _: any,
      { input }: { input: CreateFreestyleSessionInput },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Validate duration (max 10 minutes = 600 seconds)
      if (input.duration_seconds > 600 || input.duration_seconds <= 0) {
        throw new GraphQLError('Duration must be between 1 and 600 seconds', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      // Calculate points
      const points = calculatePoints(input.duration_seconds, input.movement_score)

      const sessionData = {
        user_id: userId,
        duration_seconds: input.duration_seconds,
        movement_score: input.movement_score,
        points_awarded: points,
        music_source: input.music_source || 'licensed',
        motion_data: input.motion_data || null,
        completed: input.completed ?? true,
        session_date: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('freestyle_sessions')
        .insert(sessionData)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create freestyle session', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      // Award points to user
      const { error: pointsError } = await supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: points,
      })

      if (pointsError) {
        console.error('Failed to award points:', pointsError)
      }

      // Check and unlock achievements
      try {
        const achievementResult = await checkAndUnlockAchievements(userId)
        if (achievementResult.newly_unlocked.length > 0) {
          console.log(
            `User ${userId} unlocked ${achievementResult.newly_unlocked.length} achievements:`,
            achievementResult.newly_unlocked.map((a: any) => a.title),
          )
        }
        // Add achievement info to response
        return {
          ...data,
          achievements_unlocked: achievementResult.newly_unlocked.map(
            (a: any) => a.achievement_type,
          ),
        }
      } catch (achievementError) {
        console.error('Failed to check achievements:', achievementError)
        return data
      }
    },

    updateFreestylePreferences: async (
      _: any,
      { input }: { input: UpdateUserPreferencesInput },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const updates: any = {}
      if (input.daily_reminder_enabled !== undefined) {
        updates.daily_reminder_enabled = input.daily_reminder_enabled
      }
      if (input.daily_reminder_time !== undefined) {
        updates.daily_reminder_time = input.daily_reminder_time
      }
      if (input.live_sessions_enabled !== undefined) {
        updates.live_sessions_enabled = input.live_sessions_enabled
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('privy_id', userId)
        .select('daily_reminder_enabled, daily_reminder_time, live_sessions_enabled')
        .single()

      if (error) {
        throw new GraphQLError('Failed to update preferences', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return {
        daily_reminder_enabled: data.daily_reminder_enabled ?? true,
        daily_reminder_time: data.daily_reminder_time || '09:00:00',
        live_sessions_enabled: data.live_sessions_enabled ?? false,
      }
    },

    deleteFreestyleSession: async (
      _: any,
      { sessionId }: { sessionId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { error } = await supabase
        .from('freestyle_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId)

      if (error) {
        throw new GraphQLError('Failed to delete freestyle session', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return {
        success: true,
        message: 'Freestyle session deleted successfully',
      }
    },
  },

  FreestyleSession: {
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
