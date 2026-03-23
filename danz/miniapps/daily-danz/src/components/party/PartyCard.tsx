'use client'

import { DanzParty, PARTY_TIER_CONFIG } from '@/types/party'

interface PartyCardProps {
  party: DanzParty
  isUserParty?: boolean
  onJoin?: (partyId: string) => void
  onView?: (partyId: string) => void
}

export function PartyCard({ party, isUserParty = false, onJoin, onView }: PartyCardProps) {
  const tierConfig = PARTY_TIER_CONFIG[party.tier]
  const participationRate = party.members.length > 0
    ? Math.round((party.stats.activeMembers / party.members.length) * 100)
    : 0

  return (
    <div
      className={`
        ${isUserParty ? 'glass-card-highlight' : 'glass-card'}
        relative overflow-hidden p-4 transition-all duration-300
      `}
    >
      {/* User's party badge */}
      {isUserParty && (
        <div className="absolute top-3 right-3 stat-pill-accent">
          <span className="text-xs font-medium">Your Party</span>
        </div>
      )}

      {/* Party header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Party avatar */}
        <div className="relative">
          <div className="avatar-glow w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
            {party.avatarEmoji}
          </div>
          {/* Tier badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-sm bg-bg-primary/80 backdrop-blur-sm border border-white/20">
            {tierConfig.emoji}
          </div>
        </div>

        {/* Party info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{party.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-medium ${tierConfig.color}`}>
              {tierConfig.label}
            </span>
            <span className="text-gray-500 text-xs">•</span>
            <span className="text-gray-400 text-xs">
              {party.members.length}/{party.maxMembers} members
            </span>
          </div>
        </div>
      </div>

      {/* Party description */}
      {party.description && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{party.description}</p>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="glass-card p-2.5 text-center">
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300 font-mono text-sm font-bold">
            {party.stats.weeklyXp.toLocaleString()}
          </div>
          <div className="text-gray-500 text-[10px] mt-0.5">Weekly XP</div>
        </div>
        <div className="glass-card p-2.5 text-center">
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 font-mono text-sm font-bold flex items-center justify-center gap-1">
            <span>🔥</span>{party.stats.partyStreak}
          </div>
          <div className="text-gray-500 text-[10px] mt-0.5">Party Streak</div>
        </div>
        <div className="glass-card p-2.5 text-center">
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono text-sm font-bold">
            {(party.currentMultiplier).toFixed(2)}x
          </div>
          <div className="text-gray-500 text-[10px] mt-0.5">Multiplier</div>
        </div>
      </div>

      {/* Participation bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-400">Today&apos;s Activity</span>
          <span className="text-xs text-gray-300">
            {party.stats.activeMembers}/{party.members.length} active
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              participationRate === 100
                ? 'bg-gradient-to-r from-green-400 to-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                : participationRate >= 50
                ? 'bg-gradient-to-r from-danz-pink-500 to-danz-purple-500 shadow-[0_0_8px_rgba(255,110,199,0.3)]'
                : 'bg-gradient-to-r from-orange-400 to-red-400'
            }`}
            style={{ width: `${participationRate}%` }}
          />
        </div>
      </div>

      {/* Member avatars */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {party.members.slice(0, 5).map((member, index) => (
            <div
              key={member.id}
              className={`
                w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold backdrop-blur-sm
                ${member.isActiveToday
                  ? 'border-green-400/60 bg-green-500/20 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                  : 'border-white/10 bg-white/5 text-gray-400'
                }
              `}
              style={{ zIndex: 5 - index }}
            >
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                member.displayName.charAt(0).toUpperCase()
              )}
            </div>
          ))}
          {party.members.length > 5 && (
            <div className="w-8 h-8 rounded-full border-2 border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center text-xs text-gray-400">
              +{party.members.length - 5}
            </div>
          )}
        </div>

        {/* Action button */}
        {isUserParty ? (
          <button
            onClick={() => onView?.(party.id)}
            className="px-4 py-2 rounded-xl glass-card text-white text-sm font-medium
                       hover:bg-white/10 transition-all duration-200"
          >
            View Party
          </button>
        ) : (
          <button
            onClick={() => onJoin?.(party.id)}
            disabled={party.members.length >= party.maxMembers}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-danz-pink-500 to-danz-purple-500
                       text-white text-sm font-semibold shadow-glow-pink
                       hover:shadow-neon-glow hover:scale-105 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {party.members.length >= party.maxMembers ? 'Full' : 'Join'}
          </button>
        )}
      </div>
    </div>
  )
}
