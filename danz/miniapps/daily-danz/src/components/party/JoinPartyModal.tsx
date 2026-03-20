'use client'

import { useState } from 'react'
import { DanzParty, PARTY_TIER_CONFIG } from '@/types/party'

interface JoinPartyModalProps {
  isOpen: boolean
  party: DanzParty | null
  onClose: () => void
  onJoin: (partyId: string) => Promise<void>
}

export function JoinPartyModal({ isOpen, party, onClose, onJoin }: JoinPartyModalProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [joinSuccess, setJoinSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !party) return null

  const tierConfig = PARTY_TIER_CONFIG[party.tier]
  const spotsAvailable = party.maxMembers - party.members.length
  const isFull = spotsAvailable <= 0

  const handleJoin = async () => {
    if (isFull) return

    setIsJoining(true)
    setError(null)

    try {
      await onJoin(party.id)
      setJoinSuccess(true)
      // Auto-close after success
      setTimeout(() => {
        onClose()
        setJoinSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join party')
    } finally {
      setIsJoining(false)
    }
  }

  const handleClose = () => {
    if (!isJoining) {
      setError(null)
      setJoinSuccess(false)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className="relative w-full max-w-md mx-4 mb-4 glass-card-strong p-6 rounded-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isJoining}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-gray-400 hover:text-white disabled:opacity-50"
        >
          <span className="text-lg">×</span>
        </button>

        {/* Success state */}
        {joinSuccess ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center text-4xl animate-bounce">
              🎉
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Welcome to the party!</h3>
            <p className="text-gray-400">You've joined {party.name}</p>
          </div>
        ) : (
          <>
            {/* Party header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                {party.avatarEmoji}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{party.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm font-medium ${tierConfig.color}`}>
                    {tierConfig.emoji} {tierConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Party description */}
            {party.description && (
              <p className="text-gray-400 text-sm mb-6">{party.description}</p>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="glass-card p-3 text-center">
                <div className="text-lg font-bold text-cyan-400">{party.stats.weeklyXp.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-0.5">Weekly XP</div>
              </div>
              <div className="glass-card p-3 text-center">
                <div className="text-lg font-bold text-orange-400">🔥 {party.stats.partyStreak}</div>
                <div className="text-xs text-gray-500 mt-0.5">Streak</div>
              </div>
              <div className="glass-card p-3 text-center">
                <div className="text-lg font-bold text-purple-400">{party.currentMultiplier.toFixed(2)}x</div>
                <div className="text-xs text-gray-500 mt-0.5">Multiplier</div>
              </div>
            </div>

            {/* Spots available */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 mb-6">
              <span className="text-gray-400 text-sm">Spots available</span>
              <span className={`font-bold ${isFull ? 'text-red-400' : 'text-green-400'}`}>
                {isFull ? 'Full' : `${spotsAvailable} of ${party.maxMembers}`}
              </span>
            </div>

            {/* Members preview */}
            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-2">Members ({party.members.length})</div>
              <div className="flex -space-x-2">
                {party.members.slice(0, 8).map((member, index) => (
                  <div
                    key={member.id}
                    className={`
                      w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold
                      ${member.isActiveToday
                        ? 'border-green-400/60 bg-green-500/20 text-green-400'
                        : 'border-white/10 bg-white/10 text-gray-400'
                      }
                    `}
                    style={{ zIndex: 8 - index }}
                    title={member.displayName}
                  >
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      member.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                {party.members.length > 8 && (
                  <div className="w-9 h-9 rounded-full border-2 border-white/10 bg-white/10 flex items-center justify-center text-xs text-gray-400">
                    +{party.members.length - 8}
                  </div>
                )}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isJoining}
                className="flex-1 py-3 rounded-xl glass-card text-gray-300 font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={isJoining || isFull}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-danz-pink-500 to-danz-purple-500 text-white font-bold shadow-glow-pink hover:shadow-neon-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Joining...
                  </span>
                ) : isFull ? (
                  'Party Full'
                ) : (
                  'Join Party'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default JoinPartyModal
