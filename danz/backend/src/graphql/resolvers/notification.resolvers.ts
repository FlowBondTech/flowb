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

// Helper function to check if user is admin
const requireAdmin = async (context: GraphQLContext) => {
  const userId = requireAuth(context)

  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single()

  if (!user || user.role !== 'admin') {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return userId
}

// Helper to check event manager permission
const checkEventManagerPermission = async (
  userId: string,
  eventId: string,
  permission: string,
): Promise<boolean> => {
  const { data: manager } = await supabase
    .from('event_managers')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!manager) return false

  // Check specific permission
  const permissionMap: Record<string, string> = {
    send_broadcasts: 'can_send_broadcasts',
    edit_details: 'can_edit_details',
    manage_registrations: 'can_manage_registrations',
    manage_posts: 'can_manage_posts',
  }

  const permissionKey = permissionMap[permission]
  return permissionKey ? manager[permissionKey] === true : false
}

export const notificationResolvers = {
  Query: {
    myNotifications: async (
      _: any,
      {
        limit = 20,
        offset = 0,
        unread_only = false,
        type,
      }: { limit?: number; offset?: number; unread_only?: boolean; type?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (unread_only) {
        query = query.eq('read', false)
      }

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        throw new GraphQLError('Failed to fetch notifications', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read', false)

      return {
        notifications: data || [],
        total_count: count || 0,
        unread_count: unreadCount || 0,
        has_more: offset + limit < (count || 0),
      }
    },

    notification: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .eq('recipient_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new GraphQLError('Failed to fetch notification', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    myNotificationPreferences: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Try to get existing preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Create default preferences if they don't exist
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert([{ user_id: userId }])
          .select()
          .single()

        if (createError) {
          throw new GraphQLError('Failed to create notification preferences', {
            extensions: { code: 'DATABASE_ERROR', originalError: createError },
          })
        }

        return newPrefs
      }

      if (error) {
        throw new GraphQLError('Failed to fetch notification preferences', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    unreadNotificationCount: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error counting unread notifications:', error)
        return 0
      }

      return count || 0
    },
  },

  Mutation: {
    markNotificationRead: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('recipient_id', userId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to mark notification as read', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    markAllNotificationsRead: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .eq('read', false)

      if (error) {
        throw new GraphQLError('Failed to mark all notifications as read', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return { success: true, message: 'All notifications marked as read' }
    },

    deleteNotification: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('recipient_id', userId)

      if (error) {
        throw new GraphQLError('Failed to delete notification', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return { success: true, message: 'Notification deleted' }
    },

    updateNotificationPreferences: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: userId, ...input, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update notification preferences', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },

    sendAdminBroadcast: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const adminUserId = await requireAdmin(context)

      const { title, message, broadcast_target, event_id, action_type, action_data, expires_at } =
        input

      // Get recipient user IDs based on target
      let recipientIds: string[] = []

      switch (broadcast_target) {
        case 'all_users': {
          const { data: allUsers } = await supabase.from('users').select('id')
          recipientIds = allUsers?.map(u => u.id) || []
          break
        }

        case 'event_participants': {
          if (!event_id) {
            throw new GraphQLError('event_id required for event_participants target', {
              extensions: { code: 'BAD_USER_INPUT' },
            })
          }
          const { data: participants } = await supabase
            .from('event_registrations')
            .select('user_id')
            .eq('event_id', event_id)
          recipientIds = participants?.map(p => p.user_id) || []
          break
        }

        case 'organizers': {
          const { data: organizers } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'organizer')
          recipientIds = organizers?.map(u => u.id) || []
          break
        }

        case 'dancers': {
          const { data: dancers } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'dancer')
          recipientIds = dancers?.map(u => u.id) || []
          break
        }
      }

      if (recipientIds.length === 0) {
        return { success: true, message: 'No recipients found for broadcast target' }
      }

      // Create notifications for all recipients
      const notifications = recipientIds.map(recipient_id => ({
        type: 'admin_broadcast',
        title,
        message,
        sender_id: adminUserId,
        sender_type: 'admin',
        recipient_id,
        event_id,
        is_broadcast: true,
        broadcast_target,
        action_type,
        action_data,
        expires_at,
      }))

      const { error } = await supabase.from('notifications').insert(notifications)

      if (error) {
        console.error('Error sending admin broadcast:', error)
        throw new GraphQLError('Failed to send broadcast', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return {
        success: true,
        message: `Broadcast sent to ${recipientIds.length} users`,
      }
    },

    sendEventBroadcast: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)
      const { event_id, title, message, action_type, action_data } = input

      // Check if user has permission to send broadcasts for this event
      const hasPermission = await checkEventManagerPermission(userId, event_id, 'send_broadcasts')

      if (!hasPermission) {
        throw new GraphQLError('You do not have permission to send broadcasts for this event', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      // Get all event participants
      const { data: participants } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', event_id)
        .neq('status', 'cancelled')

      const recipientIds = participants?.map(p => p.user_id) || []

      if (recipientIds.length === 0) {
        return { success: true, message: 'No participants found for this event' }
      }

      // Create notifications for all participants
      const notifications = recipientIds.map(recipient_id => ({
        type: 'event_manager_broadcast',
        title,
        message,
        sender_id: userId,
        sender_type: 'event_manager',
        recipient_id,
        event_id,
        is_broadcast: true,
        broadcast_target: 'event_participants',
        action_type: action_type || 'open_event',
        action_data: action_data || { event_id },
      }))

      const { error } = await supabase.from('notifications').insert(notifications)

      if (error) {
        console.error('Error sending event broadcast:', error)
        throw new GraphQLError('Failed to send event broadcast', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return {
        success: true,
        message: `Broadcast sent to ${recipientIds.length} participants`,
      }
    },

    createNotification: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      // This can be called by system or authenticated users
      const userId = context.userId

      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            ...input,
            sender_id: userId,
            sender_type: userId ? 'user' : 'system',
          },
        ])
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to create notification', {
          extensions: { code: 'DATABASE_ERROR', originalError: error },
        })
      }

      return data
    },
  },

  Notification: {
    sender: async (parent: any) => {
      if (!parent.sender_id) return null

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.sender_id)
        .single()

      return data
    },

    recipient: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.recipient_id)
        .single()

      return data
    },

    event: async (parent: any) => {
      if (!parent.event_id) return null

      const { data } = await supabase.from('events').select('*').eq('id', parent.event_id).single()

      return data
    },

    gig: async (parent: any) => {
      if (!parent.gig_id) return null

      const { data } = await supabase
        .from('event_gigs')
        .select(`
          *,
          role:gig_roles(*),
          event:events(id, title, start_date_time, location_name)
        `)
        .eq('id', parent.gig_id)
        .single()

      return data
    },

    gigApplication: async (parent: any) => {
      if (!parent.gig_application_id) return null

      const { data } = await supabase
        .from('gig_applications')
        .select(`
          *,
          gig:event_gigs(*, role:gig_roles(*)),
          user:users(id, username, display_name, avatar_url)
        `)
        .eq('id', parent.gig_application_id)
        .single()

      return data
    },
  },
}
