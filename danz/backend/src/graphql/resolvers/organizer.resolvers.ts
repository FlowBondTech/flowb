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

  const { data: user } = await supabase.from('users').select('role').eq('privy_id', userId).single()

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return userId
}

export const organizerResolvers = {
  Query: {
    myOrganizerApplication: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('organizer_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError('Failed to fetch application', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data || null
    },

    pendingOrganizerApplications: async (
      _: any,
      { limit = 20, offset = 0 }: any,
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      const { data, error, count } = await supabase
        .from('organizer_applications')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch applications', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        applications: data || [],
        totalCount: count || 0,
      }
    },

    organizerApplications: async (
      _: any,
      { status, limit = 20, offset = 0 }: any,
      context: GraphQLContext,
    ) => {
      await requireAdmin(context)

      let query = supabase
        .from('organizer_applications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) {
        throw new GraphQLError('Failed to fetch applications', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        applications: data || [],
        totalCount: count || 0,
      }
    },

    organizerApplication: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      await requireAdmin(context)

      const { data, error } = await supabase
        .from('organizer_applications')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new GraphQLError('Application not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return data
    },
  },

  Mutation: {
    submitOrganizerApplication: async (_: any, { input }: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if user already has a pending application
      const { data: existing } = await supabase
        .from('organizer_applications')
        .select('id, status')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single()

      if (existing) {
        throw new GraphQLError('You already have a pending application', {
          extensions: { code: 'CONFLICT' },
        })
      }

      // Check if user is already an approved organizer
      const { data: user } = await supabase
        .from('users')
        .select('role, is_organizer_approved')
        .eq('privy_id', userId)
        .single()

      if (user?.is_organizer_approved) {
        throw new GraphQLError('You are already an approved organizer', {
          extensions: { code: 'CONFLICT' },
        })
      }

      // Create the application
      const { data, error } = await supabase
        .from('organizer_applications')
        .insert({
          user_id: userId,
          ...input,
        })
        .select()
        .single()

      if (error) {
        console.error('[submitOrganizerApplication] Error:', error)
        throw new GraphQLError('Failed to submit application', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // Update user role to organizer if not already
      if (user?.role !== 'organizer' && user?.role !== 'admin' && user?.role !== 'manager') {
        await supabase.from('users').update({ role: 'organizer' }).eq('privy_id', userId)
      }

      return data
    },

    reviewOrganizerApplication: async (
      _: any,
      { input }: { input: { application_id: string; status: string; admin_notes?: string } },
      context: GraphQLContext,
    ) => {
      const adminId = await requireAdmin(context)

      const { application_id, status, admin_notes } = input

      // Get the application
      const { data: application, error: fetchError } = await supabase
        .from('organizer_applications')
        .select('*, user:users!user_id(*)')
        .eq('id', application_id)
        .single()

      if (fetchError || !application) {
        throw new GraphQLError('Application not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      if (application.status !== 'pending') {
        throw new GraphQLError('Application has already been reviewed', {
          extensions: { code: 'CONFLICT' },
        })
      }

      // Update the application
      const { data: updatedApplication, error: updateError } = await supabase
        .from('organizer_applications')
        .update({
          status,
          admin_notes,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', application_id)
        .select()
        .single()

      if (updateError) {
        throw new GraphQLError('Failed to update application', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // If approved, update the user's organizer status
      if (status === 'approved') {
        await supabase
          .from('users')
          .update({
            role: 'organizer',
            is_organizer_approved: true,
          })
          .eq('privy_id', application.user_id)
      }

      return updatedApplication
    },
  },

  OrganizerApplication: {
    user: async (parent: any) => {
      if (parent.user) return parent.user

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()

      return data
    },

    reviewer: async (parent: any) => {
      if (!parent.reviewed_by) return null

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.reviewed_by)
        .single()

      return data
    },
  },
}
