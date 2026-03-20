'use client'

import { DanzParty, PARTY_TIER_CONFIG } from '@/types/party'

interface MyPartyBannerProps {
  party: DanzParty | null
  onCreateParty: () => void
  onViewParty: () => void
}

export function MyPartyBanner({ party, onCreateParty, onViewParty }: MyPartyBannerProps) {
  if (!party) {
    // No party - show create/join CTA
    return (
      <div className="glass-card relative overflow-hidden p-4 border-dashed border-danz-pink-500/30">
        <div className="flex items-center gap-3">
          <div className="avatar-glow w-12 h-12 rounded-xl bg-gradient-to-br from-danz-pink-500/20 to-danz-purple-500/20 flex items-center justify-center border border-danz-pink-500/20">
            <span className="text-2xl">🎉</span>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm">Join a DANZ Party!</h3>
            <p className="text-gray-400 text-xs">
              Team up for bonus XP multipliers
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onCreateParty}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-danz-pink-500 to-danz-purple-500
                       text-white text-xs font-semibold shadow-glow-pink
                       hover:shadow-neon-glow hover:scale-[1.02] transition-all duration-200"
          >
            Create Party
          </button>
          <button
            onClick={onViewParty}
            className="flex-1 py-2 rounded-xl glass-card border-danz-pink-500/30
                       text-danz-pink-400 text-xs font-medium
                       hover:bg-danz-pink-500/10 hover:border-danz-pink-500/50 transition-all duration-200"
          >
            Browse Parties
          </button>
        </div>
      </div>
    )
  }

  const tierConfig = PARTY_TIER_CONFIG[party.tier]
  const participationRate = party.members.length > 0
    ? Math.round((party.stats.activeMembers / party.members.length) * 100)
    : 0

  return (
    <div
      onClick={onViewParty}
      className="glass-card-highlight relative overflow-hidden p-4 cursor-pointer hover:border-danz-pink-500/50 transition-all duration-300 group"
    >
      {/* Animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="avatar-glow w-10 h-10 rounded-lg bg-gradient-to-br from-danz-pink-500/20 to-danz-purple-500/20 flex items-center justify-center text-xl border border-white/10">
                {party.avatarEmoji}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 text-xs">{tierConfig.emoji}</div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{party.name}</h3>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-medium ${tierConfig.color}`}>{tierConfig.label}</span>
                <span className="text-gray-500 text-[10px]">•</span>
                <span className="text-gray-400 text-[10px]">{party.members.length} members</span>
              </div>
            </div>
          </div>

          {/* Multiplier badge */}
          <div className="stat-pill-accent px-2.5 py-1">
            <span className="font-mono font-bold text-xs">
              {party.currentMultiplier.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="glass-card p-2 text-center">
            <div className="text-white font-semibold text-sm flex items-center justify-center gap-0.5">
              <span className="text-orange-400 text-xs">🔥</span>{party.stats.partyStreak}
            </div>
            <div className="text-gray-500 text-[9px]">Streak</div>
          </div>
          <div className="glass-card p-2 text-center">
            <div className="text-white font-semibold text-sm">{party.stats.activeMembers}/{party.members.length}</div>
            <div className="text-gray-500 text-[9px]">Active</div>
          </div>
          <div className="glass-card p-2 text-center">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300 font-semibold text-sm">
              {party.stats.weeklyXp.toLocaleString()}
            </div>
            <div className="text-gray-500 text-[9px]">XP</div>
          </div>
        </div>

        {/* Participation progress */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-400">Activity</span>
            <span className={`text-[10px] font-medium ${
              participationRate === 100 ? 'text-green-400' : 'text-gray-300'
            }`}>
              {participationRate}%{participationRate === 100 && ' FULL!'}
            </span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                participationRate === 100
                  ? 'bg-gradient-to-r from-green-400 to-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                  : 'bg-gradient-to-r from-danz-pink-500 to-danz-purple-500 shadow-[0_0_6px_rgba(255,110,199,0.3)]'
              }`}
              style={{ width: `${participationRate}%` }}
            />
          </div>
        </div>

        {/* CTA hint */}
        <div className="mt-2 text-center">
          <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">Tap to view →</span>
        </div>
      </div>
    </div>
  )
}
