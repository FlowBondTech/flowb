'use client'

import { ActivityType, useGetActivityFeedQuery } from '@/src/generated/graphql'
import { useRouter } from 'next/navigation'
import type { IconType } from 'react-icons'
import {
  FiActivity,
  FiAward,
  FiCalendar,
  FiGift,
  FiHeart,
  FiMessageCircle,
  FiMusic,
  FiStar,
  FiTrendingUp,
  FiUserPlus,
  FiUsers,
  FiZap,
} from 'react-icons/fi'

const getActivityConfig = (
  type: ActivityType,
): { icon: IconType; color: string; bgColor: string } => {
  switch (type) {
    case ActivityType.UserAchievement:
    case ActivityType.DanceMilestone:
    case ActivityType.HighScoreAchieved:
      return { icon: FiAward, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' }
    case ActivityType.EventCheckin:
    case ActivityType.EventCompleted:
    case ActivityType.EventJoined:
    case ActivityType.EventCreated:
      return { icon: FiCalendar, color: 'text-neon-purple', bgColor: 'bg-neon-purple/10' }
    case ActivityType.NewDanceBond:
    case ActivityType.DanceBondStrengthened:
      return { icon: FiUsers, color: 'text-pink-400', bgColor: 'bg-pink-400/10' }
    case ActivityType.PostCreated:
    case ActivityType.DanceSessionShared:
    case ActivityType.DanceSessionCompleted:
      return { icon: FiMusic, color: 'text-blue-400', bgColor: 'bg-blue-400/10' }
    case ActivityType.PostLiked:
      return { icon: FiHeart, color: 'text-red-400', bgColor: 'bg-red-400/10' }
    case ActivityType.PostCommented:
      return { icon: FiMessageCircle, color: 'text-green-400', bgColor: 'bg-green-400/10' }
    case ActivityType.UserLevelUp:
    case ActivityType.LeaderboardRankUp:
      return { icon: FiTrendingUp, color: 'text-orange-400', bgColor: 'bg-orange-400/10' }
    case ActivityType.UserStreak:
    case ActivityType.ChallengeStreak:
      return { icon: FiZap, color: 'text-amber-400', bgColor: 'bg-amber-400/10' }
    case ActivityType.ChallengeCompleted:
    case ActivityType.ChallengeStarted:
      return { icon: FiStar, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' }
    case ActivityType.SeasonReward:
    case ActivityType.ReferralBonus:
      return { icon: FiGift, color: 'text-purple-400', bgColor: 'bg-purple-400/10' }
    case ActivityType.ReferralInvited:
    case ActivityType.ReferralJoined:
    case ActivityType.UserJoined:
      return { icon: FiUserPlus, color: 'text-teal-400', bgColor: 'bg-teal-400/10' }
    default:
      return { icon: FiActivity, color: 'text-neon-purple', bgColor: 'bg-neon-purple/10' }
  }
}

export default function RecentActivityFeed() {
  const router = useRouter()
  const { data, loading } = useGetActivityFeedQuery({
    variables: {
      limit: 6,
    },
  })

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getActivityNavigation = (type: ActivityType) => {
    if (
      [
        ActivityType.EventCheckin,
        ActivityType.EventCompleted,
        ActivityType.EventJoined,
        ActivityType.EventCreated,
      ].includes(type)
    ) {
      return '/dashboard/my-events'
    } else if ([ActivityType.PostCreated, ActivityType.DanceSessionShared].includes(type)) {
      return '/dashboard/feed'
    } else if ([ActivityType.NewDanceBond, ActivityType.DanceBondStrengthened].includes(type)) {
      return '/dashboard/connections'
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const activities = data?.activityFeed?.activities || []

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <FiActivity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Recent Activity</h2>
            <p className="text-sm text-text-secondary">Your latest dance journey moments</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/activity')}
          className="text-sm text-neon-purple hover:text-neon-pink font-medium transition-colors"
        >
          View All
        </button>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity, index) => {
            const config = getActivityConfig(activity.activity_type)
            const Icon = config.icon
            const navPath = getActivityNavigation(activity.activity_type)

            return (
              <div
                key={activity.id}
                className="group relative flex items-start gap-4 p-4 bg-bg-primary/30 hover:bg-bg-primary/50 border border-white/5 hover:border-neon-purple/30 rounded-xl transition-all cursor-pointer"
                onClick={() => {
                  if (navPath) {
                    router.push(navPath)
                  }
                }}
              >
                {/* Timeline Line */}
                {index !== activities.length - 1 && (
                  <div className="absolute left-9 top-16 bottom-0 w-px bg-white/5" />
                )}

                {/* Icon */}
                <div
                  className={`relative flex-shrink-0 w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center z-10`}
                >
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-neon-purple transition-colors">
                      {activity.title}
                    </h3>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {getTimeAgo(activity.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {activity.description}
                  </p>
                  {(activity.xp_earned || activity.points_earned) && (
                    <div className="flex items-center gap-2 mt-2">
                      {activity.xp_earned && activity.xp_earned > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-neon-purple/20 text-neon-purple rounded-full">
                          +{activity.xp_earned} XP
                        </span>
                      )}
                      {activity.points_earned && activity.points_earned > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-400/20 text-yellow-400 rounded-full">
                          +{activity.points_earned} pts
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-purple/10 flex items-center justify-center">
            <FiActivity className="w-8 h-8 text-neon-purple" />
          </div>
          <p className="text-text-secondary mb-4">No recent activity</p>
          <p className="text-sm text-text-muted">
            Start dancing, attend events, and connect with others to see your activity here
          </p>
        </div>
      )}

      {/* Load More */}
      {data?.activityFeed?.has_more && (
        <button
          onClick={() => router.push('/dashboard/activity')}
          className="w-full mt-4 py-3 bg-bg-primary/50 hover:bg-bg-primary border border-white/10 hover:border-neon-purple/30 rounded-xl text-text-secondary hover:text-neon-purple text-sm font-medium transition-all"
        >
          Load More Activity
        </button>
      )}
    </div>
  )
}
