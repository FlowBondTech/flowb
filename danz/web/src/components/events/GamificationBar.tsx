'use client'

import { motion } from 'motion/react'
import { FiAward, FiStar, FiTarget, FiTrendingUp, FiZap } from 'react-icons/fi'

interface GamificationBarProps {
  xp: number
  level: number
  eventsCreated: number
  eventsAttended: number
  streak?: number
}

const LEVEL_XP = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500]

export default function GamificationBar({
  xp = 0,
  level = 1,
  eventsCreated = 0,
  eventsAttended = 0,
  streak = 0,
}: GamificationBarProps) {
  const currentLevelXP = LEVEL_XP[level - 1] || 0
  const nextLevelXP = LEVEL_XP[level] || LEVEL_XP[LEVEL_XP.length - 1]
  const progressXP = xp - currentLevelXP
  const requiredXP = nextLevelXP - currentLevelXP
  const progressPercent = Math.min((progressXP / requiredXP) * 100, 100)

  return (
    <div className="bg-gradient-to-r from-bg-secondary via-bg-secondary to-neon-purple/10 rounded-2xl border border-neon-purple/20 p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
        {/* Level Badge */}
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.05, rotate: 5 }} className="relative">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple via-neon-pink to-neon-blue flex items-center justify-center shadow-lg shadow-neon-purple/30">
              <span className="text-2xl font-black text-text-primary">{level}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
              <FiStar className="w-3 h-3 text-text-primary" />
            </div>
          </motion.div>

          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide">Level</p>
            <p className="text-lg font-bold text-text-primary">Dancer Lvl {level}</p>
          </div>
        </div>

        {/* XP Progress */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FiZap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-text-secondary">
                {progressXP.toLocaleString()} / {requiredXP.toLocaleString()} XP
              </span>
            </div>
            <span className="text-sm text-neon-purple font-medium">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-neon-purple via-neon-pink to-neon-blue rounded-full relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-neon-purple">
              <FiTarget className="w-4 h-4" />
              <span className="text-lg font-bold">{eventsCreated}</span>
            </div>
            <p className="text-xs text-text-secondary">Created</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-400">
              <FiAward className="w-4 h-4" />
              <span className="text-lg font-bold">{eventsAttended}</span>
            </div>
            <p className="text-xs text-text-secondary">Attended</p>
          </div>

          {streak > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-400">
                <FiTrendingUp className="w-4 h-4" />
                <span className="text-lg font-bold">{streak}</span>
              </div>
              <p className="text-xs text-text-secondary">Day Streak</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
