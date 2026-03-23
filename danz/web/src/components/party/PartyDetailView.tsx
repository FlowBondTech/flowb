'use client'

import {
  type DanzParty,
  PARTY_TIER_CONFIG,
  type PartyMember,
  type PartyRole,
} from '@/src/types/party'
import { ArrowLeft, LogOut, Share2, Trophy, Users, Zap } from 'lucide-react'
import { useState } from 'react'

interface PartyDetailViewProps {
  party: DanzParty
  currentUserId: string
  userRole: PartyRole
  onBack: () => void
  onLeaveParty?: () => Promise<void>
  onShareParty?: () => void
  onKickMember?: (memberId: string) => Promise<void>
  onPromoteMember?: (memberId: string, role: PartyRole) => Promise<void>
}

type Tab = 'members' | 'leaderboard' | 'settings'

export function PartyDetailView({
  party,
  currentUserId,
  userRole,
  onBack,
  onLeaveParty,
  onShareParty,
  onKickMember,
  onPromoteMember,
}: PartyDetailViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [isLeaving, setIsLeaving] = useState(false)

  const tierConfig = PARTY_TIER_CONFIG[party.tier]
  const isLeader = userRole === 'leader'
  const isCoLeader = userRole === 'co-leader'
  const canManage = isLeader || isCoLeader

  const handleLeave = async () => {
    if (!onLeaveParty || isLeader) return
    setIsLeaving(true)
    try {
      await onLeaveParty()
    } finally {
      setIsLeaving(false)
    }
  }

  // Sort members: leader first, then co-leaders, then by XP
  const sortedMembers = [...party.members].sort((a, b) => {
    const roleOrder = { leader: 0, 'co-leader': 1, member: 2 }
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role]
    }
    return b.weeklyXpContributed - a.weeklyXpContributed
  })

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header with gradient */}
      <div className={`p-4 pb-6 bg-gradient-to-br ${tierConfig.bgGradient}`}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-2">
            {onShareParty && (
              <button
                onClick={onShareParty}
                className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
              >
                <Share2 className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-black/20 flex items-center justify-center text-4xl">
            {tierConfig.emoji}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{party.name}</h1>
            <p className={`text-sm ${tierConfig.color}`}>{tierConfig.name} Party</p>
            {party.description && (
              <p className="text-sm text-white/60 mt-1 line-clamp-2">{party.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-card border border-white/10 text-center">
            <Users className="w-5 h-5 text-neon-blue mx-auto mb-1" />
            <p className="text-lg font-bold text-white">
              {party.members.length}/{party.maxMembers}
            </p>
            <p className="text-xs text-white/50">Members</p>
          </div>

          <div className="p-3 rounded-xl bg-card border border-white/10 text-center">
            <Zap className="w-5 h-5 text-neon-pink mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{party.multiplier}x</p>
            <p className="text-xs text-white/50">Multiplier</p>
          </div>

          <div className="p-3 rounded-xl bg-card border border-white/10 text-center">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{party.weeklyXp.toLocaleString()}</p>
            <p className="text-xs text-white/50">Weekly XP</p>
          </div>
        </div>
      </div>

      {/* Prize Pool */}
      {party.weeklyPrizePool > 0 && (
        <div className="px-4 mt-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Weekly Prize Pool</span>
              <span className="text-xl font-bold text-green-400">
                ${party.weeklyPrizePool.toFixed(2)} USDC
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          {(['members', 'leaderboard', ...(canManage ? ['settings' as const] : [])] as Tab[]).map(
            tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-neon-purple text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-2">
            {sortedMembers.map((member, index) => (
              <MemberRow
                key={member.id}
                member={member}
                rank={index + 1}
                isCurrentUser={member.id === currentUserId}
                canManage={canManage && member.id !== currentUserId && member.role !== 'leader'}
                onKick={onKickMember ? () => onKickMember(member.id) : undefined}
                onPromote={onPromoteMember}
              />
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-2">
            {[...party.members]
              .sort((a, b) => b.weeklyXpContributed - a.weeklyXpContributed)
              .map((member, index) => (
                <LeaderboardRow
                  key={member.id}
                  member={member}
                  rank={index + 1}
                  isCurrentUser={member.id === currentUserId}
                />
              ))}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && canManage && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-medium text-white mb-3">Party Settings</h3>
              <p className="text-sm text-white/50">Party management features coming soon...</p>
            </div>

            {!isLeader && (
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
              >
                {isLeaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    Leaving...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Leave Party
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Member Row Component
function MemberRow({
  member,
  rank,
  isCurrentUser,
  canManage,
  onKick,
  onPromote,
}: {
  member: PartyMember
  rank: number
  isCurrentUser: boolean
  canManage: boolean
  onKick?: () => void
  onPromote?: (memberId: string, role: PartyRole) => void
}) {
  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isCurrentUser ? 'bg-neon-purple/10 border-neon-purple/30' : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm text-white font-bold">
                {member.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{member.displayName}</span>
              {member.role === 'leader' && <span className="text-xs">👑</span>}
              {member.role === 'co-leader' && <span className="text-xs">⭐</span>}
              {isCurrentUser && <span className="text-xs text-neon-purple">(You)</span>}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span>🔥 {member.streakDays}d streak</span>
              <span>|</span>
              <span>{member.weeklyXpContributed.toLocaleString()} XP/wk</span>
            </div>
          </div>
        </div>

        {canManage && (
          <button
            onClick={onKick}
            className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Leaderboard Row Component
function LeaderboardRow({
  member,
  rank,
  isCurrentUser,
}: {
  member: PartyMember
  rank: number
  isCurrentUser: boolean
}) {
  const getRankEmoji = (r: number) => {
    if (r === 1) return '🥇'
    if (r === 2) return '🥈'
    if (r === 3) return '🥉'
    return `#${r}`
  }

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isCurrentUser ? 'bg-neon-purple/10 border-neon-purple/30' : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center text-lg">
            {getRankEmoji(rank)}
          </div>

          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm text-white font-bold">
                {member.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <span className="font-medium text-white">
              {member.displayName}
              {isCurrentUser && <span className="text-xs text-neon-purple ml-2">(You)</span>}
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className="font-bold text-neon-pink">{member.weeklyXpContributed.toLocaleString()}</p>
          <p className="text-xs text-white/50">XP this week</p>
        </div>
      </div>
    </div>
  )
}
