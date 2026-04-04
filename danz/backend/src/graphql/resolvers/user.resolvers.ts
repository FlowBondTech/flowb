import { GraphQLError } from 'graphql'
// privyClient import removed - user lookup now via supabase
import { supabase } from '../../config/supabase.js'
import { discord } from '../../services/discord.js'
import { flowbNotify } from '../../services/flowb-notify.js'
import type { GraphQLContext } from '../context.js'

const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // First try to find existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      // PGRST116 means no rows found, which is ok for new users
      if (fetchError && (fetchError as any).code !== 'PGRST116') {
        throw new GraphQLError('Failed to fetch user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      // If user exists, return it
      if (existingUser) {
        return existingUser
      }

      // If user doesn't exist, create them (for onboarding flow)
      try {
        // Look up user info from supabase auth (admin)
        const { data: authData } = await supabase.auth.admin.getUserById(userId)

        // Extract display name from auth metadata or use fallback
        let displayName = ''
        const email = authData?.user?.email
        const walletAddress = (authData?.user?.user_metadata as any)?.wallet_address
        if (email) {
          displayName = email.split('@')[0]!
        } else if (walletAddress) {
          displayName = walletAddress.slice(0, 8)
        } else {
          displayName = `user_${userId.slice(0, 8)}`
        }

        // Create the user with minimal data (for onboarding)
        const newUser = {
          id: userId,
          role: 'user' as const,
          username: null, // Will be set during onboarding
          display_name: displayName,
          bio: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single()

        if (createError) {
          throw new GraphQLError('Failed to create user', {
            extensions: { code: 'INTERNAL_SERVER_ERROR', details: createError },
          })
        }

        // Discord webhook: New user signup
        discord
          .notifyUserSignup({
            id: userId,
            email,
            wallet_address: walletAddress,
          })
          .catch(err => console.error('[Discord] User signup notification failed:', err))

        // FlowB admin notification: new DANZ signup
        flowbNotify
          .notifyDanzSignup({
            id: userId,
            email,
            wallet_address: walletAddress,
          })
          .catch(err => console.error('[FlowB] User signup notification failed:', err))

        return createdUser
      } catch (error: any) {
        // If it's already a GraphQLError, rethrow it
        if (error instanceof GraphQLError) {
          throw error
        }

        throw new GraphQLError('Failed to initialize user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error.message },
        })
      }
    },

    user: async (_: any, { id }: { id: string }) => {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single()

      if (error) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return data
    },

    getUserByUsername: async (_: any, { username }: { username: string }) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

      if (error) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return data
    },

    users: async (_: any, { filter, pagination }: any, _context: GraphQLContext) => {
      let query = supabase.from('users').select('*', { count: 'exact' })

      // Apply filters
      if (filter?.role) {
        query = query.eq('role', filter.role)
      }
      if (filter?.skill_level) {
        query = query.eq('skill_level', filter.skill_level)
      }
      if (filter?.city) {
        query = query.eq('city', filter.city)
      }
      if (filter?.dance_style) {
        query = query.contains('dance_styles', [filter.dance_style])
      }
      if (filter?.is_organizer_approved !== undefined && filter?.is_organizer_approved !== null) {
        query = query.eq('is_organizer_approved', filter.is_organizer_approved)
      } else if (filter?.is_organizer_approved === null) {
        // Handle null case - fetch users where is_organizer_approved is null
        query = query.is('is_organizer_approved', null)
      }

      // Apply pagination
      const limit = pagination?.limit || 20
      const offset = pagination?.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Supabase query error:', error)
        throw new GraphQLError(`Failed to fetch users: ${error.message}`, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return {
        users: data || [],
        pageInfo: {
          hasNextPage: count ? offset + limit < count : false,
          hasPreviousPage: offset > 0,
          startCursor: data?.length ? Buffer.from(`${offset}`).toString('base64') : null,
          endCursor: data?.length
            ? Buffer.from(`${offset + data.length - 1}`).toString('base64')
            : null,
        },
        totalCount: count || 0,
      }
    },

    myDanceBonds: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('dance_bonds')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

      if (error) {
        throw new GraphQLError('Failed to fetch dance bonds', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data
    },

    checkUsername: async (_: any, { username }: { username: string }) => {
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      return !data // Returns true if username is available
    },

    getUserStats: async (_: any, { userId }: { userId?: string }, context: GraphQLContext) => {
      const authUserId = requireAuth(context)
      const targetUserId = userId || authUserId

      // Get user points data
      const { data: user } = await supabase
        .from('users')
        .select(
          'total_points_earned, current_points_balance, referral_points_earned, longest_streak',
        )
        .eq('id', targetUserId)
        .single()

      // Get total events attended
      const { count: eventsAttended } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId)
        .eq('status', 'attended')

      // Get total events hosted
      const { count: eventsHosted } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('facilitator_id', targetUserId)

      // Get total posts created
      const { count: postsCreated } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId)

      // Get total comments made
      const { count: commentsMade } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId)

      // Get total likes given
      const { count: likesGiven } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId)

      // Get total likes received on user's posts
      const { data: userPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', targetUserId)

      const postIds = userPosts?.map(p => p.id) || []
      let likesReceived = 0
      if (postIds.length > 0) {
        const { count } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds)
        likesReceived = count || 0
      }

      // Get total dance bonds
      const { count: danceBonds } = await supabase
        .from('dance_bonds')
        .select('*', { count: 'exact', head: true })
        .or(`user_id_1.eq.${targetUserId},user_id_2.eq.${targetUserId}`)

      return {
        total_events_attended: eventsAttended || 0,
        total_events_hosted: eventsHosted || 0,
        total_posts_created: postsCreated || 0,
        total_comments_made: commentsMade || 0,
        total_likes_given: likesGiven || 0,
        total_likes_received: likesReceived,
        points_earned: user?.total_points_earned || 0,
        current_points_balance: user?.current_points_balance || 0,
        referral_points_earned: user?.referral_points_earned || 0,
        total_dance_bonds: danceBonds || 0,
        current_streak: 0, // TODO: Implement streak calculation
        longest_streak: user?.longest_streak || 0,
      }
    },
  },

  Mutation: {
    updateProfile: async (_: any, { input }: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Track if this is a new username being set
      let isNewUsername = false

      // If username is being updated, check availability first
      if (input.username) {
        const { data: existingUsername, error: usernameError } = await supabase
          .from('users')
          .select('id')
          .eq('username', input.username)
          .single()

        // Check if username exists and belongs to different user
        if (!usernameError && existingUsername && existingUsername.id !== userId) {
          throw new GraphQLError('Username already taken', {
            extensions: { code: 'CONFLICT' },
          })
        }
        // PGRST116 means no rows found, which means username is available
        if (usernameError && (usernameError as any).code !== 'PGRST116') {
          throw new GraphQLError('Failed to check username availability', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          })
        }

        // Check if user currently has a username
        const { data: currentUser } = await supabase
          .from('users')
          .select('username')
          .eq('id', userId)
          .single()

        // If user doesn't have a username yet, this is a new username
        if (currentUser && !currentUser.username) {
          isNewUsername = true
        }
      }

      // Prepare update data
      const updateData: any = {
        ...input,
        updated_at: new Date().toISOString(),
      }

      // If company_name is provided, automatically set role to organizer
      // This indicates they're applying to become an organizer
      if (input.company_name && input.company_name.trim() !== '') {
        updateData.role = 'organizer'
        updateData.is_organizer_approved = false // Starts as unapproved
        // Note: Admin can later approve them by setting is_organizer_approved = true
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update profile', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', details: error },
        })
      }

      // Auto-create referral code if this is a new username
      if (isNewUsername && input.username) {
        try {
          const { error: referralError } = await supabase.from('referral_codes').insert([
            {
              user_id: userId,
              code: input.username,
            },
          ])

          if (referralError) {
            // Log the error but don't fail the profile update
            console.error('Failed to auto-create referral code:', referralError)
          } else {
            console.log(`Auto-created referral code for user ${userId}: ${input.username}`)
          }
        } catch (err) {
          console.error('Error during referral code auto-creation:', err)
        }

        // Discord webhook: User completed registration
        discord
          .notifyUserRegistered({
            id: userId,
            username: data.username,
            display_name: data.display_name,
            avatar_url: data.avatar_url,
            city: data.city,
            role: data.role,
          })
          .catch(err => console.error('[Discord] User registered notification failed:', err))

        // FlowB admin notification: DANZ registration complete
        flowbNotify
          .notifyDanzRegistered({
            id: userId,
            username: data.username,
            display_name: data.display_name,
            city: data.city,
            role: data.role,
          })
          .catch(err => console.error('[FlowB] User registered notification failed:', err))
      }

      // Discord webhook: User became organizer
      if (input.company_name && input.company_name.trim() !== '') {
        discord
          .notifyOrganizerApproved({
            username: data.username,
            display_name: data.display_name,
            company_name: input.company_name,
          })
          .catch(err => console.error('[Discord] Organizer notification failed:', err))
      }

      return data
    },

    createDanceBond: async (
      _: any,
      { userId: otherUserId }: { userId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Ensure user1_id < user2_id for consistency
      const [user1_id, user2_id] = [userId, otherUserId].sort()

      const { data, error } = await supabase
        .from('dance_bonds')
        .insert({
          user1_id,
          user2_id,
          bond_level: 1,
          shared_sessions: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          throw new GraphQLError('Dance bond already exists', {
            extensions: { code: 'CONFLICT' },
          })
        }
        throw new GraphQLError('Failed to create dance bond', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data
    },

    updateDanceBond: async (
      _: any,
      { userId, level }: { userId: string; level: number },
      context: GraphQLContext,
    ) => {
      const currentUserId = requireAuth(context)

      const [user1_id, user2_id] = [currentUserId, userId].sort()

      const { data, error } = await supabase
        .from('dance_bonds')
        .update({
          bond_level: level,
          updated_at: new Date().toISOString(),
        })
        .eq('user1_id', user1_id)
        .eq('user2_id', user2_id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError('Failed to update dance bond', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        })
      }

      return data
    },
  },

  User: {
    achievements: async (parent: any, _: any, context: GraphQLContext) => {
      // Use DataLoader to batch load achievements for multiple users
      return context.loaders.achievementsByUserLoader.load(parent.id)
    },
  },

  DanceBond: {
    otherUser: async (parent: any, _: any, context: GraphQLContext) => {
      const otherUserId = parent.user1_id === context.userId ? parent.user2_id : parent.user1_id

      // Use DataLoader to batch load users
      return context.loaders.userLoader.load(otherUserId)
    },
  },
}
