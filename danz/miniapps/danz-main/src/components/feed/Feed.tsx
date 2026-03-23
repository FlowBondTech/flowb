'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useMemo, useState } from 'react'

// TODO: Replace with generated types from GraphQL codegen
interface FeedPost {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  likes: number
  comments: number
  isLiked: boolean
  timestamp: Date
  location?: string
}

// Mock data for initial development - will be replaced with GraphQL
const MOCK_POSTS: FeedPost[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'DanceQueen',
    userAvatar: '',
    content: 'Just finished an amazing salsa session! The energy was incredible tonight.',
    likes: 24,
    comments: 5,
    isLiked: false,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    location: 'Dance Studio NYC',
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'GrooveKing',
    userAvatar: '',
    content: 'Breaking down some new hip-hop moves. Practice makes progress!',
    mediaType: 'video',
    likes: 42,
    comments: 8,
    isLiked: true,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'BallroomPro',
    userAvatar: '',
    content: 'Competition prep is in full swing. Can\'t wait to show what we\'ve been working on!',
    likes: 67,
    comments: 12,
    isLiked: false,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
]

export function Feed() {
  const { user, isAuthenticated } = useAuth()
  const [posts, setPosts] = useState<FeedPost[]>(MOCK_POSTS)
  const [isLoading, setIsLoading] = useState(false)

  // TODO: Replace with useGetFeedQuery from generated GraphQL
  // const { data, loading, error, refetch } = useGetFeedQuery({
  //   variables: { limit: 20 },
  //   fetchPolicy: 'cache-and-network',
  // })

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
        }
      }
      return post
    }))
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    // TODO: Call refetch from GraphQL
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  const getTimeAgo = (timestamp: Date): string => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours === 1) return '1 hour ago'
    if (diffInHours < 24) return `${diffInHours} hours ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return '1 day ago'
    return `${diffInDays} days ago`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-gray-400 text-sm">Share your dance journey</p>
      </div>

      {/* Create Post Card */}
      {isAuthenticated && (
        <div className="mx-4 mb-4 p-4 bg-white/5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-danz-primary flex items-center justify-center text-white font-bold">
            {user?.displayName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'D'}
          </div>
          <div className="flex-1">
            <p className="text-gray-400 text-sm">Share your dance journey...</p>
          </div>
          <button className="w-8 h-8 rounded-full bg-danz-primary/10 flex items-center justify-center text-danz-primary">
            +
          </button>
        </div>
      )}

      {/* Feed Posts */}
      <div className="flex-1 overflow-y-auto space-y-4 px-4 pb-4">
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-danz-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-400 mt-2">Loading feed...</p>
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl">📝</span>
            <p className="text-lg font-bold mt-4">No posts yet</p>
            <p className="text-gray-400">Be the first to share your dance journey!</p>
          </div>
        )}

        {posts.map((post) => (
          <div key={post.id} className="bg-white/5 rounded-2xl p-4">
            {/* Post Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-danz-primary/10 flex items-center justify-center text-xl">
                  {post.userAvatar || '💃'}
                </div>
                <div>
                  <p className="font-semibold">{post.userName}</p>
                  <p className="text-xs text-gray-400">{getTimeAgo(post.timestamp)}</p>
                  {post.location && (
                    <p className="text-xs text-gray-400">📍 {post.location}</p>
                  )}
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:text-white">
                •••
              </button>
            </div>

            {/* Post Content */}
            <p className="text-white mb-4 leading-relaxed">{post.content}</p>

            {/* Media Placeholder */}
            {post.mediaType && (
              <div className="mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-danz-primary/30 to-danz-secondary/30 h-48 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl">{post.mediaType === 'video' ? '▶️' : '📷'}</span>
                  <p className="text-sm text-white/80 mt-2">
                    {post.mediaType === 'video' ? 'Dance Video' : 'Photo'}
                  </p>
                </div>
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-2 ${post.isLiked ? 'text-danz-primary' : 'text-gray-400'} hover:text-danz-primary transition-colors`}
              >
                <span>{post.isLiked ? '❤️' : '🤍'}</span>
                <span className="text-sm font-medium">{post.likes}</span>
              </button>

              <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <span>💬</span>
                <span className="text-sm font-medium">{post.comments}</span>
              </button>

              <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <span>↗️</span>
                <span className="text-sm font-medium">Share</span>
              </button>

              <div className="flex-1" />

              <button className="text-gray-400 hover:text-white transition-colors">
                🔖
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
