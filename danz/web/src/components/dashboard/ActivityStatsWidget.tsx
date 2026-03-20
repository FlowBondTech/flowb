'use client'

import { gql, useQuery } from '@apollo/client'
import {
  FiActivity,
  FiArrowDown,
  FiArrowUp,
  FiCalendar,
  FiClock,
  FiTrendingUp,
} from 'react-icons/fi'

const GET_ACTIVITY_TRENDS = gql`
  query GetActivityTrends($userId: String) {
    getUserStats(userId: $userId) {
      total_posts_created
      total_events_attended
      total_comments_made
      total_likes_received
      current_streak
    }
  }
`

interface ActivityTrendsData {
  getUserStats: {
    total_posts_created: number
    total_events_attended: number
    total_comments_made: number
    total_likes_received: number
    current_streak: number
  }
}

export default function ActivityStatsWidget() {
  const { data, loading, error } = useQuery<ActivityTrendsData>(GET_ACTIVITY_TRENDS)

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const stats = data.getUserStats

  // Calculate mock trends (in a real app, this would come from the backend)
  const calculateTrend = (value: number) => {
    // Mock calculation - in production, compare with previous period
    const change = Math.floor(Math.random() * 30) - 10 // Random -10 to +20
    const isPositive = change > 0
    return { change, isPositive }
  }

  const activityMetrics = [
    {
      label: 'Posts This Week',
      value: stats.total_posts_created,
      trend: calculateTrend(stats.total_posts_created),
      icon: FiActivity,
      color: 'text-neon-purple',
      bgColor: 'from-neon-purple/20 to-neon-purple/5',
      borderColor: 'border-neon-purple/30',
    },
    {
      label: 'Events Attended',
      value: stats.total_events_attended,
      trend: calculateTrend(stats.total_events_attended),
      icon: FiCalendar,
      color: 'text-neon-pink',
      bgColor: 'from-neon-pink/20 to-neon-pink/5',
      borderColor: 'border-neon-pink/30',
    },
    {
      label: 'Comments Made',
      value: stats.total_comments_made,
      trend: calculateTrend(stats.total_comments_made),
      icon: FiTrendingUp,
      color: 'text-blue-400',
      bgColor: 'from-blue-400/20 to-blue-400/5',
      borderColor: 'border-blue-400/30',
    },
    {
      label: 'Engagement',
      value: stats.total_likes_received,
      trend: calculateTrend(stats.total_likes_received),
      icon: FiClock,
      color: 'text-green-400',
      bgColor: 'from-green-400/20 to-green-400/5',
      borderColor: 'border-green-400/30',
    },
  ]

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <FiTrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Recent Activity</h2>
            <p className="text-sm text-text-secondary">Your engagement trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/30 rounded-lg">
          <div className="w-2 h-2 bg-neon-purple rounded-full animate-pulse" />
          <span className="text-xs text-neon-purple font-medium">Live</span>
        </div>
      </div>

      {/* Activity Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {activityMetrics.map((metric, index) => (
          <div
            key={index}
            className={`relative overflow-hidden bg-gradient-to-br ${metric.bgColor} border ${metric.borderColor} rounded-xl p-4 group hover:shadow-lg transition-all duration-300`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-lg bg-bg-secondary/50 flex items-center justify-center`}
              >
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              {metric.trend && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    metric.trend.isPositive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {metric.trend.isPositive ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
                  {Math.abs(metric.trend.change)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">{metric.value}</div>
            <div className="text-xs text-text-secondary">{metric.label}</div>

            {/* Hover effect glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current Streak */}
        <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <span className="text-lg">🔥</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{stats.current_streak}</div>
              <div className="text-sm text-text-secondary">Day Streak</div>
            </div>
          </div>
        </div>

        {/* Weekly Goal Progress */}
        <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text-secondary">Weekly Goal</span>
                <span className="text-sm font-medium text-green-400">75%</span>
              </div>
              <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full w-3/4 transition-all duration-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
