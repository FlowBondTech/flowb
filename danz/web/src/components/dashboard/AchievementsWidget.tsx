'use client'

import { useState } from 'react'
import { FiAward, FiLock, FiTrendingUp, FiZap, FiAlertCircle } from 'react-icons/fi'
import {
  AchievementRarity,
  useGetMyAchievementsQuery,
  useGetMyAchievementStatsQuery,
} from '@/src/generated/graphql'

const getRarityColor = (rarity: AchievementRarity) => {
  switch (rarity) {
    case AchievementRarity.Legendary:
      return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/40'
    case AchievementRarity.Epic:
      return 'from-purple-500/20 to-pink-500/20 border-purple-500/40'
    case AchievementRarity.Rare:
      return 'from-blue-500/20 to-cyan-500/20 border-blue-500/40'
    case AchievementRarity.Uncommon:
      return 'from-green-500/20 to-emerald-500/20 border-green-500/40'
    default:
      return 'from-gray-500/20 to-gray-400/20 border-gray-500/40'
  }
}

const getRarityBadgeColor = (rarity: AchievementRarity) => {
  switch (rarity) {
    case AchievementRarity.Legendary:
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case AchievementRarity.Epic:
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case AchievementRarity.Rare:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case AchievementRarity.Uncommon:
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

const getRarityLabel = (rarity: AchievementRarity) => {
  switch (rarity) {
    case AchievementRarity.Legendary:
      return 'legendary'
    case AchievementRarity.Epic:
      return 'epic'
    case AchievementRarity.Rare:
      return 'rare'
    case AchievementRarity.Uncommon:
      return 'uncommon'
    default:
      return 'common'
  }
}

export default function AchievementsWidget() {
  const [showAll, setShowAll] = useState(false)
  const { data, loading, error } = useGetMyAchievementsQuery()
  const { data: statsData } = useGetMyAchievementStatsQuery()

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <FiAward className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Achievements</h2>
        </div>
        <div className="flex items-center gap-2 text-red-400 py-4">
          <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Failed to load achievements. Please try again later.</p>
        </div>
      </div>
    )
  }

  const achievements = data?.myAchievements ?? []

  if (achievements.length === 0) {
    return (
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <FiAward className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Achievements</h2>
        </div>
        <div className="text-center py-6">
          <p className="text-text-secondary text-sm">
            No achievements available yet. Start dancing to unlock your first achievement!
          </p>
        </div>
      </div>
    )
  }

  const earnedAchievements = achievements.filter(a => a.is_unlocked)
  const lockedAchievements = achievements.filter(a => !a.is_unlocked)
  const displayAchievements = showAll
    ? achievements
    : [...earnedAchievements.slice(0, 2), ...lockedAchievements.slice(0, 2)]

  const totalUnlocked = statsData?.myAchievementStats?.total_unlocked ?? earnedAchievements.length
  const totalAvailable =
    statsData?.myAchievementStats?.total_available ?? achievements.length
  const completionPercent =
    totalAvailable > 0 ? Math.round((totalUnlocked / totalAvailable) * 100) : 0

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <FiAward className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Achievements</h2>
            <p className="text-sm text-text-secondary">
              {totalUnlocked} of {totalAvailable} unlocked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <FiTrendingUp size={14} className="text-yellow-400" />
          <span className="text-xs font-medium text-yellow-400">{completionPercent}%</span>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {displayAchievements.map(achievement => (
          <div
            key={achievement.achievement_type}
            className={`relative overflow-hidden bg-gradient-to-br ${
              achievement.is_unlocked
                ? getRarityColor(achievement.rarity)
                : 'from-white/5 to-white/5 border-white/10'
            } border rounded-xl p-4 transition-all ${
              achievement.is_unlocked
                ? 'hover:shadow-lg cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            {/* Rarity Badge */}
            <div className="flex items-start justify-between mb-3">
              <div
                className={`text-3xl ${
                  achievement.is_unlocked ? 'grayscale-0' : 'grayscale opacity-50'
                }`}
              >
                {achievement.is_unlocked ? (
                  achievement.icon
                ) : (
                  <FiLock className="w-6 h-6" />
                )}
              </div>
              <span
                className={`px-2 py-0.5 ${getRarityBadgeColor(
                  achievement.rarity,
                )} border rounded-full text-xs font-medium capitalize`}
              >
                {getRarityLabel(achievement.rarity)}
              </span>
            </div>

            {/* Title & Description */}
            <h3
              className={`text-sm font-semibold mb-1 ${
                achievement.is_unlocked ? 'text-text-primary' : 'text-text-muted'
              }`}
            >
              {achievement.title}
            </h3>
            <p className="text-xs text-text-secondary mb-3">{achievement.description}</p>

            {/* Progress Bar (for locked achievements) */}
            {!achievement.is_unlocked && achievement.target > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Progress</span>
                  <span className="text-text-secondary font-medium">
                    {achievement.current_progress}/{achievement.target}
                  </span>
                </div>
                <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(achievement.percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Earned Date */}
            {achievement.is_unlocked && achievement.unlocked_at && (
              <div className="flex items-center gap-1 text-xs text-text-muted mt-2">
                <FiZap size={12} className="text-yellow-400" />
                <span>
                  Unlocked{' '}
                  {new Date(achievement.unlocked_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}

            {/* Shine effect for earned achievements */}
            {achievement.is_unlocked && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full" />
            )}
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {achievements.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2.5 bg-bg-primary/50 hover:bg-bg-primary border border-white/10 hover:border-neon-purple/30 rounded-xl text-text-secondary hover:text-neon-purple text-sm font-medium transition-all"
        >
          {showAll ? 'Show Less' : `View All ${achievements.length} Achievements`}
        </button>
      )}
    </div>
  )
}
