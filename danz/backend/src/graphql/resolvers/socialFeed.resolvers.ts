import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import type { GraphQLContext } from '../context.js'

// Helper to ensure user is authenticated
const requireAuth = (context: GraphQLContext): string => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

// Helper to normalize user IDs for dance bond uniqueness
const normalizeBondUserIds = (userId1: string, userId2: string): [string, string] => {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1]
}

export const socialFeedResolvers = {
  Query: {
    getFeed: async (
      _: any,
      { limit = 20, cursor }: { limit?: number; cursor?: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Build query
      let query = supabase
        .from('posts')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit + 1) // Fetch one extra to determine if there are more

      // Add cursor-based pagination
      if (cursor) {
        query = query.lt('created_at', cursor)
      }

      const { data, error } = await query

      if (error) throw new GraphQLError(`Failed to fetch feed: ${error.message}`)

      const posts = data || []
      const hasMore = posts.length > limit
      const paginatedPosts = hasMore ? posts.slice(0, limit) : posts
      const nextCursor = hasMore ? paginatedPosts[paginatedPosts.length - 1].created_at : null

      return {
        posts: paginatedPosts,
        has_more: hasMore,
        cursor: nextCursor,
      }
    },

    getPost: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase.from('posts').select('*').eq('id', id).single()

      if (error) throw new GraphQLError(`Post not found: ${error.message}`)
      if (!data.is_public && data.user_id !== userId) {
        throw new GraphQLError('Not authorized to view this post', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      return data
    },

    getMyPosts: async (
      _: any,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw new GraphQLError(`Failed to fetch posts: ${error.message}`)
      return data || []
    },

    getUserPosts: async (
      _: any,
      { userId, limit = 20, offset = 0 }: { userId: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw new GraphQLError(`Failed to fetch user posts: ${error.message}`)
      return data || []
    },

    getEventPosts: async (
      _: any,
      { eventId, limit = 20, offset = 0 }: { eventId: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      requireAuth(context)

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw new GraphQLError(`Failed to fetch event posts: ${error.message}`)
      return data || []
    },

    getMyDanceBonds: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { data, error } = await supabase
        .from('dance_bonds')
        .select('*')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .order('updated_at', { ascending: false })

      if (error) throw new GraphQLError(`Failed to fetch dance bonds: ${error.message}`)
      return data || []
    },

    getDanceBond: async (_: any, { userId }: { userId: string }, context: GraphQLContext) => {
      const myUserId = requireAuth(context)
      const [user1, user2] = normalizeBondUserIds(myUserId, userId)

      const { data, error } = await supabase
        .from('dance_bonds')
        .select('*')
        .eq('user_id_1', user1)
        .eq('user_id_2', user2)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError(`Failed to fetch dance bond: ${error.message}`)
      }

      return data
    },
  },

  Mutation: {
    createPost: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const postData = {
        user_id: userId,
        content: input.content,
        media_url: input.media_url || null,
        media_type: input.media_type || null,
        event_id: input.event_id || null,
        location: input.location || null,
        is_public: input.is_public ?? true,
      }

      const { data, error } = await supabase.from('posts').insert(postData).select().single()

      if (error) throw new GraphQLError(`Failed to create post: ${error.message}`)
      return data
    },

    updatePost: async (
      _: any,
      { postId, input }: { postId: string; input: any },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Verify ownership
      const { data: existingPost, error: fetchError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single()

      if (fetchError || !existingPost) {
        throw new GraphQLError('Post not found')
      }

      if (existingPost.user_id !== userId) {
        throw new GraphQLError('Not authorized to update this post', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const updateData: any = { updated_at: new Date().toISOString() }
      if (input.content !== undefined) updateData.content = input.content
      if (input.media_url !== undefined) updateData.media_url = input.media_url
      if (input.media_type !== undefined) updateData.media_type = input.media_type
      if (input.location !== undefined) updateData.location = input.location
      if (input.is_public !== undefined) updateData.is_public = input.is_public

      const { data, error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId)
        .select()
        .single()

      if (error) throw new GraphQLError(`Failed to update post: ${error.message}`)
      return data
    },

    deletePost: async (_: any, { postId }: { postId: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Verify ownership
      const { data: existingPost, error: fetchError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single()

      if (fetchError || !existingPost) {
        throw new GraphQLError('Post not found')
      }

      // Check if user is the owner or admin
      if (existingPost.user_id !== userId) {
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('privy_id', userId)
          .single()

        if (!user || user.role !== 'admin') {
          throw new GraphQLError('Not authorized to delete this post', {
            extensions: { code: 'FORBIDDEN' },
          })
        }
      }

      const { error } = await supabase.from('posts').delete().eq('id', postId)

      if (error) throw new GraphQLError(`Failed to delete post: ${error.message}`)

      return {
        success: true,
        message: 'Post deleted successfully',
      }
    },

    likePost: async (_: any, { postId }: { postId: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if post exists and get post owner
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', postId)
        .single()

      if (postError || !post) {
        throw new GraphQLError('Post not found')
      }

      // Try to insert like (will fail if already exists due to unique constraint)
      const { error } = await supabase.from('post_likes').insert({
        post_id: postId,
        user_id: userId,
      })

      if (error && error.code === '23505') {
        // Already liked
        return {
          success: true,
          message: 'Post already liked',
        }
      }

      if (error) throw new GraphQLError(`Failed to like post: ${error.message}`)

      // Create notification for post owner (don't notify if liking own post)
      if (post.user_id !== userId) {
        const { data: liker } = await supabase
          .from('users')
          .select('username')
          .eq('privy_id', userId)
          .single()

        await supabase.from('notifications').insert({
          type: 'post_like',
          title: 'New Like',
          message: `${liker?.username || 'Someone'} liked your post`,
          sender_id: userId,
          sender_type: 'user',
          recipient_id: post.user_id,
          action_type: 'open_post',
          action_data: { post_id: postId },
        })
      }

      return {
        success: true,
        message: 'Post liked successfully',
      }
    },

    unlikePost: async (_: any, { postId }: { postId: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)

      if (error) throw new GraphQLError(`Failed to unlike post: ${error.message}`)

      return {
        success: true,
        message: 'Post unliked successfully',
      }
    },

    createComment: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Check if post exists and get post owner
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', input.post_id)
        .single()

      if (postError || !post) {
        throw new GraphQLError('Post not found')
      }

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: input.post_id,
          user_id: userId,
          content: input.content,
        })
        .select()
        .single()

      if (error) throw new GraphQLError(`Failed to create comment: ${error.message}`)

      // Create notification for post owner (don't notify if commenting on own post)
      if (post.user_id !== userId) {
        const { data: commenter } = await supabase
          .from('users')
          .select('username')
          .eq('privy_id', userId)
          .single()

        await supabase.from('notifications').insert({
          type: 'post_comment',
          title: 'New Comment',
          message: `${commenter?.username || 'Someone'} commented on your post: "${input.content.substring(0, 50)}${input.content.length > 50 ? '...' : ''}"`,
          sender_id: userId,
          sender_type: 'user',
          recipient_id: post.user_id,
          action_type: 'open_post',
          action_data: { post_id: input.post_id, comment_id: data.id },
        })
      }

      return data
    },

    updateComment: async (
      _: any,
      { commentId, content }: { commentId: string; content: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Verify ownership
      const { data: existingComment, error: fetchError } = await supabase
        .from('post_comments')
        .select('user_id')
        .eq('id', commentId)
        .single()

      if (fetchError || !existingComment) {
        throw new GraphQLError('Comment not found')
      }

      if (existingComment.user_id !== userId) {
        throw new GraphQLError('Not authorized to update this comment', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { data, error } = await supabase
        .from('post_comments')
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select()
        .single()

      if (error) throw new GraphQLError(`Failed to update comment: ${error.message}`)
      return data
    },

    deleteComment: async (
      _: any,
      { commentId }: { commentId: string },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Verify ownership
      const { data: existingComment, error: fetchError } = await supabase
        .from('post_comments')
        .select('user_id')
        .eq('id', commentId)
        .single()

      if (fetchError || !existingComment) {
        throw new GraphQLError('Comment not found')
      }

      // Check if user is the owner or admin
      if (existingComment.user_id !== userId) {
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('privy_id', userId)
          .single()

        if (!user || user.role !== 'admin') {
          throw new GraphQLError('Not authorized to delete this comment', {
            extensions: { code: 'FORBIDDEN' },
          })
        }
      }

      const { error } = await supabase.from('post_comments').delete().eq('id', commentId)

      if (error) throw new GraphQLError(`Failed to delete comment: ${error.message}`)

      return {
        success: true,
        message: 'Comment deleted successfully',
      }
    },

    createDanceBond: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const myUserId = requireAuth(context)
      const otherUserId = input.user_id

      if (myUserId === otherUserId) {
        throw new GraphQLError('Cannot create dance bond with yourself')
      }

      const [user1, user2] = normalizeBondUserIds(myUserId, otherUserId)

      // Check if bond already exists
      const { data: existing } = await supabase
        .from('dance_bonds')
        .select('id')
        .eq('user_id_1', user1)
        .eq('user_id_2', user2)
        .single()

      if (existing) {
        throw new GraphQLError('Dance bond already exists')
      }

      const { data, error } = await supabase
        .from('dance_bonds')
        .insert({
          user_id_1: user1,
          user_id_2: user2,
          bond_level: 1,
          shared_events_count: 0,
          total_dances: 0,
        })
        .select()
        .single()

      if (error) throw new GraphQLError(`Failed to create dance bond: ${error.message}`)

      // Get usernames for notification
      const { data: initiator } = await supabase
        .from('users')
        .select('username')
        .eq('privy_id', myUserId)
        .single()

      // Create notification for the other user about new dance bond
      await supabase.from('notifications').insert({
        type: 'dance_bond',
        title: 'New Dance Bond!',
        message: `${initiator?.username || 'Someone'} wants to connect! You now have a dance bond. Keep dancing together to strengthen it!`,
        sender_id: myUserId,
        sender_type: 'user',
        recipient_id: otherUserId,
        action_type: 'open_profile',
        action_data: { user_id: myUserId, bond_id: data.id },
      })

      return data
    },

    deleteDanceBond: async (_: any, { bondId }: { bondId: string }, context: GraphQLContext) => {
      const userId = requireAuth(context)

      // Verify user is part of the bond
      const { data: bond, error: fetchError } = await supabase
        .from('dance_bonds')
        .select('user_id_1, user_id_2')
        .eq('id', bondId)
        .single()

      if (fetchError || !bond) {
        throw new GraphQLError('Dance bond not found')
      }

      if (bond.user_id_1 !== userId && bond.user_id_2 !== userId) {
        throw new GraphQLError('Not authorized to delete this dance bond', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      const { error } = await supabase.from('dance_bonds').delete().eq('id', bondId)

      if (error) throw new GraphQLError(`Failed to delete dance bond: ${error.message}`)

      return {
        success: true,
        message: 'Dance bond deleted successfully',
      }
    },
  },

  // Field resolvers
  Post: {
    user: async (parent: any) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()

      if (error) throw new GraphQLError(`Failed to fetch user: ${error.message}`)
      return data
    },

    event: async (parent: any) => {
      if (!parent.event_id) return null

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', parent.event_id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError(`Failed to fetch event: ${error.message}`)
      }
      return data
    },

    likes_count: async (parent: any) => {
      const { count, error } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', parent.id)

      if (error) throw new GraphQLError(`Failed to count likes: ${error.message}`)
      return count || 0
    },

    comments_count: async (parent: any) => {
      const { count, error } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', parent.id)

      if (error) throw new GraphQLError(`Failed to count comments: ${error.message}`)
      return count || 0
    },

    is_liked_by_me: async (parent: any, _: any, context: GraphQLContext) => {
      if (!context.userId) return false

      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', parent.id)
        .eq('user_id', context.userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError(`Failed to check like status: ${error.message}`)
      }
      return !!data
    },
  },

  PostWithDetails: {
    user: async (parent: any) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()

      if (error) throw new GraphQLError(`Failed to fetch user: ${error.message}`)
      return data
    },

    event: async (parent: any) => {
      if (!parent.event_id) return null

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', parent.event_id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError(`Failed to fetch event: ${error.message}`)
      }
      return data
    },

    likes: async (parent: any) => {
      const { data, error } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', parent.id)
        .order('created_at', { ascending: false })

      if (error) throw new GraphQLError(`Failed to fetch likes: ${error.message}`)
      return data || []
    },

    comments: async (parent: any) => {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', parent.id)
        .order('created_at', { ascending: true })

      if (error) throw new GraphQLError(`Failed to fetch comments: ${error.message}`)
      return data || []
    },

    likes_count: async (parent: any) => {
      const { count, error } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', parent.id)

      if (error) throw new GraphQLError(`Failed to count likes: ${error.message}`)
      return count || 0
    },

    comments_count: async (parent: any) => {
      const { count, error } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', parent.id)

      if (error) throw new GraphQLError(`Failed to count comments: ${error.message}`)
      return count || 0
    },

    is_liked_by_me: async (parent: any, _: any, context: GraphQLContext) => {
      if (!context.userId) return false

      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', parent.id)
        .eq('user_id', context.userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError(`Failed to check like status: ${error.message}`)
      }
      return !!data
    },
  },

  PostLike: {
    user: async (parent: any) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()

      if (error) throw new GraphQLError(`Failed to fetch user: ${error.message}`)
      return data
    },
  },

  PostComment: {
    user: async (parent: any) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single()

      if (error) throw new GraphQLError(`Failed to fetch user: ${error.message}`)
      return data
    },
  },

  DanceBond: {
    user1: async (parent: any) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id_1)
        .single()

      if (error) throw new GraphQLError(`Failed to fetch user1: ${error.message}`)
      return data
    },

    user2: async (parent: any) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id_2)
        .single()

      if (error) throw new GraphQLError(`Failed to fetch user2: ${error.message}`)
      return data
    },
  },
}
