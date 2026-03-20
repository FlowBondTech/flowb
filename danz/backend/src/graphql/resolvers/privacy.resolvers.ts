import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

// Privacy presets configuration
const PRIVACY_PRESETS = {
  open: {
    profile_visibility: 'public',
    searchable_by_username: true,
    appear_in_suggestions: true,
    appear_in_event_attendees: true,
    allow_messages: 'everyone',
    allow_bond_requests: 'everyone',
    show_events_attending: true,
    show_events_attended: true,
    show_leaderboard_rank: true,
  },
  social: {
    profile_visibility: 'public',
    searchable_by_username: true,
    appear_in_suggestions: true,
    appear_in_event_attendees: true,
    allow_messages: 'bonds_only',
    allow_bond_requests: 'everyone',
    show_events_attending: true,
    show_events_attended: true,
    show_leaderboard_rank: true,
  },
  selective: {
    profile_visibility: 'bonds_only',
    searchable_by_username: true,
    appear_in_suggestions: true,
    appear_in_event_attendees: true,
    allow_messages: 'bonds_only',
    allow_bond_requests: 'mutual_events',
    show_events_attending: false,
    show_events_attended: true,
    show_leaderboard_rank: true,
  },
  private_mode: {
    profile_visibility: 'bonds_only',
    searchable_by_username: false,
    appear_in_suggestions: false,
    appear_in_event_attendees: false,
    allow_messages: 'bonds_only',
    allow_bond_requests: 'none',
    show_events_attending: false,
    show_events_attended: false,
    show_leaderboard_rank: false,
  },
  ghost: {
    profile_visibility: 'private',
    searchable_by_username: false,
    appear_in_suggestions: false,
    appear_in_event_attendees: false,
    allow_messages: 'none',
    allow_bond_requests: 'none',
    show_events_attending: false,
    show_events_attended: false,
    show_leaderboard_rank: false,
    show_check_ins: false,
    show_posts: false,
    show_likes: false,
    show_comments: false,
  },
}

// Helper to check if users have a bond
async function areBonds(userId1: string, userId2: string): Promise<boolean> {
  const { data } = await supabase
    .from('dance_bonds')
    .select('id')
    .eq('status', 'accepted')
    .or(
      `and(requester_id.eq.${userId1},recipient_id.eq.${userId2}),and(requester_id.eq.${userId2},recipient_id.eq.${userId1})`,
    )
    .limit(1)

  return (data?.length ?? 0) > 0
}

// Helper to get mutual bonds count
async function getMutualBondsCount(userId1: string, userId2: string): Promise<number> {
  // Get friends of user1
  const { data: friends1 } = await supabase
    .from('dance_bonds')
    .select('requester_id, recipient_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId1},recipient_id.eq.${userId1}`)

  // Get friends of user2
  const { data: friends2 } = await supabase
    .from('dance_bonds')
    .select('requester_id, recipient_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId2},recipient_id.eq.${userId2}`)

  if (!friends1 || !friends2) return 0

  const set1 = new Set(
    friends1.flatMap(f => [f.requester_id, f.recipient_id]).filter(id => id !== userId1),
  )
  const set2 = new Set(
    friends2.flatMap(f => [f.requester_id, f.recipient_id]).filter(id => id !== userId2),
  )

  let count = 0
  for (const id of set1) {
    if (set2.has(id)) count++
  }
  return count
}

export const privacyResolvers = {
  Query: {
    // Get current user's privacy settings
    myPrivacySettings: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', context.userId)
        .single()

      if (error || !data) {
        // Create default settings if not exists
        const { data: newSettings, error: createError } = await supabase
          .from('user_privacy_settings')
          .insert({ user_id: context.userId })
          .select()
          .single()

        if (createError) {
          console.error('[Privacy] Error creating settings:', createError)
          throw new GraphQLError('Failed to get privacy settings')
        }
        return newSettings
      }

      return data
    },

    // Get privacy presets
    privacyPresets: () => [
      {
        name: 'open',
        description: 'Open: Public profile, everyone can find and message you',
        profile_visibility: 'public',
        searchable: true,
        appear_in_suggestions: true,
        allow_messages: 'everyone',
      },
      {
        name: 'social',
        description: 'Social: Public profile, only your bonds can message you',
        profile_visibility: 'public',
        searchable: true,
        appear_in_suggestions: true,
        allow_messages: 'bonds_only',
      },
      {
        name: 'selective',
        description: 'Selective: Only bonds see your full profile, appear in suggestions',
        profile_visibility: 'bonds_only',
        searchable: true,
        appear_in_suggestions: true,
        allow_messages: 'bonds_only',
      },
      {
        name: 'private_mode',
        description: 'Private: Hidden from search, no suggestions, bonds-only messages',
        profile_visibility: 'bonds_only',
        searchable: false,
        appear_in_suggestions: false,
        allow_messages: 'bonds_only',
      },
      {
        name: 'ghost',
        description: 'Ghost: Completely hidden, no interactions possible',
        profile_visibility: 'private',
        searchable: false,
        appear_in_suggestions: false,
        allow_messages: 'none',
      },
    ],

    // Get suggested users
    suggestedUsers: async (
      _: unknown,
      args: { limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const limit = Math.min(args.limit || 10, 50)
      const offset = args.offset || 0

      // Get suggestions
      const { data, error, count } = await supabase
        .from('user_suggestions')
        .select('*, users!suggested_user_id(*)', { count: 'exact' })
        .eq('user_id', context.userId)
        .eq('is_dismissed', false)
        .gt('expires_at', new Date().toISOString())
        .order('score', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('[Privacy] Error fetching suggestions:', error)
        throw new GraphQLError('Failed to fetch suggestions')
      }

      return {
        suggestions: (data || []).map(s => ({
          id: s.id,
          user: s.users,
          source: s.source,
          score: s.score,
          reason: s.reason,
          created_at: s.created_at,
        })),
        total_count: count || 0,
        has_more: (data?.length || 0) === limit,
      }
    },

    // Search users
    searchUsers: async (
      _: unknown,
      args: {
        input: {
          query: string
          limit?: number
          offset?: number
          messageable_only?: boolean
        }
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { query, limit = 20, offset = 0, messageable_only } = args.input
      const searchLimit = Math.min(limit, 50)

      if (!query || query.trim().length < 2) {
        throw new GraphQLError('Search query must be at least 2 characters')
      }

      // Search users who are searchable
      const queryBuilder = supabase
        .from('users')
        .select(
          `
          *,
          user_privacy_settings!inner(*)
        `,
          { count: 'exact' },
        )
        .eq('user_privacy_settings.searchable_by_username', true)
        .neq('privy_id', context.userId)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .order('total_points', { ascending: false })
        .range(offset, offset + searchLimit - 1)

      const { data, error, count } = await queryBuilder

      if (error) {
        console.error('[Privacy] Error searching users:', error)
        throw new GraphQLError('Failed to search users')
      }

      // Log search
      await supabase.from('user_search_history').insert({
        user_id: context.userId,
        searched_username: query,
        found: (data?.length || 0) > 0,
      })

      // Build results with privacy info
      const results = await Promise.all(
        (data || []).map(async user => {
          const settings = user.user_privacy_settings
          const isBond = await areBonds(context.userId!, user.privy_id)
          const mutualCount = await getMutualBondsCount(context.userId!, user.privy_id)

          // Determine if can view profile
          let canViewProfile = true
          if (settings.profile_visibility === 'private') {
            canViewProfile = false
          } else if (settings.profile_visibility === 'bonds_only') {
            canViewProfile = isBond
          }

          // Determine if can message
          let canMessage = true
          if (settings.allow_messages === 'none') {
            canMessage = false
          } else if (settings.allow_messages === 'bonds_only') {
            canMessage = isBond
          }

          // Filter if messageable_only
          if (messageable_only && !canMessage) {
            return null
          }

          return {
            user: {
              ...user,
              user_privacy_settings: undefined, // Don't expose settings
            },
            can_view_profile: canViewProfile,
            can_message: canMessage,
            is_bond: isBond,
            mutual_bonds_count: mutualCount,
          }
        }),
      )

      const filteredResults = results.filter(r => r !== null)

      return {
        results: filteredResults,
        total_count: count || 0,
        has_more: filteredResults.length === searchLimit,
      }
    },

    // Can view profile
    canViewProfile: async (_: unknown, args: { user_id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      if (args.user_id === context.userId) {
        return { can_view: true, reason: 'This is your profile' }
      }

      const { data: settings } = await supabase
        .from('user_privacy_settings')
        .select('profile_visibility')
        .eq('user_id', args.user_id)
        .single()

      if (!settings || settings.profile_visibility === 'public') {
        return { can_view: true, reason: 'Profile is public' }
      }

      if (settings.profile_visibility === 'private') {
        return { can_view: false, reason: 'This user has a private profile' }
      }

      // bonds_only
      const isBond = await areBonds(context.userId, args.user_id)
      if (isBond) {
        return { can_view: true, reason: 'You are connected' }
      }

      return { can_view: false, reason: 'This user only shares their profile with connections' }
    },

    // Can message user
    canMessageUser: async (_: unknown, args: { user_id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      if (args.user_id === context.userId) {
        return { can_view: false, reason: 'Cannot message yourself' }
      }

      // Check blocks
      const { data: block } = await supabase
        .from('user_blocks')
        .select('id')
        .or(
          `and(blocker_id.eq.${context.userId},blocked_id.eq.${args.user_id}),and(blocker_id.eq.${args.user_id},blocked_id.eq.${context.userId})`,
        )
        .limit(1)

      if (block && block.length > 0) {
        return { can_view: false, reason: 'Cannot message this user' }
      }

      // Check settings
      const { data: settings } = await supabase
        .from('user_privacy_settings')
        .select('allow_messages')
        .eq('user_id', args.user_id)
        .single()

      if (!settings || settings.allow_messages === 'everyone') {
        return { can_view: true, reason: 'User accepts messages from everyone' }
      }

      if (settings.allow_messages === 'none') {
        return { can_view: false, reason: 'This user has disabled messages' }
      }

      // bonds_only
      const isBond = await areBonds(context.userId, args.user_id)
      if (isBond) {
        return { can_view: true, reason: 'You are connected' }
      }

      return { can_view: false, reason: 'This user only accepts messages from connections' }
    },

    // Can send bond request
    canSendBondRequest: async (_: unknown, args: { user_id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      if (args.user_id === context.userId) {
        return { can_view: false, reason: 'Cannot connect with yourself' }
      }

      // Check if already bonds
      if (await areBonds(context.userId, args.user_id)) {
        return { can_view: false, reason: 'Already connected' }
      }

      // Check pending request
      const { data: pending } = await supabase
        .from('dance_bonds')
        .select('id')
        .eq('status', 'pending')
        .or(
          `and(requester_id.eq.${context.userId},recipient_id.eq.${args.user_id}),and(requester_id.eq.${args.user_id},recipient_id.eq.${context.userId})`,
        )
        .limit(1)

      if (pending && pending.length > 0) {
        return { can_view: false, reason: 'Connection request already pending' }
      }

      // Check settings
      const { data: settings } = await supabase
        .from('user_privacy_settings')
        .select('allow_bond_requests')
        .eq('user_id', args.user_id)
        .single()

      if (!settings || settings.allow_bond_requests === 'everyone') {
        return { can_view: true, reason: 'User accepts connection requests' }
      }

      if (settings.allow_bond_requests === 'none') {
        return { can_view: false, reason: 'This user is not accepting connection requests' }
      }

      // mutual_events - check if attended same event
      const { data: sharedEvents } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', context.userId)
        .in('status', ['registered', 'checked_in'])

      if (sharedEvents && sharedEvents.length > 0) {
        const eventIds = sharedEvents.map(e => e.event_id)
        const { data: otherReg } = await supabase
          .from('event_registrations')
          .select('id')
          .eq('user_id', args.user_id)
          .in('event_id', eventIds)
          .in('status', ['registered', 'checked_in'])
          .limit(1)

        if (otherReg && otherReg.length > 0) {
          return { can_view: true, reason: 'You attended the same event' }
        }
      }

      return {
        can_view: false,
        reason: 'This user only accepts requests from people at mutual events',
      }
    },

    // Get bonds list
    myBonds: async (
      _: unknown,
      args: { limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const limit = Math.min(args.limit || 50, 100)
      const offset = args.offset || 0

      // Get bond user IDs
      const { data: bonds } = await supabase
        .from('dance_bonds')
        .select('requester_id, recipient_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
        .range(offset, offset + limit - 1)

      if (!bonds || bonds.length === 0) {
        return []
      }

      const bondUserIds = bonds.map(b =>
        b.requester_id === context.userId ? b.recipient_id : b.requester_id,
      )

      const { data: users } = await supabase.from('users').select('*').in('privy_id', bondUserIds)

      return users || []
    },

    // Leaderboard near me
    leaderboardNearMe: async (_: unknown, args: { range?: number }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const range = Math.min(args.range || 5, 10)

      // Get user's points
      const { data: me } = await supabase
        .from('users')
        .select('total_points')
        .eq('privy_id', context.userId)
        .single()

      if (!me) {
        return []
      }

      // Get users with similar points who show on leaderboard
      const { data: nearby } = await supabase
        .from('users')
        .select(`
          *,
          user_privacy_settings!inner(show_leaderboard_rank)
        `)
        .eq('user_privacy_settings.show_leaderboard_rank', true)
        .gte('total_points', Math.max(0, me.total_points - 500))
        .lte('total_points', me.total_points + 500)
        .neq('privy_id', context.userId)
        .order('total_points', { ascending: false })
        .limit(range * 2)

      return (nearby || []).map(u => ({
        ...u,
        user_privacy_settings: undefined,
      }))
    },

    // Users at event
    usersAtEvent: async (_: unknown, args: { event_id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Get registrations for this event where user allows appearing
      const { data } = await supabase
        .from('event_registrations')
        .select(`
          users!inner(
            *,
            user_privacy_settings(appear_in_event_attendees)
          )
        `)
        .eq('event_id', args.event_id)
        .in('status', ['registered', 'checked_in'])
        .neq('user_id', context.userId)
        .limit(50)

      return (data || [])
        .filter((r: any) => r.users?.user_privacy_settings?.appear_in_event_attendees !== false)
        .map((r: any) => ({
          ...r.users,
          user_privacy_settings: undefined,
        }))
    },
  },

  Mutation: {
    // Update privacy settings
    updatePrivacySettings: async (
      _: unknown,
      args: { input: Record<string, any> },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { data, error } = await supabase
        .from('user_privacy_settings')
        .update({
          ...args.input,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', context.userId)
        .select()
        .single()

      if (error) {
        console.error('[Privacy] Error updating settings:', error)
        throw new GraphQLError('Failed to update privacy settings')
      }

      return data
    },

    // Apply privacy preset
    applyPrivacyPreset: async (
      _: unknown,
      args: { preset: keyof typeof PRIVACY_PRESETS },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const presetSettings = PRIVACY_PRESETS[args.preset]
      if (!presetSettings) {
        throw new GraphQLError('Invalid preset')
      }

      const { data, error } = await supabase
        .from('user_privacy_settings')
        .update({
          ...presetSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', context.userId)
        .select()
        .single()

      if (error) {
        console.error('[Privacy] Error applying preset:', error)
        throw new GraphQLError('Failed to apply privacy preset')
      }

      return data
    },

    // Reset to defaults
    resetPrivacyToDefaults: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Delete and recreate with defaults
      await supabase.from('user_privacy_settings').delete().eq('user_id', context.userId)

      const { data, error } = await supabase
        .from('user_privacy_settings')
        .insert({ user_id: context.userId })
        .select()
        .single()

      if (error) {
        console.error('[Privacy] Error resetting settings:', error)
        throw new GraphQLError('Failed to reset privacy settings')
      }

      return data
    },

    // Dismiss suggestion
    dismissSuggestion: async (
      _: unknown,
      args: { suggestion_id: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { error } = await supabase
        .from('user_suggestions')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', args.suggestion_id)
        .eq('user_id', context.userId)

      if (error) {
        console.error('[Privacy] Error dismissing suggestion:', error)
        throw new GraphQLError('Failed to dismiss suggestion')
      }

      return true
    },

    // Dismiss all suggestions
    dismissAllSuggestions: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { error } = await supabase
        .from('user_suggestions')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq('user_id', context.userId)
        .eq('is_dismissed', false)

      if (error) {
        console.error('[Privacy] Error dismissing all suggestions:', error)
        throw new GraphQLError('Failed to dismiss suggestions')
      }

      return true
    },

    // Refresh suggestions
    refreshSuggestions: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Call the suggestion generation function
      const { error } = await supabase.rpc('generate_user_suggestions', {
        target_user_id: context.userId,
      })

      if (error) {
        console.error('[Privacy] Error refreshing suggestions:', error)
        // Don't throw - return empty
      }

      // Return the updated suggestions
      const { data } = await supabase
        .from('user_suggestions')
        .select('*, users!suggested_user_id(*)')
        .eq('user_id', context.userId)
        .eq('is_dismissed', false)
        .gt('expires_at', new Date().toISOString())
        .order('score', { ascending: false })
        .limit(10)

      return {
        suggestions: (data || []).map(s => ({
          id: s.id,
          user: s.users,
          source: s.source,
          score: s.score,
          reason: s.reason,
          created_at: s.created_at,
        })),
        total_count: data?.length || 0,
        has_more: false,
      }
    },
  },

  // Field resolvers
  UserSuggestion: {
    user: async (parent: any) => {
      if (parent.user) return parent.user

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.suggested_user_id)
        .single()

      return data
    },
  },
}
