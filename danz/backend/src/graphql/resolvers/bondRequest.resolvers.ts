import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

// Helper to get user info
async function getUser(userId: string) {
  const { data } = await supabase.from('users').select('*').eq('id', userId).single()
  return data
}

// Helper to calculate similarity between two users
async function calculateSimilarity(user1: string, user2: string) {
  // Get mutual bonds
  const { data: bonds1 } = await supabase
    .from('dance_bonds')
    .select('user1_id, user2_id')
    .or(`user1_id.eq.${user1},user2_id.eq.${user1}`)

  const { data: bonds2 } = await supabase
    .from('dance_bonds')
    .select('user1_id, user2_id')
    .or(`user1_id.eq.${user2},user2_id.eq.${user2}`)

  const set1 = new Set(
    (bonds1 || []).flatMap(b => [b.user1_id, b.user2_id]).filter(id => id !== user1),
  )
  const set2 = new Set(
    (bonds2 || []).flatMap(b => [b.user1_id, b.user2_id]).filter(id => id !== user2),
  )

  let mutualBonds = 0
  for (const id of set1) {
    if (set2.has(id)) mutualBonds++
  }

  // Get same events
  const { data: events1 } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq('user_id', user1)

  const { data: events2 } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq('user_id', user2)

  const eventSet1 = new Set((events1 || []).map(e => e.event_id))
  const eventSet2 = new Set((events2 || []).map(e => e.event_id))

  let sameEvents = 0
  for (const id of eventSet1) {
    if (eventSet2.has(id)) sameEvents++
  }

  // Get users for music/styles
  const { data: userInfo1 } = await supabase
    .from('users')
    .select('interests, dance_styles')
    .eq('id', user1)
    .single()

  const { data: userInfo2 } = await supabase
    .from('users')
    .select('interests, dance_styles')
    .eq('id', user2)
    .single()

  // Music overlap
  const music1 = (userInfo1?.interests as any)?.music || []
  const music2 = (userInfo2?.interests as any)?.music || []
  const musicOverlap = music1.filter((m: string) => music2.includes(m))

  // Dance style overlap
  const styles1 = userInfo1?.dance_styles || []
  const styles2 = userInfo2?.dance_styles || []
  const styleOverlap = styles1.filter((s: string) => styles2.includes(s))

  // Calculate score
  const score =
    (Math.min(mutualBonds, 10) * 0.3) / 10 +
    (Math.min(sameEvents, 5) * 0.25) / 5 +
    (Math.min(musicOverlap.length, 5) * 0.25) / 5 +
    (Math.min(styleOverlap.length, 3) * 0.2) / 3

  return {
    mutual_bonds: mutualBonds,
    same_events: sameEvents,
    music_overlap: musicOverlap,
    dance_styles: styleOverlap,
    similarity_score: Math.round(score * 100) / 100,
  }
}

// Check if user can send bond request
async function canSendRequest(senderId: string, recipientId: string) {
  // Check if same user
  if (senderId === recipientId) {
    return { can_send: false, reason: 'cannot_request_self' }
  }

  // Check if already bonded
  const { data: existingBond } = await supabase
    .from('dance_bonds')
    .select('id')
    .or(
      `and(user1_id.eq.${senderId},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${senderId})`,
    )
    .limit(1)

  if (existingBond && existingBond.length > 0) {
    return { can_send: false, reason: 'already_bonded' }
  }

  // Check for existing pending request
  const { data: pendingRequest } = await supabase
    .from('bond_requests')
    .select('id')
    .eq('status', 'pending')
    .or(
      `and(requester_id.eq.${senderId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${senderId})`,
    )
    .limit(1)

  if (pendingRequest && pendingRequest.length > 0) {
    return { can_send: false, reason: 'pending_request_exists' }
  }

  // Check recipient's privacy settings
  const { data: settings } = await supabase
    .from('user_privacy_settings')
    .select('allow_bond_requests')
    .eq('user_id', recipientId)
    .single()

  const allowBondRequests = settings?.allow_bond_requests || 'everyone'

  if (allowBondRequests === 'none') {
    return { can_send: false, reason: 'recipient_not_accepting' }
  }

  if (allowBondRequests === 'mutual_events') {
    // Check if they've attended same event
    const { data: senderEvents } = await supabase
      .from('event_registrations')
      .select('event_id')
      .eq('user_id', senderId)

    if (senderEvents && senderEvents.length > 0) {
      const eventIds = senderEvents.map(e => e.event_id)
      const { data: recipientEvents } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('user_id', recipientId)
        .in('event_id', eventIds)
        .limit(1)

      if (!recipientEvents || recipientEvents.length === 0) {
        return { can_send: false, reason: 'no_mutual_events' }
      }
    } else {
      return { can_send: false, reason: 'no_mutual_events' }
    }
  }

  return { can_send: true, reason: null }
}

export const bondRequestResolvers = {
  Query: {
    // Get pending bond requests received
    myPendingBondRequests: async (
      _: unknown,
      args: { limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const limit = Math.min(args.limit || 20, 50)
      const offset = args.offset || 0

      const { data, error } = await supabase
        .from('bond_requests')
        .select('*')
        .eq('recipient_id', context.userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('[BondRequest] Error fetching pending requests:', error)
        throw new GraphQLError('Failed to fetch bond requests')
      }

      return data || []
    },

    // Get bond requests sent by me
    mySentBondRequests: async (
      _: unknown,
      args: { limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const limit = Math.min(args.limit || 20, 50)
      const offset = args.offset || 0

      const { data, error } = await supabase
        .from('bond_requests')
        .select('*')
        .eq('requester_id', context.userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('[BondRequest] Error fetching sent requests:', error)
        throw new GraphQLError('Failed to fetch bond requests')
      }

      return data || []
    },

    // Get a specific bond request
    bondRequest: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { data, error } = await supabase
        .from('bond_requests')
        .select('*')
        .eq('id', args.id)
        .or(`requester_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
        .single()

      if (error) {
        console.error('[BondRequest] Error fetching request:', error)
        return null
      }

      return data
    },

    // Check if I can send a bond request to a user
    canSendBondRequestTo: async (
      _: unknown,
      args: { user_id: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const check = await canSendRequest(context.userId, args.user_id)

      if (!check.can_send) {
        return {
          can_send: false,
          reason: check.reason,
          match_reasons: null,
        }
      }

      // Get similarity data
      const matchReasons = await calculateSimilarity(context.userId, args.user_id)

      return {
        can_send: true,
        reason: null,
        match_reasons: matchReasons,
      }
    },

    // Get similarity/match data with another user
    getSimilarityWith: async (_: unknown, args: { user_id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      return calculateSimilarity(context.userId, args.user_id)
    },

    // Get bond request stats
    myBondRequestStats: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Pending sent
      const { count: pendingSent } = await supabase
        .from('bond_requests')
        .select('*', { count: 'exact', head: true })
        .eq('requester_id', context.userId)
        .eq('status', 'pending')

      // Pending received
      const { count: pendingReceived } = await supabase
        .from('bond_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', context.userId)
        .eq('status', 'pending')

      // Total bonds
      const { count: totalBonds } = await supabase
        .from('dance_bonds')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${context.userId},user2_id.eq.${context.userId}`)

      // Acceptance rate
      const { count: totalSent } = await supabase
        .from('bond_requests')
        .select('*', { count: 'exact', head: true })
        .eq('requester_id', context.userId)
        .in('status', ['accepted', 'rejected'])

      const { count: accepted } = await supabase
        .from('bond_requests')
        .select('*', { count: 'exact', head: true })
        .eq('requester_id', context.userId)
        .eq('status', 'accepted')

      const acceptanceRate = totalSent && totalSent > 0 ? (accepted || 0) / totalSent : null

      return {
        pending_sent: pendingSent || 0,
        pending_received: pendingReceived || 0,
        total_bonds: totalBonds || 0,
        acceptance_rate: acceptanceRate,
      }
    },
  },

  Mutation: {
    // Send a bond request
    sendBondRequest: async (
      _: unknown,
      args: {
        input: {
          recipient_id: string
          message?: string
        }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { recipient_id, message } = args.input

      // Check if can send
      const check = await canSendRequest(context.userId, recipient_id)
      if (!check.can_send) {
        throw new GraphQLError(`Cannot send bond request: ${check.reason}`, {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      // Calculate match reasons
      const matchReasons = await calculateSimilarity(context.userId, recipient_id)

      // Create request
      const { data, error } = await supabase
        .from('bond_requests')
        .insert({
          requester_id: context.userId,
          recipient_id,
          message,
          match_reasons: matchReasons,
        })
        .select()
        .single()

      if (error) {
        console.error('[BondRequest] Error creating request:', error)
        throw new GraphQLError('Failed to send bond request')
      }

      return data
    },

    // Accept or reject a bond request
    respondToBondRequest: async (
      _: unknown,
      args: {
        input: {
          request_id: string
          accept: boolean
        }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { request_id, accept } = args.input

      // Get the request
      const { data: request, error: fetchError } = await supabase
        .from('bond_requests')
        .select('*')
        .eq('id', request_id)
        .eq('recipient_id', context.userId)
        .eq('status', 'pending')
        .single()

      if (fetchError || !request) {
        throw new GraphQLError('Bond request not found or already responded', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Update status (the trigger will handle creating the bond if accepted)
      const newStatus = accept ? 'accepted' : 'rejected'

      const { data, error } = await supabase
        .from('bond_requests')
        .update({ status: newStatus })
        .eq('id', request_id)
        .select()
        .single()

      if (error) {
        console.error('[BondRequest] Error responding to request:', error)
        throw new GraphQLError('Failed to respond to bond request')
      }

      return data
    },

    // Cancel a pending request I sent
    cancelBondRequest: async (
      _: unknown,
      args: { request_id: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { error } = await supabase
        .from('bond_requests')
        .update({ status: 'cancelled' })
        .eq('id', args.request_id)
        .eq('requester_id', context.userId)
        .eq('status', 'pending')

      if (error) {
        console.error('[BondRequest] Error cancelling request:', error)
        throw new GraphQLError('Failed to cancel bond request')
      }

      return true
    },
  },

  // Field resolvers
  BondRequest: {
    requester: async (parent: any) => {
      return getUser(parent.requester_id)
    },
    recipient: async (parent: any) => {
      return getUser(parent.recipient_id)
    },
    match_reasons: (parent: any) => {
      if (!parent.match_reasons) return null
      const mr = parent.match_reasons
      return {
        mutual_bonds: mr.mutual_bonds || 0,
        same_events: mr.same_events || 0,
        music_overlap: mr.music_overlap || [],
        dance_styles: mr.dance_styles || [],
        similarity_score: mr.similarity_score || 0,
      }
    },
  },
}
