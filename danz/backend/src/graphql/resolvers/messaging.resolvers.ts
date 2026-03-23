import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

// Helper to check if user is blocked
async function isBlocked(userId1: string, userId2: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`,
    )
    .limit(1)

  return (data?.length ?? 0) > 0
}

// Helper to check if user is in conversation
async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .is('left_at', null)
    .single()

  return !!data
}

// Helper to check if user can message another user
async function canMessage(
  senderId: string,
  recipientId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if blocked
  if (await isBlocked(senderId, recipientId)) {
    return { allowed: false, reason: 'You cannot message this user' }
  }

  // Check if recipient allows messages
  const { data: recipient } = await supabase
    .from('users')
    .select('allow_messages')
    .eq('id', recipientId)
    .single()

  if (recipient && !recipient.allow_messages) {
    return { allowed: false, reason: 'This user has disabled direct messages' }
  }

  return { allowed: true }
}

export const messagingResolvers = {
  Query: {
    // Get user's conversations
    myConversations: async (
      _: unknown,
      args: {
        filter?: {
          is_archived?: boolean
          is_muted?: boolean
          is_group?: boolean
          has_unread?: boolean
          search?: string
        }
        limit?: number
        offset?: number
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const limit = Math.min(args.limit || 20, 50)
      const offset = args.offset || 0

      let query = supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          is_muted,
          is_archived,
          unread_count,
          conversations!inner (
            id,
            title,
            is_group,
            last_message_at,
            last_message_preview,
            created_at,
            updated_at,
            created_by
          )
        `)
        .eq('user_id', context.userId!)
        .is('left_at', null)
        .order('conversations(last_message_at)', { ascending: false, nullsFirst: false })

      // Apply filters
      if (args.filter?.is_archived !== undefined) {
        query = query.eq('is_archived', args.filter.is_archived)
      }
      if (args.filter?.is_muted !== undefined) {
        query = query.eq('is_muted', args.filter.is_muted)
      }
      if (args.filter?.is_group !== undefined) {
        query = query.eq('conversations.is_group', args.filter.is_group)
      }
      if (args.filter?.has_unread) {
        query = query.gt('unread_count', 0)
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) {
        console.error('[Messaging] Error fetching conversations:', error)
        throw new GraphQLError('Failed to fetch conversations')
      }

      // Get unread conversations count
      const { count: unreadCount } = await supabase
        .from('conversation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', context.userId!)
        .is('left_at', null)
        .gt('unread_count', 0)

      // Transform data
      const conversations = (data || []).map((cp: any) => ({
        ...cp.conversations,
        my_unread_count: cp.unread_count,
        is_muted: cp.is_muted,
        is_archived: cp.is_archived,
      }))

      return {
        conversations,
        total_count: count || conversations.length,
        unread_conversations: unreadCount || 0,
        has_more: conversations.length === limit,
      }
    },

    // Get single conversation
    conversation: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Verify user is participant
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('is_muted, is_archived, unread_count')
        .eq('conversation_id', args.id)
        .eq('user_id', context.userId!)
        .is('left_at', null)
        .single()

      if (!participant) {
        throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } })
      }

      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', args.id)
        .single()

      if (error || !conversation) {
        throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return {
        ...conversation,
        my_unread_count: participant.unread_count,
        is_muted: participant.is_muted,
        is_archived: participant.is_archived,
      }
    },

    // Get or create DM conversation
    dmConversation: async (_: unknown, args: { user_id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      if (args.user_id === context.userId!) {
        throw new GraphQLError('Cannot start conversation with yourself')
      }

      // Check if can message
      const { allowed, reason } = await canMessage(context.userId!, args.user_id)
      if (!allowed) {
        throw new GraphQLError(reason || 'Cannot message this user')
      }

      // Use database function to get or create
      const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
        user1_id: context.userId!,
        user2_id: args.user_id,
      })

      if (error) {
        console.error('[Messaging] Error creating DM:', error)
        throw new GraphQLError('Failed to create conversation')
      }

      // Fetch the conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', data)
        .single()

      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('is_muted, is_archived, unread_count')
        .eq('conversation_id', data)
        .eq('user_id', context.userId!)
        .single()

      return {
        ...conversation,
        my_unread_count: participant?.unread_count || 0,
        is_muted: participant?.is_muted || false,
        is_archived: participant?.is_archived || false,
      }
    },

    // Get messages in conversation
    messages: async (
      _: unknown,
      args: {
        conversation_id: string
        limit?: number
        before_id?: string
        after_id?: string
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Verify user is participant
      if (!(await isParticipant(args.conversation_id, context.userId!))) {
        throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } })
      }

      const limit = Math.min(args.limit || 50, 100)

      let query = supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', args.conversation_id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Cursor-based pagination
      if (args.before_id) {
        const { data: beforeMsg } = await supabase
          .from('messages')
          .select('created_at')
          .eq('id', args.before_id)
          .single()

        if (beforeMsg) {
          query = query.lt('created_at', beforeMsg.created_at)
        }
      }

      if (args.after_id) {
        const { data: afterMsg } = await supabase
          .from('messages')
          .select('created_at')
          .eq('id', args.after_id)
          .single()

        if (afterMsg) {
          query = query.gt('created_at', afterMsg.created_at)
        }
      }

      const { data: messages, error, count } = await query

      if (error) {
        console.error('[Messaging] Error fetching messages:', error)
        throw new GraphQLError('Failed to fetch messages')
      }

      return {
        messages: messages || [],
        total_count: count || 0,
        has_more: (messages?.length || 0) === limit,
        oldest_message_id: messages?.[messages.length - 1]?.id,
        newest_message_id: messages?.[0]?.id,
      }
    },

    // Get single message
    message: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { data: message, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', args.id)
        .eq('is_deleted', false)
        .single()

      if (error || !message) {
        throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } })
      }

      // Verify user is participant
      if (!(await isParticipant(message.conversation_id, context.userId!))) {
        throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return message
    },

    // Search messages
    searchMessages: async (
      _: unknown,
      args: {
        query: string
        conversation_id?: string
        limit?: number
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const limit = Math.min(args.limit || 20, 50)

      // Get user's conversation IDs
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', context.userId!)
        .is('left_at', null)

      const conversationIds = participantData?.map(p => p.conversation_id) || []

      if (conversationIds.length === 0) {
        return { messages: [], total_count: 0, has_more: false }
      }

      const query = supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .in('conversation_id', args.conversation_id ? [args.conversation_id] : conversationIds)
        .eq('is_deleted', false)
        .textSearch('content', args.query)
        .order('created_at', { ascending: false })
        .limit(limit)

      const { data: messages, error, count } = await query

      if (error) {
        console.error('[Messaging] Error searching messages:', error)
        throw new GraphQLError('Failed to search messages')
      }

      return {
        messages: messages || [],
        total_count: count || 0,
        has_more: (messages?.length || 0) === limit,
      }
    },

    // Get blocked users
    myBlockedUsers: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', context.userId!)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Messaging] Error fetching blocked users:', error)
        throw new GraphQLError('Failed to fetch blocked users')
      }

      return data || []
    },

    // Check if user is blocked
    isUserBlocked: async (_: unknown, args: { user_id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      return await isBlocked(context.userId!, args.user_id)
    },

    // Get total unread count
    unreadMessageCount: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { data } = await supabase
        .from('conversation_participants')
        .select('unread_count')
        .eq('user_id', context.userId!)
        .is('left_at', null)

      return data?.reduce((sum, p) => sum + (p.unread_count || 0), 0) || 0
    },
  },

  Mutation: {
    // Start a new conversation
    startConversation: async (
      _: unknown,
      args: {
        input: {
          recipient_id?: string
          participant_ids?: string[]
          title?: string
          initial_message?: string
        }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { input } = args
      const isGroup = !!(input.participant_ids && input.participant_ids.length > 1)

      // For DM, use recipient_id
      if (!isGroup && input.recipient_id) {
        // Check if can message
        const { allowed, reason } = await canMessage(context.userId!, input.recipient_id)
        if (!allowed) {
          throw new GraphQLError(reason || 'Cannot message this user')
        }

        // Use the DM function
        const { data: conversationId, error } = await supabase.rpc(
          'get_or_create_dm_conversation',
          {
            user1_id: context.userId!,
            user2_id: input.recipient_id,
          },
        )

        if (error) {
          console.error('[Messaging] Error creating DM:', error)
          throw new GraphQLError('Failed to create conversation')
        }

        // Send initial message if provided
        if (input.initial_message) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: context.userId!,
            content: input.initial_message,
            content_type: 'text',
          })
        }

        const { data: conversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single()

        return {
          ...conversation,
          my_unread_count: 0,
          is_muted: false,
          is_archived: false,
        }
      }

      // For group conversation
      const participantIds = [...new Set([context.userId!, ...(input.participant_ids || [])])]

      if (participantIds.length < 2) {
        throw new GraphQLError('A conversation requires at least 2 participants')
      }

      // Check all participants can be messaged
      for (const participantId of participantIds) {
        if (participantId !== context.userId!) {
          const { allowed, reason } = await canMessage(context.userId!, participantId)
          if (!allowed) {
            throw new GraphQLError(`Cannot message user: ${reason}`)
          }
        }
      }

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title: input.title,
          is_group: true,
          created_by: context.userId!,
        })
        .select()
        .single()

      if (convError || !conversation) {
        console.error('[Messaging] Error creating conversation:', convError)
        throw new GraphQLError('Failed to create conversation')
      }

      // Add participants
      const participants = participantIds.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
        role: userId === context.userId! ? 'admin' : 'member',
      }))

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants)

      if (partError) {
        console.error('[Messaging] Error adding participants:', partError)
        // Cleanup
        await supabase.from('conversations').delete().eq('id', conversation.id)
        throw new GraphQLError('Failed to add participants')
      }

      // Send initial message if provided
      if (input.initial_message) {
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender_id: context.userId!,
          content: input.initial_message,
          content_type: 'text',
        })
      }

      return {
        ...conversation,
        my_unread_count: 0,
        is_muted: false,
        is_archived: false,
      }
    },

    // Update conversation settings
    updateConversation: async (
      _: unknown,
      args: {
        id: string
        input: {
          title?: string
          is_muted?: boolean
          is_archived?: boolean
          nickname?: string
        }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Verify participant
      if (!(await isParticipant(args.id, context.userId!))) {
        throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } })
      }

      // Update participant-level settings
      if (
        args.input.is_muted !== undefined ||
        args.input.is_archived !== undefined ||
        args.input.nickname !== undefined
      ) {
        const updates: Record<string, any> = {}
        if (args.input.is_muted !== undefined) updates.is_muted = args.input.is_muted
        if (args.input.is_archived !== undefined) updates.is_archived = args.input.is_archived
        if (args.input.nickname !== undefined) updates.nickname = args.input.nickname

        await supabase
          .from('conversation_participants')
          .update(updates)
          .eq('conversation_id', args.id)
          .eq('user_id', context.userId!)
      }

      // Update conversation-level settings (title - for groups only)
      if (args.input.title !== undefined) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('is_group')
          .eq('id', args.id)
          .single()

        if (conv?.is_group) {
          await supabase
            .from('conversations')
            .update({ title: args.input.title, updated_at: new Date().toISOString() })
            .eq('id', args.id)
        }
      }

      // Return updated conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', args.id)
        .single()

      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('is_muted, is_archived, unread_count')
        .eq('conversation_id', args.id)
        .eq('user_id', context.userId!)
        .single()

      return {
        ...conversation,
        my_unread_count: participant?.unread_count || 0,
        is_muted: participant?.is_muted || false,
        is_archived: participant?.is_archived || false,
      }
    },

    // Leave conversation
    leaveConversation: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { error } = await supabase
        .from('conversation_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('conversation_id', args.id)
        .eq('user_id', context.userId!)
        .is('left_at', null)

      if (error) {
        console.error('[Messaging] Error leaving conversation:', error)
        throw new GraphQLError('Failed to leave conversation')
      }

      return true
    },

    // Delete conversation (marks as left for user)
    deleteConversation: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // For now, just mark as left and archived
      const { error } = await supabase
        .from('conversation_participants')
        .update({
          left_at: new Date().toISOString(),
          is_archived: true,
        })
        .eq('conversation_id', args.id)
        .eq('user_id', context.userId!)

      if (error) {
        console.error('[Messaging] Error deleting conversation:', error)
        throw new GraphQLError('Failed to delete conversation')
      }

      return true
    },

    // Add participants to group
    addParticipants: async (
      _: unknown,
      args: {
        input: { conversation_id: string; user_ids: string[] }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Verify is group and user is admin
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('role, conversations!inner(is_group)')
        .eq('conversation_id', args.input.conversation_id)
        .eq('user_id', context.userId!)
        .is('left_at', null)
        .single()

      if (!participant || !(participant.conversations as any).is_group) {
        throw new GraphQLError('Cannot add participants to this conversation')
      }

      if (participant.role !== 'admin') {
        throw new GraphQLError('Only admins can add participants')
      }

      // Check each user can be messaged
      for (const userId of args.input.user_ids) {
        const { allowed, reason } = await canMessage(context.userId!, userId)
        if (!allowed) {
          throw new GraphQLError(`Cannot add user: ${reason}`)
        }
      }

      // Add participants
      const newParticipants = args.input.user_ids.map(userId => ({
        conversation_id: args.input.conversation_id,
        user_id: userId,
        role: 'member',
      }))

      await supabase
        .from('conversation_participants')
        .upsert(newParticipants, { onConflict: 'conversation_id,user_id' })

      // Return updated conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', args.input.conversation_id)
        .single()

      return {
        ...conversation,
        my_unread_count: 0,
        is_muted: false,
        is_archived: false,
      }
    },

    // Remove participant from group
    removeParticipant: async (
      _: unknown,
      args: {
        conversation_id: string
        user_id: string
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Verify caller is admin
      const { data: callerParticipant } = await supabase
        .from('conversation_participants')
        .select('role')
        .eq('conversation_id', args.conversation_id)
        .eq('user_id', context.userId!)
        .is('left_at', null)
        .single()

      if (!callerParticipant || callerParticipant.role !== 'admin') {
        throw new GraphQLError('Only admins can remove participants')
      }

      // Remove participant
      await supabase
        .from('conversation_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('conversation_id', args.conversation_id)
        .eq('user_id', args.user_id)
        .is('left_at', null)

      // Return conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', args.conversation_id)
        .single()

      return {
        ...conversation,
        my_unread_count: 0,
        is_muted: false,
        is_archived: false,
      }
    },

    // Promote to admin
    promoteToAdmin: async (
      _: unknown,
      args: {
        conversation_id: string
        user_id: string
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Verify caller is admin
      const { data: callerParticipant } = await supabase
        .from('conversation_participants')
        .select('role')
        .eq('conversation_id', args.conversation_id)
        .eq('user_id', context.userId!)
        .is('left_at', null)
        .single()

      if (!callerParticipant || callerParticipant.role !== 'admin') {
        throw new GraphQLError('Only admins can promote users')
      }

      // Promote
      await supabase
        .from('conversation_participants')
        .update({ role: 'admin' })
        .eq('conversation_id', args.conversation_id)
        .eq('user_id', args.user_id)
        .is('left_at', null)

      // Return conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', args.conversation_id)
        .single()

      return {
        ...conversation,
        my_unread_count: 0,
        is_muted: false,
        is_archived: false,
      }
    },

    // Send message
    sendMessage: async (
      _: unknown,
      args: {
        input: {
          conversation_id: string
          content: string
          content_type?: string
          media_url?: string
          media_type?: string
          reply_to_id?: string
          metadata?: any
        }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { input } = args

      // Verify participant
      if (!(await isParticipant(input.conversation_id, context.userId!))) {
        throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } })
      }

      // Validate content
      if (!input.content.trim()) {
        throw new GraphQLError('Message content cannot be empty')
      }

      // Insert message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: input.conversation_id,
          sender_id: context.userId!,
          content: input.content.trim(),
          content_type: input.content_type || 'text',
          media_url: input.media_url,
          media_type: input.media_type,
          reply_to_id: input.reply_to_id,
          metadata: input.metadata,
        })
        .select()
        .single()

      if (error || !message) {
        console.error('[Messaging] Error sending message:', error)
        throw new GraphQLError('Failed to send message')
      }

      return message
    },

    // Update message
    updateMessage: async (
      _: unknown,
      args: {
        id: string
        input: { content: string }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Verify ownership
      const { data: existing } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', args.id)
        .eq('is_deleted', false)
        .single()

      if (!existing || existing.sender_id !== context.userId!) {
        throw new GraphQLError('Message not found or not owned by you')
      }

      // Update
      const { data: message, error } = await supabase
        .from('messages')
        .update({
          content: args.input.content.trim(),
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', args.id)
        .select()
        .single()

      if (error || !message) {
        console.error('[Messaging] Error updating message:', error)
        throw new GraphQLError('Failed to update message')
      }

      return message
    },

    // Delete message
    deleteMessage: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Verify ownership
      const { data: existing } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', args.id)
        .eq('is_deleted', false)
        .single()

      if (!existing || existing.sender_id !== context.userId!) {
        throw new GraphQLError('Message not found or not owned by you')
      }

      // Soft delete
      const { error } = await supabase
        .from('messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', args.id)

      if (error) {
        console.error('[Messaging] Error deleting message:', error)
        throw new GraphQLError('Failed to delete message')
      }

      return true
    },

    // Mark conversation as read
    markConversationRead: async (
      _: unknown,
      args: { conversation_id: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Use database function
      const { error } = await supabase.rpc('mark_conversation_read', {
        conv_id: args.conversation_id,
        reader_id: context.userId!,
      })

      if (error) {
        console.error('[Messaging] Error marking read:', error)
        throw new GraphQLError('Failed to mark conversation as read')
      }

      // Return updated conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', args.conversation_id)
        .single()

      return {
        ...conversation,
        my_unread_count: 0,
        is_muted: false,
        is_archived: false,
      }
    },

    // Mark single message as read
    markMessageRead: async (_: unknown, args: { message_id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Insert read status
      await supabase.from('message_read_status').upsert(
        {
          message_id: args.message_id,
          user_id: context.userId!,
        },
        { onConflict: 'message_id,user_id' },
      )

      const { data: message } = await supabase
        .from('messages')
        .select('*')
        .eq('id', args.message_id)
        .single()

      return message
    },

    // Add reaction
    addReaction: async (
      _: unknown,
      args: { message_id: string; emoji: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Verify can access message
      const { data: message } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('id', args.message_id)
        .eq('is_deleted', false)
        .single()

      if (!message || !(await isParticipant(message.conversation_id, context.userId!))) {
        throw new GraphQLError('Message not found')
      }

      // Add reaction
      await supabase.from('message_reactions').upsert(
        {
          message_id: args.message_id,
          user_id: context.userId!,
          emoji: args.emoji,
        },
        { onConflict: 'message_id,user_id,emoji' },
      )

      const { data: updatedMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('id', args.message_id)
        .single()

      return updatedMessage
    },

    // Remove reaction
    removeReaction: async (
      _: unknown,
      args: { message_id: string; emoji: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', args.message_id)
        .eq('user_id', context.userId!)
        .eq('emoji', args.emoji)

      const { data: message } = await supabase
        .from('messages')
        .select('*')
        .eq('id', args.message_id)
        .single()

      return message
    },

    // Block user
    blockUser: async (
      _: unknown,
      args: { user_id: string; reason?: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      if (args.user_id === context.userId!) {
        throw new GraphQLError('Cannot block yourself')
      }

      const { data: block, error } = await supabase
        .from('user_blocks')
        .upsert(
          {
            blocker_id: context.userId!,
            blocked_id: args.user_id,
            reason: args.reason,
          },
          { onConflict: 'blocker_id,blocked_id' },
        )
        .select()
        .single()

      if (error) {
        console.error('[Messaging] Error blocking user:', error)
        throw new GraphQLError('Failed to block user')
      }

      return block
    },

    // Unblock user
    unblockUser: async (_: unknown, args: { user_id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', context.userId!)
        .eq('blocked_id', args.user_id)

      if (error) {
        console.error('[Messaging] Error unblocking user:', error)
        throw new GraphQLError('Failed to unblock user')
      }

      return true
    },
  },

  // Field resolvers
  Conversation: {
    participants: async (parent: any) => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', parent.id)
        .is('left_at', null)
        .order('joined_at', { ascending: true })

      return data || []
    },

    participant_count: async (parent: any) => {
      const { count } = await supabase
        .from('conversation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', parent.id)
        .is('left_at', null)

      return count || 0
    },

    last_message: async (parent: any) => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', parent.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return data
    },

    created_by: async (parent: any) => {
      if (!parent.created_by) return null

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single()

      return data
    },
  },

  ConversationParticipant: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single()

      return data
    },
  },

  Message: {
    sender: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.sender_id)
        .single()

      return data
    },

    reply_to: async (parent: any) => {
      if (!parent.reply_to_id) return null

      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('id', parent.reply_to_id)
        .single()

      return data
    },

    reactions: async (parent: any) => {
      const { data } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', parent.id)
        .order('created_at', { ascending: true })

      return data || []
    },

    reaction_counts: async (parent: any) => {
      const { data } = await supabase
        .from('message_reactions')
        .select('emoji')
        .eq('message_id', parent.id)

      if (!data) return {}

      const counts: Record<string, number> = {}
      for (const r of data) {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1
      }
      return counts
    },

    read_by_count: async (parent: any) => {
      const { count } = await supabase
        .from('message_read_status')
        .select('*', { count: 'exact', head: true })
        .eq('message_id', parent.id)

      return count || 0
    },

    is_read_by_me: async (parent: any, _: unknown, context: GraphQLContext) => {
      if (!context.userId) return false

      // Sender has always "read" their own message
      if (parent.sender_id === context.userId!) return true

      const { data } = await supabase
        .from('message_read_status')
        .select('id')
        .eq('message_id', parent.id)
        .eq('user_id', context.userId!)
        .single()

      return !!data
    },
  },

  MessageReaction: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single()

      return data
    },
  },

  UserBlock: {
    blocked_user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parent.blocked_id)
        .single()

      return data
    },
  },
}
