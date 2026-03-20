'use client'

import { type DanzParty, PARTY_TIER_CONFIG } from '@/src/types/party'
import { ChevronRight } from 'lucide-react'

interface MyPartyBannerProps {
  party: DanzParty | null
  userRole?: 'leader' | 'co-leader' | 'member'
  onClick?: () => void
  onCreateParty?: () => void
}

export function MyPartyBanner({ party, userRole, onClick, onCreateParty }: MyPartyBannerProps) {
  // No party state
  if (!party) {
    return (
      <button
        onClick={onCreateParty}
        className="w-full p-4 rounded-2xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center">
              <span className="text-2xl">🎉</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">Join a Party</h3>
              <p className="text-sm text-white/50">Earn bonus XP with friends</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />
        </div>
      </button>
    )
  }

  const tierConfig = PARTY_TIER_CONFIG[party.tier]

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-2xl border transition-all group
        bg-gradient-to-br ${tierConfig.bgGradient}
        border-white/10 hover:border-white/20
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Party Avatar */}
          <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center text-2xl">
            {tierConfig.emoji}
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white">{party.name}</h3>
              {userRole === 'leader' && <span className="text-xs">👑</span>}
              {userRole === 'co-leader' && <span className="text-xs">⭐</span>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={tierConfig.color}>{tierConfig.name}</span>
              <span className="text-white/30">|</span>
              <span className="text-white/50">{party.members.length} members</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Multiplier Badge */}
          <div className="px-2.5 py-1 rounded-lg bg-neon-blue/20 border border-neon-blue/30">
            <span className="text-neon-blue font-bold text-sm">{party.multiplier}x</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />
        </div>
      </div>

      {/* Progress Bar (weekly XP) */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-white/50">Weekly XP</span>
          <span className="text-neon-pink font-medium">{party.weeklyXp.toLocaleString()} XP</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-pink to-neon-purple rounded-full transition-all"
            style={{ width: `${Math.min((party.weeklyXp / 10000) * 100, 100)}%` }}
          />
        </div>
      </div>
    </button>
  )
}
