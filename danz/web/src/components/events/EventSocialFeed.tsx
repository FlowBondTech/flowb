'use client'

import { gql, useQuery } from '@apollo/client'
import { formatDistanceToNow } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { FiActivity, FiCheck, FiClock, FiHeart, FiHelpCircle, FiUser } from 'react-icons/fi'

const GET_EVENT_ACTIVITY = gql`
  query GetEventActivity($eventId: ID!, $limit: Int) {
    eventActivity(eventId: $eventId, limit: $limit) {
      id
      action
      created_at
      user {
        privy_id
        username
        display_name
        avatar_url
      }
    }
  }
`

interface EventActivity {
  id: string
  action: 'registered' | 'maybe' | 'interested' | 'checked_in' | 'cancelled'
  created_at: string
  user: {
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
  }
}

interface EventSocialFeedProps {
  eventId: string
  eventTitle: string
  limit?: number
  showHeader?: boolean
}

// Activity Avatar component with error handling
function ActivityAvatar({ avatarUrl, name }: { avatarUrl?: string | null; name: string }) {
  const [imgError, setImgError] = useState(false)

  if (!avatarUrl || imgError) {
    return (
      <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
        <span className="text-neon-purple text-sm font-bold">{name[0]?.toUpperCase() || '?'}</span>
      </div>
    )
  }

  return (
    <img
      src={avatarUrl}
      alt={name}
      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      onError={() => setImgError(true)}
    />
  )
}

// Get action icon and color based on activity type
function getActionConfig(action: string) {
  switch (action) {
    case 'registered':
      return {
        icon: FiCheck,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        verb: 'is going to',
      }
    case 'maybe':
      return {
        icon: FiHelpCircle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        verb: 'might go to',
      }
    case 'interested':
      return {
        icon: FiHeart,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        verb: 'is interested in',
      }
    case 'checked_in':
      return {
        icon: FiCheck,
        color: 'text-neon-purple',
        bgColor: 'bg-neon-purple/10',
        verb: 'checked in at',
      }
    case 'cancelled':
      return {
        icon: FiUser,
        color: 'text-text-secondary',
        bgColor: 'bg-white/5',
        verb: 'cancelled their spot for',
      }
    default:
      return {
        icon: FiActivity,
        color: 'text-text-secondary',
        bgColor: 'bg-white/5',
        verb: 'interacted with',
      }
  }
}

// Mock data for when GraphQL query is not available
const MOCK_ACTIVITIES: EventActivity[] = [
  {
    id: '1',
    action: 'registered',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    user: { privy_id: '1', display_name: 'Sarah M.', username: 'sarahm', avatar_url: null },
  },
  {
    id: '2',
    action: 'interested',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    user: { privy_id: '2', display_name: 'Mike D.', username: 'miked', avatar_url: null },
  },
  {
    id: '3',
    action: 'maybe',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    user: { privy_id: '3', display_name: 'Jessica L.', username: 'jessical', avatar_url: null },
  },
  {
    id: '4',
    action: 'registered',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user: { privy_id: '4', display_name: 'Chris P.', username: 'chrisp', avatar_url: null },
  },
]

export default function EventSocialFeed({
  eventId,
  eventTitle,
  limit = 5,
  showHeader = true,
}: EventSocialFeedProps) {
  const [activities, setActivities] = useState<EventActivity[]>([])
  const [useMockData, setUseMockData] = useState(false)

  // Try to fetch real data
  const { data, loading, error } = useQuery(GET_EVENT_ACTIVITY, {
    variables: { eventId, limit },
    skip: !eventId,
    onError: () => setUseMockData(true),
  })

  // Update activities when data changes
  useEffect(() => {
    if (data?.eventActivity) {
      setActivities(data.eventActivity)
      setUseMockData(false)
    } else if (error || (!loading && !data?.eventActivity)) {
      // Use mock data if query fails or no data
      setUseMockData(true)
      setActivities(MOCK_ACTIVITIES.slice(0, limit))
    }
  }, [data, error, loading, limit])

  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <FiActivity className="w-5 h-5 text-neon-purple" />
            <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
          </div>
        )}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!activities.length) {
    return (
      <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <FiActivity className="w-5 h-5 text-neon-purple" />
            <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
          </div>
        )}
        <p className="text-text-secondary text-sm text-center py-4">
          No activity yet. Be the first to register!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">
      {showHeader && (
        <div className="flex items-center gap-2 mb-4">
          <FiActivity className="w-5 h-5 text-neon-purple" />
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {activities.map((activity, index) => {
            const config = getActionConfig(activity.action)
            const Icon = config.icon
            const userName = activity.user.display_name || activity.user.username || 'Someone'
            const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className="relative">
                  <ActivityAvatar avatarUrl={activity.user.avatar_url} name={userName} />
                  <div
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${config.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`w-2.5 h-2.5 ${config.color}`} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">{userName}</span>{' '}
                    <span className="text-text-secondary">{config.verb}</span>{' '}
                    <span className="font-medium">{eventTitle}</span>
                  </p>
                  <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                    <FiClock className="w-3 h-3" />
                    {timeAgo}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {useMockData && (
        <p className="text-xs text-text-secondary/50 text-center mt-4">Sample activity shown</p>
      )}
    </div>
  )
}
