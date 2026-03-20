'use client'

import { PartyLeaderboard as PartyLeaderboardType, PARTY_TIER_CONFIG } from '@/types/party'

interface PartyLeaderboardProps {
  leaderboard: PartyLeaderboardType[]
  userPartyId?: string
}

export function PartyLeaderboard({ leaderboard, userPartyId }: PartyLeaderboardProps) {
  return (
    <div className="glass-section">
      <div className="glass-section-inner space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <span className="text-base">🏆</span>
            <span>Top Parties</span>
          </h2>
          <span className="stat-pill text-[10px] px-2 py-0.5">
            <span className="text-gray-400">This Week</span>
          </span>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-1.5">
          {leaderboard.map((entry, index) => {
            const isUserParty = entry.party.id === userPartyId
            const tierConfig = PARTY_TIER_CONFIG[entry.party.tier]
            const isTop3 = entry.rank <= 3

            // Determine card style
            const cardClass = isUserParty
              ? 'glass-card-highlight'
              : isTop3 && entry.rank === 1
              ? 'glass-card-gold'
              : 'glass-card'

            // Determine rank badge style
            const rankBadgeClass = entry.rank === 1
              ? 'rank-badge rank-badge-gold'
              : entry.rank === 2
              ? 'rank-badge rank-badge-silver'
              : entry.rank === 3
              ? 'rank-badge rank-badge-bronze'
              : 'rank-badge'

            return (
              <div
                key={entry.party.id}
                className={`${cardClass} p-2 flex items-center gap-2`}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Rank Badge */}
                <div className={`${rankBadgeClass} w-6 h-6 text-xs`}>
                  {isTop3 ? (
                    <span className="text-sm">{['🥇', '🥈', '🥉'][entry.rank - 1]}</span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">{entry.rank}</span>
                  )}
                </div>

                {/* Party Avatar & Info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="avatar-glow w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-sm border border-white/10">
                    {entry.party.avatarEmoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-medium text-xs truncate">
                        {entry.party.name}
                      </span>
                      {isUserParty && (
                        <span className="stat-pill-accent text-[9px] px-1.5 py-0.5">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] ${tierConfig.color}`}>
                        {tierConfig.emoji} {tierConfig.label}
                      </span>
                      <span className="text-[9px] text-gray-500">•</span>
                      <span className="text-[10px] text-gray-500">
                        {entry.party.memberCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-xs text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">
                    {entry.weeklyXp.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-gray-500 flex items-center justify-end gap-0.5">
                    <span>🔥</span>
                    <span className="text-orange-400">{entry.partyStreak}d</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* View All Link */}
        <button className="w-full py-2 text-center text-xs text-gray-400 hover:text-white transition-colors glass-card hover:glass-card-highlight">
          View All →
        </button>
      </div>
    </div>
  )
}
