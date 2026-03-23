import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

export const feedbackResolvers = {
  Query: {
    allFeedback: async (
      _: unknown,
      args: { status?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', context.userId)
        .single()

      if (userData?.role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      let query = supabase.from('feedback').select('*').order('created_at', { ascending: false })

      if (args.status) {
        query = query.eq('status', args.status)
      }

      if (args.limit) {
        query = query.limit(args.limit)
      }

      if (args.offset) {
        query = query.range(args.offset, args.offset + (args.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('[allFeedback] Error:', error)
        throw new GraphQLError('Failed to fetch feedback', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data || []
    },

    feedbackStats: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', context.userId)
        .single()

      if (userData?.role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { data, error } = await supabase.from('feedback').select('status')

      if (error) {
        console.error('[feedbackStats] Error:', error)
        throw new GraphQLError('Failed to fetch feedback stats', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      const stats = {
        total: data?.length || 0,
        pending: 0,
        reviewed: 0,
        in_progress: 0,
        resolved: 0,
        dismissed: 0,
      }

      for (const item of data || []) {
        if (item.status in stats) {
          stats[item.status as keyof typeof stats]++
        }
      }

      return stats
    },
  },

  Mutation: {
    submitFeedback: async (
      _: unknown,
      args: {
        input: {
          message: string
          screenshot_url?: string
          device_info?: string
          app_version?: string
        }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { message, screenshot_url, device_info, app_version } = args.input

      if (!message || message.trim().length === 0) {
        throw new GraphQLError('Message is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      const { data, error } = await supabase
        .from('feedback')
        .insert({
          user_id: context.userId,
          message: message.trim(),
          screenshot_url,
          device_info,
          app_version,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        console.error('[submitFeedback] Error:', error)
        throw new GraphQLError('Failed to submit feedback', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      console.log('[submitFeedback] Feedback submitted:', {
        id: data.id,
        user_id: context.userId,
      })

      return data
    },

    updateFeedbackStatus: async (
      _: unknown,
      args: {
        input: {
          feedback_id: string
          status: string
          admin_notes?: string
        }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', context.userId)
        .single()

      if (userData?.role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { feedback_id, status, admin_notes } = args.input

      const updateData: Record<string, unknown> = {
        status,
        admin_notes,
        updated_at: new Date().toISOString(),
      }

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
        updateData.resolved_by = context.userId
      }

      const { data, error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', feedback_id)
        .select()
        .single()

      if (error) {
        console.error('[updateFeedbackStatus] Error:', error)
        throw new GraphQLError('Failed to update feedback', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data
    },
  },

  Feedback: {
    user: async (parent: { user_id: string }) => {
      if (!parent.user_id) return null

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single()

      return data
    },
  },
}
