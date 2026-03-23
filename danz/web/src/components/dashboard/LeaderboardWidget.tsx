'use client'

import { LeaderboardMetric, useGetGlobalLeaderboardQuery } from '@/src/generated/graphql'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FiAward, FiTrendingUp, FiZap } from 'react-icons/fi'

type CategoryKey = 'xp' | 'streak' | 'events'

const categoryToMetric: Record<CategoryKey, LeaderboardMetric> = {
  xp: LeaderboardMetric.Xp,
  streak: LeaderboardMetric.Streak,
  events: LeaderboardMetric.EventsAttended,
}

export default function LeaderboardWidget() {
  const router = useRouter()
  const [category, setCategory] = useState<CategoryKey>('xp')

  const { data, loading } = useGetGlobalLeaderboardQuery({
    variables: {
      metric: categoryToMetric[category],
      limit: 10,
    },
  })

  const getRankMedal = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return null
    }
  }

  const getChangeIndicator = (change: number | null | undefined) => {
    if (!change) return <span className="text-xs text-text-muted">-</span>

    if (change > 0) {
      return (
        <div className="flex items-center gap-0.5 text-green-400">
          <FiTrendingUp size={12} />
          <span className="text-xs font-medium">+{change}</span>
        </div>
      )
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-0.5 text-red-400">
          <FiTrendingUp size={12} className="rotate-180" />
          <span className="text-xs font-medium">{change}</span>
        </div>
      )
    }
    return <span className="text-xs text-text-muted">-</span>
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

  const entries = data?.globalLeaderboard?.entries || []
  const currentUserEntry = data?.globalLeaderboard?.current_user_entry
  const nearbyEntries = data?.globalLeaderboard?.nearby_entries || []

  // Build display entries: top 3 + current user context
  const displayEntries = entries.slice(0, 3)

  // Add current user if not in top 3
  if (currentUserEntry && currentUserEntry.rank > 3) {
    displayEntries.push({
      rank: currentUserEntry.rank,
      username: 'current_user',
      display_name: 'You',
      avatar_url: null,
      value: currentUserEntry.value,
      rank_change: 0,
      is_current_user: true,
      user_id: '',
      previous_rank: null,
      level: 1,
      country: null,
    })
  }

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <FiAward className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Leaderboard</h2>
            <p className="text-sm text-text-secondary">Top dancers this week</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/leaderboard')}
          className="text-sm text-neon-purple hover:text-neon-pink font-medium transition-colors"
        >
          View All
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'xp' as const, label: 'XP' },
          { key: 'streak' as const, label: 'Streak' },
          { key: 'events' as const, label: 'Events' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              category === tab.key
                ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                : 'bg-bg-primary/30 text-text-secondary border border-white/5 hover:border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      {displayEntries.length > 0 ? (
        <div className="space-y-2">
          {displayEntries.map(entry => (
            <div
              key={entry.rank}
              onClick={() => !entry.is_current_user && router.push(`/profile/${entry.username}`)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                entry.is_current_user
                  ? 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border-2 border-neon-purple/50'
                  : 'bg-bg-primary/30 border border-white/5 hover:border-neon-purple/30 cursor-pointer'
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 text-center">
                {getRankMedal(entry.rank) || (
                  <span
                    className={`text-sm font-bold ${
                      entry.is_current_user ? 'text-neon-purple' : 'text-text-secondary'
                    }`}
                  >
                    #{entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt={entry.display_name || entry.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-bg-secondary"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full ${
                      entry.is_current_user
                        ? 'bg-gradient-to-br from-neon-purple to-neon-pink'
                        : 'bg-gradient-to-br from-gray-500 to-gray-600'
                    } flex items-center justify-center text-white font-bold text-sm border-2 border-bg-secondary`}
                  >
                    {(entry.display_name || entry.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name & Score */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm font-semibold truncate ${
                    entry.is_current_user ? 'text-neon-purple' : 'text-text-primary'
                  }`}
                >
                  {entry.is_current_user ? 'You' : entry.display_name || entry.username}
                </h3>
                {!entry.is_current_user && entry.username && (
                  <p className="text-xs text-text-muted">@{entry.username}</p>
                )}
              </div>

              {/* Score & Change */}
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-1.5 text-text-primary font-bold text-sm mb-0.5">
                  <FiZap size={14} className="text-yellow-400" />
                  <span>{entry.value.toLocaleString()}</span>
                </div>
                {getChangeIndicator(entry.rank_change)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-500/10 flex items-center justify-center">
            <FiAward className="w-6 h-6 text-orange-400" />
          </div>
          <p className="text-sm text-text-secondary">No leaderboard data yet</p>
        </div>
      )}

      {/* Full Leaderboard Button */}
      <button
        onClick={() => router.push('/dashboard/leaderboard')}
        className="w-full mt-4 py-2.5 bg-bg-primary/50 hover:bg-bg-primary border border-white/10 hover:border-orange-500/30 rounded-xl text-text-secondary hover:text-orange-400 text-sm font-medium transition-all"
      >
        View Full Leaderboard
      </button>
    </div>
  )
}
