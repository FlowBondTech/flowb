'use client'

import { useState } from 'react'
import { DanzParty, PARTY_TIER_CONFIG, PARTY_ROLE_PERMISSIONS } from '@/types/party'

interface PartyDetailViewProps {
  party: DanzParty
  currentUserId: string
  onLeaveParty: () => Promise<void>
  onInviteMember: () => void
  onBack: () => void
}

export function PartyDetailView({
  party,
  currentUserId,
  onLeaveParty,
  onInviteMember,
  onBack,
}: PartyDetailViewProps) {
  const [isLeaving, setIsLeaving] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const tierConfig = PARTY_TIER_CONFIG[party.tier]
  const nextTier = getNextTier(party.tier)
  const currentUserMember = party.members.find(m => m.id === currentUserId)
  const userPermissions = currentUserMember
    ? PARTY_ROLE_PERMISSIONS[currentUserMember.role]
    : null

  const participationRate = party.members.length > 0
    ? Math.round((party.stats.activeMembers / party.members.length) * 100)
    : 0

  const handleLeave = async () => {
    setIsLeaving(true)
    try {
      await onLeaveParty()
    } finally {
      setIsLeaving(false)
      setShowLeaveConfirm(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          {userPermissions?.canInvite && (
            <button
              onClick={onInviteMember}
              className="px-4 py-2 rounded-lg bg-danz-pink-500/20 text-danz-pink-400 text-sm font-medium
                         hover:bg-danz-pink-500/30 transition-colors"
            >
              + Invite
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Party header card */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-danz-pink-500/20 to-danz-purple-500/20 border border-danz-pink-500/30">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-danz-pink-500/30 to-danz-purple-500/30 flex items-center justify-center text-3xl border border-white/10">
              {party.avatarEmoji}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{party.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-medium ${tierConfig.color}`}>
                  {tierConfig.emoji} {tierConfig.label}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 text-sm">
                  {party.members.length}/{party.maxMembers} members
                </span>
              </div>
              {party.description && (
                <p className="text-gray-400 text-sm mt-2">{party.description}</p>
              )}
            </div>
          </div>

          {/* Current multiplier */}
          <div className="mt-4 p-3 rounded-xl bg-black/20">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Current XP Multiplier</span>
              <span className="text-2xl font-bold text-danz-cyan-400 font-mono">
                {party.currentMultiplier.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-bg-card/80 border border-white/10">
            <div className="text-3xl font-bold text-white">{party.stats.partyStreak}</div>
            <div className="text-gray-400 text-sm">Party Streak</div>
          </div>
          <div className="p-4 rounded-xl bg-bg-card/80 border border-white/10">
            <div className="text-3xl font-bold text-danz-cyan-400 font-mono">
              {party.stats.totalXp.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Total XP</div>
          </div>
          <div className="p-4 rounded-xl bg-bg-card/80 border border-white/10">
            <div className="text-3xl font-bold text-danz-pink-400">
              {party.stats.weeklyXp.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Weekly XP</div>
          </div>
          <div className="p-4 rounded-xl bg-bg-card/80 border border-white/10">
            <div className="text-3xl font-bold text-white">{party.stats.averageStreak}</div>
            <div className="text-gray-400 text-sm">Avg Streak</div>
          </div>
        </div>

        {/* Today's participation */}
        <div className="p-4 rounded-xl bg-bg-card/80 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Today&apos;s Activity</h3>
            <span className={`text-sm font-medium ${
              participationRate === 100 ? 'text-green-400' : 'text-gray-400'
            }`}>
              {party.stats.activeMembers}/{party.members.length} checked in
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                participationRate === 100
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : 'bg-gradient-to-r from-danz-pink-500 to-danz-purple-500'
              }`}
              style={{ width: `${participationRate}%` }}
            />
          </div>
          {participationRate === 100 ? (
            <p className="text-green-400 text-sm">🎉 Full participation! Maximum bonus active!</p>
          ) : (
            <p className="text-gray-400 text-sm">
              {party.members.length - party.stats.activeMembers} member{party.members.length - party.stats.activeMembers !== 1 ? 's' : ''} haven&apos;t checked in yet
            </p>
          )}
        </div>

        {/* Tier progress */}
        {nextTier && (
          <div className="p-4 rounded-xl bg-bg-card/80 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Tier Progress</h3>
              <span className={`text-sm ${nextTier.config.color}`}>
                {nextTier.config.emoji} {nextTier.config.label}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-danz-pink-500 to-danz-purple-500"
                style={{ width: `${Math.min((party.stats.totalXp / nextTier.config.minXp) * 100, 100)}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm">
              {party.stats.totalXp.toLocaleString()} / {nextTier.config.minXp.toLocaleString()} XP
            </p>
          </div>
        )}

        {/* Members list */}
        <div>
          <h3 className="text-white font-semibold mb-3">Members</h3>
          <div className="space-y-2">
            {party.members
              .sort((a, b) => {
                // Sort by role (leader first) then by contributions
                const roleOrder = { leader: 0, 'co-leader': 1, member: 2 }
                if (roleOrder[a.role] !== roleOrder[b.role]) {
                  return roleOrder[a.role] - roleOrder[b.role]
                }
                return b.totalContributions - a.totalContributions
              })
              .map((member) => (
                <div
                  key={member.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl
                    ${member.id === currentUserId
                      ? 'bg-danz-pink-500/10 border border-danz-pink-500/30'
                      : 'bg-bg-card/50 border border-white/5'
                    }
                  `}
                >
                  {/* Avatar with active indicator */}
                  <div className="relative">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                      ${member.avatarUrl ? '' : 'bg-gradient-to-br from-danz-pink-500/30 to-danz-purple-500/30'}
                    `}>
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white">{member.displayName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {member.isActiveToday && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-bg-primary flex items-center justify-center">
                        <span className="text-[8px]">✓</span>
                      </div>
                    )}
                  </div>

                  {/* Member info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">{member.displayName}</span>
                      {member.role !== 'member' && (
                        <span className={`
                          text-xs px-1.5 py-0.5 rounded
                          ${member.role === 'leader' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}
                        `}>
                          {member.role === 'leader' ? '👑 Leader' : '⭐ Co-leader'}
                        </span>
                      )}
                      {member.id === currentUserId && (
                        <span className="text-xs text-danz-pink-400">(You)</span>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs">
                      🔥 {member.currentStreak} day streak • {member.totalContributions.toLocaleString()} XP contributed
                    </div>
                  </div>

                  {/* Active status */}
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    member.isActiveToday
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-500'
                  }`}>
                    {member.isActiveToday ? 'Active' : 'Not yet'}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Leave party button */}
        {currentUserMember && currentUserMember.role !== 'leader' && (
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium
                       hover:bg-red-500/10 transition-colors"
          >
            Leave Party
          </button>
        )}
      </div>

      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowLeaveConfirm(false)} />
          <div className="relative bg-bg-primary rounded-2xl p-6 max-w-sm w-full border border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">Leave Party?</h3>
            <p className="text-gray-400 mb-6">
              You&apos;ll lose your party bonus multiplier and won&apos;t be able to rejoin without an invite.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium
                           hover:bg-white/20 transition-colors"
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium
                           hover:bg-red-600 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLeaving ? 'Leaving...' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getNextTier(currentTier: string) {
  const tiers = ['starter', 'rising', 'hot', 'fire', 'legendary'] as const
  const currentIndex = tiers.indexOf(currentTier as typeof tiers[number])
  if (currentIndex === -1 || currentIndex === tiers.length - 1) return null

  const nextTierKey = tiers[currentIndex + 1]
  return {
    key: nextTierKey,
    config: PARTY_TIER_CONFIG[nextTierKey],
  }
}
