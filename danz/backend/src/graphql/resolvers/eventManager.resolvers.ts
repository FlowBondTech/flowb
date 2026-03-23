import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

// Helper function to require authentication
const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

// Helper to check if user is creator or has specific permission
const requireEventPermission = async (
  userId: string,
  eventId: string,
  permission?: string,
): Promise<any> => {
  const { data: manager } = await supabase
    .from('event_managers')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!manager) {
    throw new GraphQLError('You are not a manager of this event', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  if (permission) {
    const permissionMap: Record<string, string> = {
      invite_managers: 'can_invite_managers',
      edit_details: 'can_edit_details',
      manage_registrations: 'can_manage_registrations',
      send_broadcasts: 'can_send_broadcasts',
      manage_posts: 'can_manage_posts',
      delete_event: 'can_delete_event',
    }

    const permissionKey = permissionMap[permission]
    if (permissionKey && !manager[permissionKey]) {
      throw new GraphQLError(`You do not have ${permission} permission for this event`, {
        extensions: { code: 'FORBIDDEN' },
      })
    }
  }

  return manager
}

// Helper to check if user is creator
const requireCreatorRole = async (userId: string, eventId: string) => {
  const manager = await requireEventPermission(userId, eventId)

  if (manager.role !== 'creator') {
    throw new GraphQLError('Only the event creator can perform this action', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return manager
}

export const eventManagerResolvers = {
  Query: {
    eventManagers: async (_: any, { event_id }: { event_id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if user has access to view managers (is a manager themselves)
      const { data: userManager } = await supabase
        .from('event_managers')
        .select('id')
        .eq('event_id', event_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      // Also check if user is event creator via events table
      const { data: event } = await supabase
        .from('events')
        .select('creator_id, organizer_id')
        .eq('id', event_id)
        .single()

      const isCreatorOrOrganizer = event?.creator_id === userId || event?.organizer_id === userId

      if (!userManager && !isCreatorOrOrganizer) {
        throw new GraphQLError('You do not have access to view managers for this event', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const {
        data: managers,
        error,
        count,
      } = await supabase
        .from('event_managers')
        .select('*', { count: 'exact' })
        .eq('event_id', event_id)
        .in('status', ['active', 'pending'])
        .order('role', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw new GraphQLError('Failed to fetch event managers', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return {
        managers: managers || [],
        total_count: count || 0,
      }
    },

    eventManager: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context)

      const { data, error } = await supabase
        .from('event_managers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch event manager', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    myEventManagerRole: async (
      _: any,
      { event_id }: { event_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('event_managers')
        .select('*')
        .eq('event_id', event_id)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch manager role', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    myManagedEvents: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data: managerRecords } = await supabase
        .from('event_managers')
        .select('event_id')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (!managerRecords || managerRecords.length === 0) {
        return []
      }

      const eventIds = managerRecords.map(m => m.event_id)

      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .order('start_date', { ascending: true })

      if (error) {
        throw new GraphQLError('Failed to fetch managed events', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return events || []
    },

    checkEventPermission: async (
      _: any,
      { event_id, permission }: { event_id: string; permission: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data: manager } = await supabase
        .from('event_managers')
        .select('*')
        .eq('event_id', event_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (!manager) return false

      const permissionMap: Record<string, string> = {
        edit_details: 'can_edit_details',
        manage_registrations: 'can_manage_registrations',
        send_broadcasts: 'can_send_broadcasts',
        manage_posts: 'can_manage_posts',
        invite_managers: 'can_invite_managers',
        delete_event: 'can_delete_event',
      }

      const permissionKey = permissionMap[permission]
      return permissionKey ? manager[permissionKey] === true : false
    },
  },

  Mutation: {
    inviteEventManager: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const {
        event_id,
        user_id: inviteeId,
        role = 'manager',
        can_edit_details = true,
        can_manage_registrations = true,
        can_send_broadcasts = true,
        can_manage_posts = false,
        can_invite_managers = false,
      } = input

      // Check if inviter has permission to invite
      await requireEventPermission(userId, event_id, 'invite_managers')

      // Check if invitee exists
      const { data: invitee } = await supabase
        .from('users')
        .select('id')
        .eq('id', inviteeId)
        .single()

      if (!invitee) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check if already a manager
      const { data: existingManager } = await supabase
        .from('event_managers')
        .select('id, status')
        .eq('event_id', event_id)
        .eq('user_id', inviteeId)
        .single()

      if (existingManager) {
        if (existingManager.status === 'active') {
          throw new GraphQLError('User is already a manager of this event', {
            extensions: { code: 'DUPLICATE' },
          })
        }
        if (existingManager.status === 'pending') {
          throw new GraphQLError('User already has a pending invitation', {
            extensions: { code: 'DUPLICATE' },
          })
        }
      }

      // Create invitation
      const { data: newManager, error } = await supabase
        .from('event_managers')
        .insert([
          {
            event_id,
            user_id: inviteeId,
            role,
            status: 'pending',
            invited_by: userId,
            invited_at: new Date().toISOString(),
            can_edit_details,
            can_manage_registrations,
            can_send_broadcasts,
            can_manage_posts,
            can_invite_managers,
            can_delete_event: false, // Only creator can delete
          },
        ])
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to invite manager', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Create notification for invitee
      await supabase.from('notifications').insert([
        {
          type: 'event_update',
          title: 'Manager Invitation',
          message: 'You have been invited to manage an event',
          sender_id: userId,
          sender_type: 'event_manager',
          recipient_id: inviteeId,
          event_id,
          action_type: 'open_event',
          action_data: { event_id },
        },
      ])

      return newManager
    },

    acceptManagerInvitation: async (
      _: any,
      { manager_id }: { manager_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get the invitation
      const { data: invitation } = await supabase
        .from('event_managers')
        .select('*')
        .eq('id', manager_id)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single()

      if (!invitation) {
        throw new GraphQLError('Invitation not found or already processed', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Accept invitation
      const { data, error } = await supabase
        .from('event_managers')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', manager_id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to accept invitation', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    declineManagerInvitation: async (
      _: any,
      { manager_id }: { manager_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get the invitation
      const { data: invitation } = await supabase
        .from('event_managers')
        .select('*')
        .eq('id', manager_id)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single()

      if (!invitation) {
        throw new GraphQLError('Invitation not found or already processed', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Decline invitation
      const { data, error } = await supabase
        .from('event_managers')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString(),
        })
        .eq('id', manager_id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to decline invitation', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    updateEventManager: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const { manager_id, ...updates } = input

      // Get the manager record
      const { data: targetManager } = await supabase
        .from('event_managers')
        .select('*')
        .eq('id', manager_id)
        .single()

      if (!targetManager) {
        throw new GraphQLError('Manager not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Only creator can update manager permissions
      await requireCreatorRole(userId, targetManager.event_id)

      // Cannot update creator role
      if (targetManager.role === 'creator') {
        throw new GraphQLError('Cannot modify creator permissions', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { data, error } = await supabase
        .from('event_managers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', manager_id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update manager', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    removeEventManager: async (
      _: any,
      { manager_id }: { manager_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get the manager record
      const { data: targetManager } = await supabase
        .from('event_managers')
        .select('*')
        .eq('id', manager_id)
        .single()

      if (!targetManager) {
        throw new GraphQLError('Manager not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Only creator can remove managers (or user can remove themselves)
      if (targetManager.user_id !== userId) {
        await requireCreatorRole(userId, targetManager.event_id)
      }

      // Cannot remove creator
      if (targetManager.role === 'creator') {
        throw new GraphQLError('Cannot remove the event creator', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { error } = await supabase
        .from('event_managers')
        .update({
          status: 'removed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', manager_id)

      if (error) {
        throw new GraphQLError('Failed to remove manager', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return { success: true, message: 'Manager removed successfully' }
    },

    leaveEventAsManager: async (
      _: any,
      { event_id }: { event_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Get user's manager record
      const { data: manager } = await supabase
        .from('event_managers')
        .select('*')
        .eq('event_id', event_id)
        .eq('user_id', userId)
        .single()

      if (!manager) {
        throw new GraphQLError('You are not a manager of this event', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Creator cannot leave - they must transfer ownership first
      if (manager.role === 'creator') {
        throw new GraphQLError('Event creator cannot leave. Transfer ownership first.', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { error } = await supabase
        .from('event_managers')
        .update({
          status: 'removed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', manager.id)

      if (error) {
        throw new GraphQLError('Failed to leave event', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return { success: true, message: 'Successfully left as manager' }
    },

    transferEventOwnership: async (
      _: any,
      { event_id, new_creator_id }: { event_id: string; new_creator_id: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Only current creator can transfer
      await requireCreatorRole(userId, event_id)

      // Check if new creator is an active manager
      const { data: newCreatorManager } = await supabase
        .from('event_managers')
        .select('*')
        .eq('event_id', event_id)
        .eq('user_id', new_creator_id)
        .eq('status', 'active')
        .single()

      if (!newCreatorManager) {
        throw new GraphQLError('New creator must be an active manager of this event', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      // Update current creator to manager
      await supabase
        .from('event_managers')
        .update({
          role: 'manager',
          can_delete_event: false,
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', event_id)
        .eq('user_id', userId)

      // Update new creator
      const { data: newCreator, error } = await supabase
        .from('event_managers')
        .update({
          role: 'creator',
          can_edit_details: true,
          can_manage_registrations: true,
          can_send_broadcasts: true,
          can_manage_posts: true,
          can_invite_managers: true,
          can_delete_event: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newCreatorManager.id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to transfer ownership', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Update events table
      await supabase.from('events').update({ creator_id: new_creator_id }).eq('id', event_id)

      // Notify new creator
      await supabase.from('notifications').insert([
        {
          type: 'event_update',
          title: 'Event Ownership Transferred',
          message: 'You are now the owner of this event',
          sender_id: userId,
          sender_type: 'event_manager',
          recipient_id: new_creator_id,
          event_id,
          action_type: 'open_event',
          action_data: { event_id },
        },
      ])

      return newCreator
    },
  },

  EventManager: {
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

    inviter: async (parent: any) => {
      if (!parent.invited_by) return null

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.invited_by)
        .single()

      return data
    },
  },
}
