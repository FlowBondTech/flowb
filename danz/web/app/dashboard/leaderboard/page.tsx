'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useAuth } from '@/src/contexts/AuthContext'
import {
  LeaderboardMetric,
  useGetGlobalLeaderboardQuery,
  useGetMyLeaderboardSummaryQuery,
  useGetMyProfileQuery,
  useGetWeeklyLeaderboardQuery,
} from '@/src/generated/graphql'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  FiAlertCircle,
  FiArrowLeft,
  FiAward,
  FiCalendar,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from 'react-icons/fi'

type TimeFilter = 'weekly' | 'monthly' | 'allTime'
type MetricKey = 'xp' | 'points' | 'events_attended' | 'streak'

/** Normalized entry shape used across both global and weekly queries */
interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  level: number
  value: number
  is_current_user: boolean
  rank_change: number | null
}

const metricToEnum: Record<MetricKey, LeaderboardMetric> = {
  xp: LeaderboardMetric.Xp,
  points: LeaderboardMetric.Points,
  events_attended: LeaderboardMetric.EventsAttended,
  streak: LeaderboardMetric.Streak,
}

const metricLabels: Record<MetricKey, { short: string; unit: string }> = {
  xp: { short: 'XP', unit: 'XP' },
  points: { short: 'Points', unit: 'pts' },
  events_attended: { short: 'Attended', unit: 'events' },
  streak: { short: 'Streak', unit: 'days' },
}

const LEADERBOARD_LIMIT = 20

export default function LeaderboardPage() {
  const { isAuthenticated } = useAuth()
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('allTime')
  const [metricKey, setMetricKey] = useState<MetricKey>('xp')

  const { data: profileData } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })

  const currentUserId = profileData?.me?.privy_id

  const metric = metricToEnum[metricKey]

  // Fetch global leaderboard (for allTime and monthly)
  const {
    data: globalData,
    loading: globalLoading,
    error: globalError,
  } = useGetGlobalLeaderboardQuery({
    variables: { metric, limit: LEADERBOARD_LIMIT },
    skip: timeFilter === 'weekly',
  })

  // Fetch weekly leaderboard
  const {
    data: weeklyData,
    loading: weeklyLoading,
    error: weeklyError,
  } = useGetWeeklyLeaderboardQuery({
    variables: { metric, limit: LEADERBOARD_LIMIT },
    skip: timeFilter !== 'weekly',
  })

  // Fetch user's leaderboard summary for rank badge
  const { data: summaryData } = useGetMyLeaderboardSummaryQuery({
    skip: !isAuthenticated,
  })

  // Normalize entries into a common shape
  const entries: LeaderboardEntry[] = useMemo(() => {
    if (timeFilter === 'weekly') {
      return (weeklyData?.weeklyLeaderboard?.entries ?? []).map(e => ({
        rank: e.rank,
        user_id: e.user_id,
        username: e.username,
        display_name: e.display_name ?? null,
        avatar_url: e.avatar_url ?? null,
        level: e.level,
        value: e.value,
        is_current_user: e.is_current_user,
        rank_change: null,
      }))
    }
    return (globalData?.globalLeaderboard?.entries ?? []).map(e => ({
      rank: e.rank,
      user_id: e.user_id,
      username: e.username,
      display_name: e.display_name ?? null,
      avatar_url: e.avatar_url ?? null,
      level: e.level,
      value: e.value,
      is_current_user: e.is_current_user,
      rank_change: e.rank_change ?? null,
    }))
  }, [timeFilter, weeklyData, globalData])

  const currentUserEntry = useMemo(() => {
    if (timeFilter === 'weekly') {
      return weeklyData?.weeklyLeaderboard?.current_user_entry ?? null
    }
    return globalData?.globalLeaderboard?.current_user_entry ?? null
  }, [timeFilter, weeklyData, globalData])

  const totalParticipants = useMemo(() => {
    if (timeFilter === 'weekly') {
      return weeklyData?.weeklyLeaderboard?.total_participants ?? 0
    }
    return globalData?.globalLeaderboard?.total_participants ?? 0
  }, [timeFilter, weeklyData, globalData])

  const loading = timeFilter === 'weekly' ? weeklyLoading : globalLoading
  const error = timeFilter === 'weekly' ? weeklyError : globalError

  // Current user rank from the leaderboard response or summary
  const currentUserRank = currentUserEntry?.rank ?? summaryData?.myLeaderboardSummary?.global_rank ?? null

  const formatValue = (value: number) => value.toLocaleString()

  const activeUnit = metricLabels[metricKey].unit

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Back Navigation */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <FiArrowLeft size={20} />
          <span>Back to Events</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 3,
                ease: 'easeInOut',
              }}
              className="text-5xl"
            >
              🏆
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
                Dance Leaderboard
              </h1>
              <p className="text-text-secondary mt-1">
                Top dancers in the community
                {totalParticipants > 0 && (
                  <span className="ml-2 text-text-secondary/70">
                    ({totalParticipants.toLocaleString()} participants)
                  </span>
                )}
              </p>
            </div>
          </div>

          {currentUserRank != null && currentUserRank > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 rounded-2xl border border-neon-purple/30"
            >
              <FiZap className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-text-secondary">Your Rank</p>
                <p className="text-3xl font-bold text-text-primary">#{currentUserRank}</p>
              </div>
              {currentUserEntry?.value != null && (
                <div className="ml-2 text-right">
                  <p className="text-lg font-bold text-yellow-400">
                    {formatValue(currentUserEntry.value)}
                  </p>
                  <p className="text-xs text-text-secondary">{activeUnit}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Time Filter */}
          <div className="flex items-center gap-2 bg-bg-secondary rounded-xl p-1.5 border border-white/10 overflow-x-auto">
            {(['weekly', 'monthly', 'allTime'] as TimeFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  timeFilter === filter
                    ? 'bg-neon-purple text-text-primary shadow-lg shadow-neon-purple/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                {filter === 'weekly' ? 'Week' : filter === 'monthly' ? 'Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-1 sm:gap-2 bg-bg-secondary rounded-xl p-1.5 border border-white/10 overflow-x-auto">
            {(
              [
                { key: 'xp' as MetricKey, icon: FiZap, label: 'XP' },
                { key: 'points' as MetricKey, icon: FiStar, label: 'Points' },
                { key: 'events_attended' as MetricKey, icon: FiUsers, label: 'Attended' },
                { key: 'streak' as MetricKey, icon: FiTrendingUp, label: 'Streak' },
              ]
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setMetricKey(key)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  metricKey === key
                    ? 'bg-neon-purple text-text-primary shadow-lg shadow-neon-purple/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin mb-4" />
            <p className="text-text-secondary text-sm">Loading leaderboard...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-bg-secondary rounded-2xl border border-red-500/20 p-8 text-center">
            <FiAlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-text-primary mb-2">Failed to load leaderboard</h2>
            <p className="text-text-secondary text-sm mb-4">
              {error.message || 'Something went wrong. Please try again later.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-neon-purple text-text-primary rounded-lg text-sm font-medium hover:bg-neon-purple/80 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && entries.length === 0 && (
          <div className="bg-bg-secondary rounded-2xl border border-white/10 p-12 text-center">
            <div className="text-5xl mb-4">🕺</div>
            <h2 className="text-lg font-bold text-text-primary mb-2">No rankings yet</h2>
            <p className="text-text-secondary text-sm">
              Be the first to climb the leaderboard! Start attending events and earning XP.
            </p>
          </div>
        )}

        {/* Content when data is available */}
        {!loading && !error && entries.length > 0 && (
          <>
            {/* Top 3 Podium */}
            <div className="bg-bg-secondary rounded-2xl border border-white/10 p-8 mb-8 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-b from-neon-purple/10 via-transparent to-transparent" />

              <div className="relative flex items-end justify-center gap-4 sm:gap-8">
                {/* 2nd Place */}
                {entries[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-center"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 mx-auto mb-3 overflow-hidden border-4 border-gray-400 shadow-xl shadow-gray-500/30 flex items-center justify-center text-white text-xl font-bold">
                        {entries[1].avatar_url ? (
                          <img
                            src={entries[1].avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (entries[1].display_name?.[0] || entries[1].username[0])
                        )}
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-3xl">🥈</span>
                    </div>
                    <p className="font-bold text-text-primary mt-3 truncate max-w-[120px]">
                      {entries[1].is_current_user ? 'You' : (entries[1].display_name || entries[1].username)}
                    </p>
                    <p className="text-lg text-yellow-400 font-medium">
                      {formatValue(entries[1].value)} {activeUnit}
                    </p>
                    <p className="text-sm text-text-secondary">Level {entries[1].level}</p>
                    <div className="h-24 w-28 bg-gray-500/20 rounded-t-xl mt-4 flex items-center justify-center border-t border-l border-r border-gray-500/30">
                      <span className="text-4xl font-bold text-gray-400">2</span>
                    </div>
                  </motion.div>
                )}

                {/* 1st Place */}
                {entries[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mx-auto mb-3 overflow-hidden border-4 border-yellow-400 shadow-2xl shadow-yellow-500/40 flex items-center justify-center text-white text-3xl font-bold"
                      >
                        {entries[0].avatar_url ? (
                          <img
                            src={entries[0].avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (entries[0].display_name?.[0] || entries[0].username[0])
                        )}
                      </motion.div>
                      <motion.span
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-4xl"
                      >
                        👑
                      </motion.span>
                    </div>
                    <p className="font-bold text-text-primary text-lg mt-3 truncate max-w-[140px]">
                      {entries[0].is_current_user ? 'You' : (entries[0].display_name || entries[0].username)}
                    </p>
                    <p className="text-xl text-yellow-400 font-bold">
                      {formatValue(entries[0].value)} {activeUnit}
                    </p>
                    <p className="text-sm text-text-secondary">Level {entries[0].level}</p>
                    <div className="h-32 w-32 bg-yellow-500/20 rounded-t-xl mt-4 flex items-center justify-center border-t border-l border-r border-yellow-500/30">
                      <span className="text-5xl font-bold text-yellow-400">1</span>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {entries[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 mx-auto mb-3 overflow-hidden border-4 border-orange-400 shadow-xl shadow-orange-500/30 flex items-center justify-center text-white text-xl font-bold">
                        {entries[2].avatar_url ? (
                          <img
                            src={entries[2].avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (entries[2].display_name?.[0] || entries[2].username[0])
                        )}
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-3xl">🥉</span>
                    </div>
                    <p className="font-bold text-text-primary mt-3 truncate max-w-[120px]">
                      {entries[2].is_current_user ? 'You' : (entries[2].display_name || entries[2].username)}
                    </p>
                    <p className="text-lg text-yellow-400 font-medium">
                      {formatValue(entries[2].value)} {activeUnit}
                    </p>
                    <p className="text-sm text-text-secondary">Level {entries[2].level}</p>
                    <div className="h-20 w-28 bg-orange-500/20 rounded-t-xl mt-4 flex items-center justify-center border-t border-l border-r border-orange-500/30">
                      <span className="text-4xl font-bold text-orange-400">3</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Full Rankings List */}
            <div className="bg-bg-secondary rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <FiAward className="w-5 h-5 text-neon-purple" />
                  All Rankings
                </h2>
              </div>

              <div className="divide-y divide-white/5">
                {entries.slice(3).map((entry, index) => {
                  const rank = entry.rank
                  const isCurrentUser = entry.is_current_user
                  const rankChange = entry.rank_change

                  return (
                    <motion.div
                      key={entry.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`flex items-center gap-4 p-4 sm:p-5 transition-colors ${
                        isCurrentUser
                          ? 'bg-gradient-to-r from-neon-purple/20 to-transparent'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="w-10 text-center">
                        <span className="text-lg font-bold text-text-secondary">{rank}</span>
                      </div>

                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink overflow-hidden flex items-center justify-center text-white font-bold text-lg">
                        {entry.avatar_url ? (
                          <img
                            src={entry.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (entry.display_name?.[0] || entry.username[0])
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {isCurrentUser ? 'You' : (entry.display_name || entry.username)}
                          {isCurrentUser && <span className="text-neon-purple ml-2">(You)</span>}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mt-1">
                          <span className="flex items-center gap-1">
                            <FiStar className="w-3 h-3 text-yellow-500" />
                            Level {entry.level}
                          </span>
                          {entry.username && (
                            <span className="text-text-secondary/60">
                              @{entry.username}
                            </span>
                          )}
                          {rankChange != null && rankChange !== 0 && (
                            <span className={`flex items-center gap-1 ${rankChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              <FiTrendingUp className={`w-3 h-3 ${rankChange < 0 ? 'rotate-180' : ''}`} />
                              {rankChange > 0 ? '+' : ''}{rankChange}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-yellow-400">{formatValue(entry.value)}</p>
                        <p className="text-xs text-text-secondary">{activeUnit}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* How to Climb Section */}
        <div className="mt-8 bg-bg-secondary rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
            <FiTarget className="w-5 h-5 text-neon-purple" />
            How to Climb the Leaderboard
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: FiCalendar,
                label: 'Create Events',
                xp: '+100 XP',
                desc: 'Host dance events',
              },
              {
                icon: FiUsers,
                label: 'Attend Events',
                xp: '+25 XP',
                desc: 'Join community events',
              },
              { icon: FiTrendingUp, label: 'Build Streaks', xp: '+10 XP/day', desc: 'Dance daily' },
              { icon: FiStar, label: 'Level Up', xp: 'Bonus XP', desc: 'Unlock achievements' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-neon-purple/30 transition-colors"
              >
                <item.icon className="w-6 h-6 text-neon-purple mb-2" />
                <p className="font-medium text-text-primary">{item.label}</p>
                <p className="text-sm text-yellow-400">{item.xp}</p>
                <p className="text-xs text-text-secondary mt-1">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
