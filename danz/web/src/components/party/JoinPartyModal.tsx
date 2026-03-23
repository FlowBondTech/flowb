'use client'

import { type DanzParty, PARTY_TIER_CONFIG } from '@/src/types/party'
import { Trophy, Users, X, Zap } from 'lucide-react'
import { useState } from 'react'

interface JoinPartyModalProps {
  isOpen: boolean
  onClose: () => void
  party: DanzParty | null
  onJoinParty: (partyId: string) => Promise<void>
}

export function JoinPartyModal({ isOpen, onClose, party, onJoinParty }: JoinPartyModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !party) return null

  const tierConfig = PARTY_TIER_CONFIG[party.tier]
  const isFull = party.members.length >= party.maxMembers

  const handleJoin = async () => {
    if (isFull) return

    setIsLoading(true)
    setError(null)

    try {
      await onJoinParty(party.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join party')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-bg-primary border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden">
        {/* Header with gradient */}
        <div className={`p-6 bg-gradient-to-br ${tierConfig.bgGradient}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center text-3xl">
              {tierConfig.emoji}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{party.name}</h2>
              <p className={`text-sm ${tierConfig.color}`}>{tierConfig.name} Party</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Description */}
          {party.description && <p className="text-white/70 text-sm">{party.description}</p>}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <Users className="w-5 h-5 text-neon-blue mx-auto mb-1" />
              <p className="text-lg font-bold text-white">
                {party.members.length}/{party.maxMembers}
              </p>
              <p className="text-xs text-white/50">Members</p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <Zap className="w-5 h-5 text-neon-pink mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{party.multiplier}x</p>
              <p className="text-xs text-white/50">Multiplier</p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{party.weeklyXp.toLocaleString()}</p>
              <p className="text-xs text-white/50">Weekly XP</p>
            </div>
          </div>

          {/* Prize Pool */}
          {party.weeklyPrizePool > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Weekly Prize Pool</span>
                <span className="text-xl font-bold text-green-400">
                  ${party.weeklyPrizePool.toFixed(2)} USDC
                </span>
              </div>
            </div>
          )}

          {/* Member Preview */}
          <div>
            <p className="text-sm text-white/50 mb-2">Members</p>
            <div className="flex flex-wrap gap-2">
              {party.members.slice(0, 8).map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-white font-bold">
                        {member.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-white/70">{member.displayName}</span>
                  {member.role === 'leader' && <span className="text-xs">👑</span>}
                </div>
              ))}
              {party.members.length > 8 && (
                <span className="text-sm text-white/40 px-2 py-1">
                  +{party.members.length - 8} more
                </span>
              )}
            </div>
          </div>

          {/* Benefits */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm font-medium text-white mb-2">Party Benefits</p>
            <ul className="space-y-1 text-sm text-white/60">
              <li className="flex items-center gap-2">
                <span className="text-neon-pink">+</span>
                {party.multiplier}x XP multiplier on all check-ins
              </li>
              <li className="flex items-center gap-2">
                <span className="text-neon-pink">+</span>
                Weekly prize pool distributions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-neon-pink">+</span>
                Exclusive party challenges
              </li>
            </ul>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {/* Join Button */}
          <button
            onClick={handleJoin}
            disabled={isLoading || isFull}
            className={`w-full py-3 rounded-xl font-bold transition-all ${
              isFull
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-neon-pink to-neon-purple text-white hover:opacity-90'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining...
              </span>
            ) : isFull ? (
              'Party is Full'
            ) : (
              'Join Party'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
