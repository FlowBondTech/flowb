'use client'

import { gql, useQuery } from '@apollo/client'
import {
  FiActivity,
  FiAward,
  FiCalendar,
  FiHeart,
  FiMessageCircle,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from 'react-icons/fi'

const GET_USER_STATS = gql`
  query GetUserStats($userId: String) {
    getUserStats(userId: $userId) {
      total_events_attended
      total_events_hosted
      total_posts_created
      total_comments_made
      total_likes_given
      total_likes_received
      points_earned
      current_points_balance
      referral_points_earned
      total_dance_bonds
      current_streak
      longest_streak
    }
  }
`

interface UserStatsData {
  getUserStats: {
    total_events_attended: number
    total_events_hosted: number
    total_posts_created: number
    total_comments_made: number
    total_likes_given: number
    total_likes_received: number
    points_earned: number
    current_points_balance: number
    referral_points_earned: number
    total_dance_bonds: number
    current_streak: number
    longest_streak: number
  }
}

export default function UserStatsCard() {
  const { data, loading, error } = useQuery<UserStatsData>(GET_USER_STATS)

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-white/5 rounded-2xl p-6">
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

  const statCards = [
    {
      icon: FiCalendar,
      label: 'Events Attended',
      value: stats.total_events_attended,
      color: 'text-neon-purple',
      bgColor: 'bg-neon-purple/10',
    },
    {
      icon: FiActivity,
      label: 'Events Hosted',
      value: stats.total_events_hosted,
      color: 'text-neon-pink',
      bgColor: 'bg-neon-pink/10',
    },
    {
      icon: FiMessageCircle,
      label: 'Posts Created',
      value: stats.total_posts_created,
      color: 'text-neon-cyan',
      bgColor: 'bg-neon-cyan/10',
    },
    {
      icon: FiMessageCircle,
      label: 'Comments Made',
      value: stats.total_comments_made,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      icon: FiHeart,
      label: 'Likes Given',
      value: stats.total_likes_given,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
    },
    {
      icon: FiHeart,
      label: 'Likes Received',
      value: stats.total_likes_received,
      color: 'text-pink-400',
      bgColor: 'bg-pink-400/10',
    },
    {
      icon: FiUsers,
      label: 'Dance Bonds',
      value: stats.total_dance_bonds,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      icon: FiZap,
      label: 'Points Balance',
      value: stats.current_points_balance,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
    {
      icon: FiAward,
      label: 'Total Points Earned',
      value: stats.points_earned,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      icon: FiTrendingUp,
      label: 'Referral Points',
      value: stats.referral_points_earned,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
    },
    {
      icon: FiActivity,
      label: 'Current Streak',
      value: stats.current_streak,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-400/10',
    },
    {
      icon: FiAward,
      label: 'Longest Streak',
      value: stats.longest_streak,
      color: 'text-violet-400',
      bgColor: 'bg-violet-400/10',
    },
  ]

  return (
    <div className="bg-bg-secondary border border-white/5 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
          <FiActivity className="w-5 h-5 text-text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Your Activity</h2>
          <p className="text-sm text-text-secondary">Participation stats and achievements</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-bg-primary/30 border border-white/5 hover:border-white/10 transition-all"
          >
            <div
              className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}
            >
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">{stat.value}</div>
            <div className="text-xs text-text-secondary">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
