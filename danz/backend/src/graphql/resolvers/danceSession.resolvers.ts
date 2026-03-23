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

interface SaveDanceSessionInput {
  duration: number
  started_at: string
  ended_at: string
  bpm_average?: number
  bpm_peak?: number
  motion_intensity_avg?: number
  movement_score?: number
  calories_burned?: number
  xp_earned: number
  achievements_unlocked?: string[]
  is_shared?: boolean
  shared_with_user_ids?: string[]
  device_type?: string
  app_version?: string
  session_quality?: number
}

export const danceSessionResolvers = {
  Query: {
    myDanceSessions: async (
      _: any,
      args: {
        pagination?: { limit?: number; offset?: number }
        filter?: {
          from_date?: string
          to_date?: string
          min_score?: number
          min_duration?: number
          is_shared?: boolean
        }
      },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)
      const limit = args.pagination?.limit || 20
      const offset = args.pagination?.offset || 0

      // Build query
      let query = supabase
        .from('dance_sessions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (args.filter) {
        if (args.filter.from_date) {
          query = query.gte('created_at', args.filter.from_date)
        }
        if (args.filter.to_date) {
          query = query.lte('created_at', args.filter.to_date)
        }
        if (args.filter.min_score) {
          query = query.gte('movement_score', args.filter.min_score)
        }
        if (args.filter.min_duration) {
          query = query.gte('duration', args.filter.min_duration)
        }
        if (args.filter.is_shared !== undefined) {
          query = query.eq('is_shared', args.filter.is_shared)
        }
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch dance sessions', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return {
        sessions: data || [],
        totalCount: count || 0,
        pageInfo: {
          hasNextPage: (count || 0) > offset + limit,
          hasPreviousPage: offset > 0,
          startCursor: offset.toString(),
          endCursor: (offset + limit).toString(),
        },
      }
    },

    danceSession: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('dance_sessions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        throw new GraphQLError('Dance session not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return data
    },

    myDanceSessionStats: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Get aggregate stats from dance_sessions
      const { data: sessions, error } = await supabase
        .from('dance_sessions')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        throw new GraphQLError('Failed to fetch session stats', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      // Calculate stats
      const stats = (sessions || []).reduce(
        (acc, session) => {
          acc.total_sessions += 1
          acc.total_duration += session.duration || 0
          acc.total_xp_earned += (session.xp_earned || 0) + (session.social_xp_bonus || 0)
          acc.total_calories += session.calories_burned || 0
          acc.best_score = Math.max(acc.best_score, session.movement_score || 0)
          acc.best_duration = Math.max(acc.best_duration, session.duration || 0)
          if (session.bpm_average) {
            acc.total_bpm += session.bpm_average
            acc.bpm_count += 1
          }
          return acc
        },
        {
          total_sessions: 0,
          total_duration: 0,
          total_xp_earned: 0,
          total_calories: 0,
          best_score: 0,
          best_duration: 0,
          total_bpm: 0,
          bpm_count: 0,
        },
      )

      // Get streak info from user table
      const { data: user } = await supabase
        .from('users')
        .select('current_streak, longest_streak')
        .eq('id', userId)
        .single()

      return {
        total_sessions: stats.total_sessions,
        total_duration: stats.total_duration,
        total_xp_earned: stats.total_xp_earned,
        total_calories: stats.total_calories,
        best_score: stats.best_score,
        best_duration: stats.best_duration,
        average_bpm: stats.bpm_count > 0 ? stats.total_bpm / stats.bpm_count : null,
        current_streak: user?.current_streak || 0,
        longest_streak: user?.longest_streak || 0,
      }
    },

    friendsDanceSessions: async (
      _: any,
      { limit = 10, offset = 0 }: { limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get user's dance bonds
      const { data: bonds, error: bondsError } = await supabase
        .from('dance_bonds')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

      if (bondsError) {
        throw new GraphQLError('Failed to fetch friends', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: bondsError },
        })
      }

      // Extract friend IDs
      const friendIds = (bonds || []).map(bond =>
        bond.user1_id === userId ? bond.user2_id : bond.user1_id,
      )

      if (friendIds.length === 0) {
        return []
      }

      // Get recent shared sessions from friends
      const { data, error } = await supabase
        .from('dance_sessions')
        .select('*')
        .in('user_id', friendIds)
        .eq('is_shared', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch friends sessions', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },
  },

  Mutation: {
    saveDanceSession: async (
      _: any,
      { input }: { input: SaveDanceSessionInput },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get current user for level calculation
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('xp, level')
        .eq('id', userId)
        .single()

      if (userError) {
        throw new GraphQLError('Failed to fetch user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: userError },
        })
      }

      // Calculate level ups (simple XP-based leveling: level = floor(xp / 1000) + 1)
      const oldLevel = user.level || 1
      const newXP = (user.xp || 0) + input.xp_earned
      const newLevel = Math.floor(newXP / 1000) + 1
      const levelUps = Math.max(0, newLevel - oldLevel)

      // TODO: Check for achievement unlocks based on session data

      // Prepare session data
      const sessionData = {
        user_id: userId,
        duration: input.duration,
        started_at: input.started_at,
        ended_at: input.ended_at,
        bpm_average: input.bpm_average,
        bpm_peak: input.bpm_peak,
        motion_intensity_avg: input.motion_intensity_avg,
        movement_score: input.movement_score,
        calories_burned: input.calories_burned,
        xp_earned: input.xp_earned,
        level_at_session: oldLevel,
        level_ups: levelUps,
        achievements_unlocked: input.achievements_unlocked || [],
        is_shared: input.is_shared || false,
        shared_with_user_ids: input.shared_with_user_ids || [],
        social_xp_bonus: 0, // TODO: Calculate based on shared session
        device_type: input.device_type,
        app_version: input.app_version,
        session_quality: input.session_quality,
      }

      // Insert session (trigger will automatically update user stats)
      const { data, error } = await supabase
        .from('dance_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to save dance session', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      // Update user level if leveled up
      if (levelUps > 0) {
        await supabase.from('users').update({ level: newLevel }).eq('id', userId)
      }

      return data
    },

    shareDanceSession: async (
      _: any,
      { sessionId, userIds }: { sessionId: string; userIds: string[] },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Verify session ownership
      const { data: session, error: fetchError } = await supabase
        .from('dance_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !session) {
        throw new GraphQLError('Dance session not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Update session to mark as shared
      const { data, error } = await supabase
        .from('dance_sessions')
        .update({
          is_shared: true,
          shared_with_user_ids: userIds,
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to share dance session', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    deleteDanceSession: async (
      _: any,
      { sessionId }: { sessionId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Verify session ownership
      const { data: session, error: fetchError } = await supabase
        .from('dance_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !session) {
        throw new GraphQLError('Dance session not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Delete session
      const { error } = await supabase.from('dance_sessions').delete().eq('id', sessionId)

      if (error) {
        throw new GraphQLError('Failed to delete dance session', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return {
        success: true,
        message: 'Dance session deleted successfully',
        code: 'SUCCESS',
      }
    },
  },

  DanceSession: {
    user: async (parent: any) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single()

      if (error) {
        throw new GraphQLError('Failed to fetch user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data
    },

    shared_with_users: async (parent: any) => {
      if (!parent.shared_with_user_ids || parent.shared_with_user_ids.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', parent.shared_with_user_ids)

      if (error) {
        throw new GraphQLError('Failed to fetch shared users', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      return data || []
    },

    dance_bonds_strengthened: async (parent: any) => {
      if (!parent.dance_bonds_strengthened || parent.dance_bonds_strengthened.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from('dance_bonds')
        .select('*')
        .or(
          parent.dance_bonds_strengthened
            .map((userId: string) => `user1_id.eq.${userId},user2_id.eq.${userId}`)
            .join(','),
        )

      if (error) {
        return []
      }

      return data || []
    },
  },
}
