'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import {
  useCreateCommentMutation,
  useCreatePostMutation,
  useGetFeedQuery,
  useGetPostQuery,
  useLikePostMutation,
  useUnlikePostMutation,
} from '@/src/generated/graphql'
import { useAuth } from '@/src/contexts/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import {
  FiChevronRight,
  FiHeart,
  FiHome,
  FiImage,
  FiMessageCircle,
  FiPlus,
  FiSend,
  FiShare2,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi'

// Post Comments Component
function PostComments({ postId }: { postId: string }) {
  const [commentText, setCommentText] = useState('')
  const { data: postData, loading } = useGetPostQuery({
    variables: { id: postId },
  })
  const [createComment, { loading: submitting }] = useCreateCommentMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    try {
      await createComment({
        variables: {
          input: {
            post_id: postId,
            content: commentText,
          },
        },
        refetchQueries: ['GetFeed', 'GetPost'],
      })
      setCommentText('')
    } catch (err) {
      console.error('Error creating comment:', err)
    }
  }

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const comments = postData?.getPost?.comments || []

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      {/* Existing Comments */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map(comment => (
            <div
              key={comment.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-bg-primary/30"
            >
              {comment.user?.avatar_url ? (
                <img
                  src={comment.user.avatar_url}
                  alt={comment.user.username || 'User'}
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {comment.user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-text-primary text-sm">
                    {comment.user?.display_name || comment.user?.username}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {formatTimeAgo(new Date(comment.created_at))}
                  </span>
                </div>
                <p className="text-text-primary text-sm mt-1 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full bg-bg-primary border border-white/10 rounded-xl px-4 py-2 text-text-primary placeholder-text-secondary resize-none focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all text-sm"
            rows={2}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !commentText.trim()}
          className="px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-neon-purple/25 transition-all flex-shrink-0"
        >
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

function FeedContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [postContent, setPostContent] = useState('')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)

  const { data, loading, error, fetchMore } = useGetFeedQuery({
    variables: { limit: 20 },
    skip: !isAuthenticated,
  })

  const [createPost, { loading: creating }] = useCreatePostMutation({
    refetchQueries: ['GetFeed'],
  })

  const [likePost] = useLikePostMutation()
  const [unlikePost] = useUnlikePostMutation()


  const handleCreatePost = async () => {
    if (!postContent.trim()) return

    try {
      await createPost({
        variables: {
          input: {
            content: postContent,
            is_public: true,
          },
        },
      })
      setPostContent('')
      setShowCreatePost(false)
    } catch (err) {
      console.error('Error creating post:', err)
    }
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await unlikePost({
          variables: { postId },
          refetchQueries: ['GetFeed'],
        })
      } else {
        await likePost({
          variables: { postId },
          refetchQueries: ['GetFeed'],
        })
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  const toggleComments = (postId: string) => {
    setExpandedPostId(expandedPostId === postId ? null : postId)
  }

  const loadMore = () => {
    if (!data?.getFeed.has_more || !data?.getFeed.cursor) return

    fetchMore({
      variables: {
        cursor: data.getFeed.cursor,
        limit: 20,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev
        return {
          getFeed: {
            ...fetchMoreResult.getFeed,
            posts: [...prev.getFeed.posts, ...fetchMoreResult.getFeed.posts],
          },
        }
      },
    })
  }

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
            <p className="text-text-secondary">Loading your feed...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <FiX className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 text-xl mb-2">Error loading feed</p>
            <p className="text-text-secondary text-sm">Please try again later</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const posts = data?.getFeed.posts || []

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-text-secondary hover:text-neon-purple transition-colors"
          >
            <FiHome className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <FiChevronRight className="w-4 h-4 text-text-secondary/50" />
          <span className="text-neon-purple font-medium">Feed</span>
        </nav>

        {/* Hero Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-neon-purple/20 via-bg-secondary to-neon-pink/10 border border-neon-purple/20 p-6 sm:p-8">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon-pink/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-lg shadow-neon-purple/25">
                <FiZap className="w-7 h-7 text-text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Community Feed</h1>
                <p className="text-text-secondary mt-1">See what dancers are sharing</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreatePost(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl font-semibold text-white shadow-lg shadow-neon-purple/25 hover:shadow-neon-purple/40 hover:scale-105 transition-all duration-200"
            >
              <FiPlus className="w-5 h-5" />
              <span>New Post</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="relative mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-bg-primary/50 backdrop-blur-sm border border-white/5">
              <div className="flex items-center justify-center gap-1.5 text-neon-purple mb-1">
                <FiTrendingUp className="w-4 h-4" />
                <span className="font-bold">{posts.length}</span>
              </div>
              <p className="text-xs text-text-secondary">Posts Today</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-bg-primary/50 backdrop-blur-sm border border-white/5">
              <div className="flex items-center justify-center gap-1.5 text-neon-pink mb-1">
                <FiUsers className="w-4 h-4" />
                <span className="font-bold">Active</span>
              </div>
              <p className="text-xs text-text-secondary">Community</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-bg-primary/50 backdrop-blur-sm border border-white/5">
              <div className="flex items-center justify-center gap-1.5 text-neon-cyan mb-1">
                <FiHeart className="w-4 h-4" />
                <span className="font-bold">Vibes</span>
              </div>
              <p className="text-xs text-text-secondary">Positive</p>
            </div>
          </div>
        </div>

        {/* Create Post Modal */}
        {showCreatePost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-bg-secondary border border-neon-purple/30 rounded-2xl p-6 shadow-2xl shadow-neon-purple/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
                    <FiSend className="w-5 h-5 text-text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary">Create Post</h2>
                </div>
                <button
                  onClick={() => {
                    setShowCreatePost(false)
                    setPostContent('')
                  }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              <textarea
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Share your dance journey, a win, or just say hi..."
                className="w-full bg-bg-primary border border-white/10 rounded-xl p-4 text-text-primary placeholder-text-secondary resize-none focus:outline-none focus:border-neon-purple/50 focus:ring-2 focus:ring-neon-purple/20 transition-all"
                rows={5}
                autoFocus
              />

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <button className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-neon-purple transition-colors">
                    <FiImage size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary">{postContent.length}/500</span>
                  <button
                    onClick={handleCreatePost}
                    disabled={creating || !postContent.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-neon-purple/25 transition-all"
                  >
                    <FiSend size={16} />
                    {creating ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-secondary to-bg-primary border border-neon-purple/20 p-12 text-center">
              {/* Decorative elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-neon-purple/5 rounded-full blur-3xl" />

              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center border border-neon-purple/20">
                  <FiMessageCircle className="w-10 h-10 text-neon-purple" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">No posts yet</h3>
                <p className="text-text-secondary mb-6 max-w-sm mx-auto">
                  Be the first to share something with the community! Your dance journey matters.
                </p>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl font-semibold text-white shadow-lg shadow-neon-purple/25 hover:shadow-neon-purple/40 hover:scale-105 transition-all duration-200"
                >
                  <FiPlus className="w-5 h-5" />
                  Create First Post
                </button>
              </div>
            </div>
          ) : (
            posts.map((post, index) => (
              <article
                key={post.id}
                className="group bg-bg-secondary border border-white/5 hover:border-neon-purple/30 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:shadow-lg hover:shadow-neon-purple/5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {post.user?.avatar_url ? (
                      <img
                        src={post.user.avatar_url}
                        alt={post.user.display_name || post.user.username || 'User'}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-neon-purple/30 group-hover:border-neon-purple/50 transition-colors"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-neon-purple/20">
                        {post.user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-text-primary group-hover:text-neon-purple transition-colors">
                        {post.user?.display_name || post.user?.username}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {formatTimeAgo(new Date(post.created_at))}
                      </p>
                    </div>
                  </div>

                  <button className="w-8 h-8 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all">
                    <FiShare2 size={16} />
                  </button>
                </div>

                {/* Post Content */}
                <p className="text-text-primary leading-relaxed mb-4 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Post Media */}
                {post.media_url && post.media_type === 'image' && (
                  <div className="relative rounded-xl overflow-hidden mb-4">
                    <img
                      src={post.media_url}
                      alt="Post media"
                      className="w-full max-h-96 object-cover"
                    />
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-1 pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleLike(post.id, post.is_liked_by_me)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                      post.is_liked_by_me
                        ? 'bg-neon-pink/10 text-neon-pink'
                        : 'text-text-secondary hover:bg-white/5 hover:text-neon-pink'
                    }`}
                  >
                    <FiHeart
                      size={18}
                      fill={post.is_liked_by_me ? 'currentColor' : 'none'}
                      className={post.is_liked_by_me ? 'animate-pulse' : ''}
                    />
                    <span className="font-medium">{post.likes_count}</span>
                  </button>

                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                      expandedPostId === post.id
                        ? 'bg-neon-purple/10 text-neon-purple'
                        : 'text-text-secondary hover:bg-white/5 hover:text-neon-purple'
                    }`}
                  >
                    <FiMessageCircle size={18} />
                    <span className="font-medium">{post.comments_count}</span>
                  </button>

                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-text-secondary hover:bg-white/5 hover:text-neon-cyan transition-all duration-200 ml-auto">
                    <FiShare2 size={18} />
                    <span className="font-medium hidden sm:inline">Share</span>
                  </button>
                </div>

                {/* Comments Section */}
                {expandedPostId === post.id && <PostComments postId={post.id} />}
              </article>
            ))
          )}

          {/* Load More */}
          {data?.getFeed.has_more && (
            <button
              onClick={loadMore}
              className="w-full py-4 rounded-xl border border-neon-purple/20 text-neon-purple font-medium hover:bg-neon-purple/10 hover:border-neon-purple/40 transition-all duration-200"
            >
              Load More Posts
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
              <p className="text-text-secondary">Loading...</p>
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <FeedContent />
    </Suspense>
  )
}
