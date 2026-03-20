'use client'

import type { SuggestedBond } from '@/src/types/bonds'
import { BondSuggestionSection } from '../bonds'
import { ShareButton } from './ShareButton'
import type { CheckInRewards } from './types'

interface RewardsScreenProps {
  rewards: CheckInRewards
  hasReflection: boolean
  bondSuggestions?: SuggestedBond[]
  onAcceptBond?: (bondId: string) => Promise<void>
  onDeclineBond?: (bondId: string) => Promise<void>
}

// Mock leaderboard data - will be replaced with real data
const MOCK_LEADERBOARD = [
  { rank: 1, username: 'dancequeen', streak: 42, avatar: '👸' },
  { rank: 2, username: 'groovyking', streak: 38, avatar: '🤴' },
  { rank: 3, username: 'flowmaster', streak: 35, avatar: '🧙' },
  { rank: 4, username: 'beatrider', streak: 31, avatar: '🏄' },
  { rank: 5, username: 'rhythmstar', streak: 28, avatar: '⭐' },
]

export function RewardsScreen({
  rewards,
  hasReflection,
  bondSuggestions = [],
  onAcceptBond,
  onDeclineBond,
}: RewardsScreenProps) {
  const handleAcceptBond = async (bondId: string) => {
    if (onAcceptBond) {
      await onAcceptBond(bondId)
    } else {
      // Mock handler for now
      console.log('Accept bond:', bondId)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const handleDeclineBond = async (bondId: string) => {
    if (onDeclineBond) {
      await onDeclineBond(bondId)
    } else {
      // Mock handler for now
      console.log('Decline bond:', bondId)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return (
    <div className="flex flex-col min-h-[500px] px-4 py-6">
      {/* Streak celebration */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple shadow-glow-pink mb-4">
          <span className="text-4xl">🔥</span>
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-1">
          {rewards.newStreak} Day Streak!
        </h1>
        <p className="text-text-muted text-sm">Keep it going!</p>
      </div>

      {/* Rewards breakdown */}
      <div className="bg-bg-card/50 rounded-2xl p-4 mb-6 border border-white/10">
        <h2 className="text-sm text-text-muted mb-3">Today&apos;s Rewards</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Base XP</span>
            <span className="text-neon-blue font-mono">+{rewards.baseXp}</span>
          </div>
          {rewards.streakBonus > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Streak Bonus</span>
              <span className="text-neon-pink font-mono">+{rewards.streakBonus}</span>
            </div>
          )}
          {hasReflection && rewards.reflectionBonus > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Reflection Bonus</span>
              <span className="text-neon-purple font-mono">+{rewards.reflectionBonus}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-text-primary font-semibold">Total XP</span>
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-blue">
                +{rewards.totalXp}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-text-muted text-sm">DANZ Tokens</span>
              <span className="text-neon-blue font-mono text-sm">
                +{rewards.tokensEarned.toFixed(1)} DANZ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Leaderboard */}
      <div className="flex-1">
        <h2 className="text-sm text-text-muted mb-3 flex items-center gap-2">
          <span>🏆</span> Top Streaks
        </h2>
        <div className="space-y-2">
          {MOCK_LEADERBOARD.map(entry => (
            <div
              key={entry.rank}
              className={`
                flex items-center gap-3 p-3 rounded-xl
                ${
                  entry.rank <= 3
                    ? 'bg-gradient-to-r from-neon-pink/10 to-neon-purple/10 border border-neon-pink/20'
                    : 'bg-bg-card/50 border border-white/10'
                }
              `}
            >
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${
                  entry.rank === 1
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : entry.rank === 2
                      ? 'bg-gray-400/20 text-gray-300'
                      : entry.rank === 3
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-bg-card text-text-muted'
                }
              `}
              >
                {entry.rank}
              </div>
              <div className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center">
                {entry.avatar}
              </div>
              <div className="flex-1">
                <div className="text-text-primary text-sm font-medium">{entry.username}</div>
              </div>
              <div className="text-right">
                <div className="text-neon-pink font-mono text-sm">🔥 {entry.streak}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bond Suggestions */}
      {bondSuggestions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <BondSuggestionSection
            suggestions={bondSuggestions}
            onAcceptBond={handleAcceptBond}
            onDeclineBond={handleDeclineBond}
          />
        </div>
      )}

      {/* Share button */}
      <div className="mt-6">
        <ShareButton streak={rewards.newStreak} xpEarned={rewards.totalXp} />
      </div>

      {/* FlowBond Tech footer */}
      <div className="mt-6 pt-4 border-t border-white/5 text-center">
        <p className="text-xs text-text-muted">
          Produced by{' '}
          <a
            href="https://flowbond.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon-pink hover:text-neon-purple transition-colors"
          >
            FlowBond Tech
          </a>
        </p>
      </div>
    </div>
  )
}
