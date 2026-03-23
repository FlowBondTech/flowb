'use client'

import {
  ChallengeDifficulty,
  ChallengeStatus,
  useGetDailyChallengesQuery,
} from '@/src/generated/graphql'
import { FiAward, FiTarget, FiTrendingUp, FiZap } from 'react-icons/fi'

const getDifficultyColor = (difficulty: ChallengeDifficulty) => {
  switch (difficulty) {
    case ChallengeDifficulty.Hard:
    case ChallengeDifficulty.Extreme:
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case ChallengeDifficulty.Medium:
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    default:
      return 'bg-green-500/20 text-green-400 border-green-500/30'
  }
}

const getChallengeIcon = (category: string) => {
  switch (category) {
    case 'DANCE':
      return '💃'
    case 'SOCIAL':
      return '⭐'
    case 'EVENTS':
      return '🎪'
    case 'STREAK':
      return '🔥'
    case 'LEARNING':
      return '📚'
    default:
      return '🎯'
  }
}

const getTimeRemaining = (expiresAt: string | null | undefined) => {
  if (!expiresAt) return 'No deadline'

  const now = new Date()
  const expires = new Date(expiresAt)
  const diffMs = expires.getTime() - now.getTime()

  if (diffMs < 0) return 'Expired'

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`
  }
  return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
}

export default function WeeklyChallengesWidget() {
  const { data, loading } = useGetDailyChallengesQuery()

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const challenges = data?.dailyChallenges?.challenges || []
  const userProgress = data?.dailyChallenges?.user_progress || []
  const totalXpAvailable = data?.dailyChallenges?.total_xp_available || 0

  // Map progress to challenges
  const challengesWithProgress = challenges.map(challenge => {
    const progress = userProgress.find(p => p.challenge_id === challenge.id)
    return {
      ...challenge,
      progress: progress?.progress || 0,
      status: progress?.status || ChallengeStatus.Available,
      expiresAt: progress?.expires_at,
    }
  })

  // Filter to active/in-progress challenges
  const activeChallenges = challengesWithProgress.filter(
    c => c.status !== ChallengeStatus.Completed && c.status !== ChallengeStatus.Expired,
  )

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <FiTarget className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Daily Challenges</h2>
            <p className="text-sm text-text-secondary">{activeChallenges.length} active</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
          <FiZap size={14} className="text-green-400" />
          <span className="text-xs font-medium text-green-400">
            {totalXpAvailable.toLocaleString()} XP
          </span>
        </div>
      </div>

      {activeChallenges.length > 0 ? (
        <div className="space-y-3">
          {activeChallenges.slice(0, 3).map(challenge => {
            const progressPercent = challenge.target_value
              ? (challenge.progress / challenge.target_value) * 100
              : 0

            return (
              <div
                key={challenge.id}
                className="p-4 bg-bg-primary/30 border border-white/5 hover:border-neon-purple/30 rounded-xl transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">{getChallengeIcon(challenge.category)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-text-primary group-hover:text-neon-purple transition-colors">
                        {challenge.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 ${getDifficultyColor(
                          challenge.difficulty,
                        )} border rounded-full text-xs font-medium capitalize flex-shrink-0`}
                      >
                        {challenge.difficulty.toLowerCase()}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mb-2">{challenge.description}</p>

                    {/* Progress Bar */}
                    {challenge.target_value && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">
                            {challenge.progress}/{challenge.target_value}{' '}
                            {challenge.target_unit || ''}
                          </span>
                          <span className="text-neon-purple font-medium">
                            {challenge.xp_reward} XP
                          </span>
                        </div>
                        <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Expires */}
                    {challenge.expiresAt && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-text-muted">
                        <FiTrendingUp size={12} />
                        <span>Expires in {getTimeRemaining(challenge.expiresAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
            <FiTarget className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-sm text-text-secondary mb-2">No active challenges</p>
          <p className="text-xs text-text-muted">Check back for new challenges!</p>
        </div>
      )}

      {/* All Challenges Button */}
      <button className="w-full mt-4 py-2.5 bg-bg-primary/50 hover:bg-bg-primary border border-white/10 hover:border-green-500/30 rounded-xl text-text-secondary hover:text-green-400 text-sm font-medium transition-all inline-flex items-center justify-center gap-2">
        <FiAward size={16} />
        View All Challenges
      </button>
    </div>
  )
}
