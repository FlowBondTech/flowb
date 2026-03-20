'use client'

import { motion } from 'motion/react'
import { useState } from 'react'
import { FiAward, FiCalendar, FiChevronRight, FiTrendingUp, FiUsers, FiZap } from 'react-icons/fi'

interface LeaderboardUser {
  id: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
  xp: number
  level: number
  events_created: number
  events_attended: number
  streak?: number
}

interface LeaderboardProps {
  users: LeaderboardUser[]
  currentUserId?: string
  variant?: 'full' | 'compact' | 'mini'
}

const RANK_BADGES: Record<number, { emoji: string; color: string; bg: string }> = {
  1: { emoji: '👑', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  2: { emoji: '🥈', color: 'text-gray-300', bg: 'bg-gray-500/20' },
  3: { emoji: '🥉', color: 'text-orange-400', bg: 'bg-orange-500/20' },
}

type TimeFilter = 'weekly' | 'monthly' | 'allTime'
type SortBy = 'xp' | 'events_created' | 'events_attended' | 'streak'

export default function Leaderboard({ users, currentUserId, variant = 'full' }: LeaderboardProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly')
  const [sortBy, setSortBy] = useState<SortBy>('xp')

  // Sort users based on criteria
  const sortedUsers = [...users].sort((a, b) => {
    switch (sortBy) {
      case 'xp':
        return b.xp - a.xp
      case 'events_created':
        return b.events_created - a.events_created
      case 'events_attended':
        return b.events_attended - a.events_attended
      case 'streak':
        return (b.streak || 0) - (a.streak || 0)
      default:
        return b.xp - a.xp
    }
  })

  // Find current user's rank
  const currentUserRank = currentUserId
    ? sortedUsers.findIndex(u => u.id === currentUserId) + 1
    : null

  if (variant === 'mini') {
    return (
      <div className="bg-bg-secondary rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <FiTrendingUp className="w-4 h-4 text-neon-purple" />
            Top Dancers
          </h3>
          <button className="text-sm text-neon-purple hover:text-neon-pink transition-colors flex items-center gap-1">
            View All <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {sortedUsers.slice(0, 3).map((user, index) => (
            <div
              key={user.id}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                user.id === currentUserId ? 'bg-neon-purple/20' : ''
              }`}
            >
              <span className="text-lg">{RANK_BADGES[index + 1]?.emoji}</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-sm font-bold">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user.display_name?.[0] || user.username[0]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm truncate">
                  {user.display_name || user.username}
                </p>
              </div>
              <span className="text-sm text-yellow-400 font-medium">
                {user.xp.toLocaleString()} XP
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FiAward className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </h3>
          {currentUserRank && (
            <div className="px-3 py-1 bg-neon-purple/20 text-neon-purple rounded-full text-sm">
              Your Rank: #{currentUserRank}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {sortedUsers.slice(0, 5).map((user, index) => {
            const rank = index + 1
            const badge = RANK_BADGES[rank]
            const isCurrentUser = user.id === currentUserId

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                  isCurrentUser
                    ? 'bg-gradient-to-r from-neon-purple/20 to-transparent border border-neon-purple/30'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${badge?.bg || 'bg-white/10'}`}
                >
                  {badge ? (
                    <span className="text-lg">{badge.emoji}</span>
                  ) : (
                    <span className="font-bold text-text-secondary">{rank}</span>
                  )}
                </div>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-primary font-bold">
                      {user.display_name?.[0] || user.username[0]}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {user.display_name || user.username}
                    {isCurrentUser && <span className="text-neon-purple ml-2">(You)</span>}
                  </p>
                  <p className="text-sm text-text-secondary">Level {user.level}</p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-yellow-400">{user.xp.toLocaleString()} XP</p>
                  <p className="text-xs text-text-secondary">{user.events_attended} events</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <div className="bg-bg-secondary rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <FiAward className="w-6 h-6 text-yellow-500" />
              Dance Leaderboard
            </h2>
            <p className="text-sm text-text-secondary mt-1">Top dancers in the community</p>
          </div>

          {currentUserRank && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 rounded-xl border border-neon-purple/30"
            >
              <FiZap className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-text-secondary">Your Rank</p>
                <p className="text-xl font-bold text-text-primary">#{currentUserRank}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          {/* Time Filter */}
          <div className="flex items-center gap-2 bg-bg-primary rounded-lg p-1">
            {(['weekly', 'monthly', 'allTime'] as TimeFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeFilter === filter
                    ? 'bg-neon-purple text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {filter === 'weekly'
                  ? 'This Week'
                  : filter === 'monthly'
                    ? 'This Month'
                    : 'All Time'}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 bg-bg-primary rounded-lg p-1">
            {(
              [
                { key: 'xp', icon: FiZap, label: 'XP' },
                { key: 'events_created', icon: FiCalendar, label: 'Created' },
                { key: 'events_attended', icon: FiUsers, label: 'Attended' },
                { key: 'streak', icon: FiTrendingUp, label: 'Streak' },
              ] as { key: SortBy; icon: typeof FiZap; label: string }[]
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === key
                    ? 'bg-neon-purple text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="p-6 bg-gradient-to-b from-neon-purple/10 to-transparent">
        <div className="flex items-end justify-center gap-4">
          {/* 2nd Place */}
          {sortedUsers[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 mx-auto mb-2 overflow-hidden border-2 border-gray-400">
                  {sortedUsers[1].avatar_url ? (
                    <img
                      src={sortedUsers[1].avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-primary text-xl font-bold">
                      {sortedUsers[1].display_name?.[0] || sortedUsers[1].username[0]}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-2xl">🥈</span>
              </div>
              <p className="font-medium text-text-primary mt-2 truncate max-w-[100px]">
                {sortedUsers[1].display_name || sortedUsers[1].username}
              </p>
              <p className="text-sm text-yellow-400">{sortedUsers[1].xp.toLocaleString()} XP</p>
              <div className="h-20 w-24 bg-gray-500/30 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-400">2</span>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {sortedUsers[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="relative">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mx-auto mb-2 overflow-hidden border-4 border-yellow-400 shadow-lg shadow-yellow-500/30"
                >
                  {sortedUsers[0].avatar_url ? (
                    <img
                      src={sortedUsers[0].avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-primary text-2xl font-bold">
                      {sortedUsers[0].display_name?.[0] || sortedUsers[0].username[0]}
                    </div>
                  )}
                </motion.div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-3xl">👑</span>
              </div>
              <p className="font-bold text-text-primary mt-2 truncate max-w-[120px]">
                {sortedUsers[0].display_name || sortedUsers[0].username}
              </p>
              <p className="text-sm text-yellow-400 font-medium">
                {sortedUsers[0].xp.toLocaleString()} XP
              </p>
              <div className="h-28 w-28 bg-yellow-500/30 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-4xl font-bold text-yellow-400">1</span>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {sortedUsers[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 mx-auto mb-2 overflow-hidden border-2 border-orange-400">
                  {sortedUsers[2].avatar_url ? (
                    <img
                      src={sortedUsers[2].avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-primary text-xl font-bold">
                      {sortedUsers[2].display_name?.[0] || sortedUsers[2].username[0]}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-2xl">🥉</span>
              </div>
              <p className="font-medium text-text-primary mt-2 truncate max-w-[100px]">
                {sortedUsers[2].display_name || sortedUsers[2].username}
              </p>
              <p className="text-sm text-yellow-400">{sortedUsers[2].xp.toLocaleString()} XP</p>
              <div className="h-16 w-24 bg-orange-500/30 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-3xl font-bold text-orange-400">3</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Full Rankings List */}
      <div className="p-6">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">
          All Rankings
        </h3>
        <div className="space-y-2">
          {sortedUsers.slice(3).map((user, index) => {
            const rank = index + 4
            const isCurrentUser = user.id === currentUserId

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                  isCurrentUser
                    ? 'bg-gradient-to-r from-neon-purple/20 to-transparent border border-neon-purple/30'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="w-8 text-center">
                  <span className="font-bold text-text-secondary">{rank}</span>
                </div>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-primary font-bold">
                      {user.display_name?.[0] || user.username[0]}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {user.display_name || user.username}
                    {isCurrentUser && <span className="text-neon-purple ml-2">(You)</span>}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>Level {user.level}</span>
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-3 h-3" />
                      {user.events_created} created
                    </span>
                    <span className="flex items-center gap-1">
                      <FiUsers className="w-3 h-3" />
                      {user.events_attended} attended
                    </span>
                    {user.streak && user.streak > 0 && (
                      <span className="flex items-center gap-1 text-orange-400">
                        <FiTrendingUp className="w-3 h-3" />
                        {user.streak} day streak
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-yellow-400">{user.xp.toLocaleString()}</p>
                  <p className="text-xs text-text-secondary">XP</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
