'use client'

import { type DanzParty, PARTY_TIER_CONFIG } from '@/src/types/party'

interface PartyCardProps {
  party: DanzParty
  onClick?: () => void
  isUserParty?: boolean
}

export function PartyCard({ party, onClick, isUserParty }: PartyCardProps) {
  const tierConfig = PARTY_TIER_CONFIG[party.tier]

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-2xl border transition-all duration-300
        ${
          isUserParty
            ? 'border-neon-pink/50 bg-gradient-to-br from-neon-pink/10 to-neon-purple/10'
            : 'border-white/10 bg-card hover:border-white/20'
        }
        hover:scale-[1.02] active:scale-[0.98]
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Party Avatar */}
          <div
            className={`
            w-12 h-12 rounded-xl flex items-center justify-center text-2xl
            bg-gradient-to-br ${tierConfig.bgGradient}
          `}
          >
            {tierConfig.emoji}
          </div>

          <div className="text-left">
            <h3 className="font-bold text-white">{party.name}</h3>
            <p className={`text-sm ${tierConfig.color}`}>{tierConfig.name} Party</p>
          </div>
        </div>

        {/* Multiplier Badge */}
        <div className="px-2 py-1 rounded-lg bg-neon-blue/20 border border-neon-blue/30">
          <span className="text-neon-blue font-bold text-sm">{party.multiplier}x</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          {/* Members */}
          <div className="flex items-center gap-1.5">
            <span className="text-white/50">Members</span>
            <span className="text-white font-medium">
              {party.members.length}/{party.maxMembers}
            </span>
          </div>

          {/* Weekly XP */}
          <div className="flex items-center gap-1.5">
            <span className="text-white/50">Weekly</span>
            <span className="text-neon-pink font-medium">{party.weeklyXp.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Member Avatars */}
        <div className="flex -space-x-2">
          {party.members.slice(0, 4).map((member, index) => (
            <div
              key={member.id}
              className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink border-2 border-bg-primary flex items-center justify-center"
              style={{ zIndex: 4 - index }}
            >
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-white font-bold">
                  {member.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          ))}
          {party.members.length > 4 && (
            <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-bg-primary flex items-center justify-center">
              <span className="text-[10px] text-white/70">+{party.members.length - 4}</span>
            </div>
          )}
        </div>
      </div>

      {/* Prize Pool (if any) */}
      {party.weeklyPrizePool > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">Prize Pool</span>
            <span className="text-sm font-bold text-green-400">
              ${party.weeklyPrizePool.toFixed(2)} USDC
            </span>
          </div>
        </div>
      )}
    </button>
  )
}
