'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFarcasterSDK } from '@/hooks/useFarcasterSDK'
import {
  type DanceParty as DancePartyType,
  type PartyMember,
  type PartyStats,
  calculateBonusMultiplier,
  calculatePartyRewards,
} from './types'

type PartyState = 'browse' | 'create' | 'waiting' | 'active' | 'complete'

interface DancePartyProps {
  onClose?: () => void
}

export function DanceParty({ onClose }: DancePartyProps) {
  const { user, isAuthenticated } = useAuth()
  const { openUrl, composeCast } = useFarcasterSDK()
  const [state, setState] = useState<PartyState>('browse')
  const [party, setParty] = useState<DancePartyType | null>(null)
  const [stats, setStats] = useState<PartyStats>({
    totalMoves: 0,
    totalXp: 0,
    totalCalories: 0,
    duration: 0,
    avgIntensity: 0,
    memberCount: 1,
    bonusMultiplier: 1,
  })
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Mock active parties
  const [activeParties] = useState<DancePartyType[]>([
    {
      id: '1',
      name: "DanceQueen's Party",
      hostId: 'host1',
      host: {
        id: 'host1',
        fid: 12345,
        username: 'dancequeen',
        displayName: 'DanceQueen',
        avatarUrl: '',
        xpEarned: 0,
        moves: 0,
        isHost: true,
        joinedAt: new Date(),
        isActive: true,
      },
      members: [],
      maxMembers: 5,
      isPublic: true,
      status: 'waiting',
      totalXp: 0,
      bonusMultiplier: 1,
      danceStyle: 'Hip Hop',
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Salsa Night',
      hostId: 'host2',
      host: {
        id: 'host2',
        fid: 67890,
        username: 'salsamaster',
        displayName: 'Salsa Master',
        avatarUrl: '',
        xpEarned: 0,
        moves: 0,
        isHost: true,
        joinedAt: new Date(),
        isActive: true,
      },
      members: [
        {
          id: 'm1',
          username: 'dancer1',
          displayName: 'Dancer One',
          xpEarned: 0,
          moves: 0,
          isHost: false,
          joinedAt: new Date(),
          isActive: true,
        },
      ],
      maxMembers: 8,
      isPublic: true,
      status: 'waiting',
      totalXp: 0,
      bonusMultiplier: 1.2,
      danceStyle: 'Salsa',
      createdAt: new Date(),
    },
  ])

  // Create a new party
  const createParty = useCallback(
    (name: string, danceStyle?: string, isPublic = true) => {
      const newParty: DancePartyType = {
        id: `party-${Date.now()}`,
        name,
        hostId: user?.id || 'self',
        host: {
          id: user?.id || 'self',
          fid: user?.fid,
          username: user?.username || 'dancer',
          displayName: user?.displayName || 'Dancer',
          avatarUrl: user?.avatarUrl,
          xpEarned: 0,
          moves: 0,
          isHost: true,
          joinedAt: new Date(),
          isActive: true,
        },
        members: [],
        maxMembers: 5,
        isPublic,
        status: 'waiting',
        totalXp: 0,
        bonusMultiplier: 1,
        danceStyle,
        createdAt: new Date(),
      }
      setParty(newParty)
      setState('waiting')
    },
    [user]
  )

  // Join a party
  const joinParty = useCallback(
    (partyToJoin: DancePartyType) => {
      const memberMe: PartyMember = {
        id: user?.id || 'self',
        fid: user?.fid,
        username: user?.username || 'dancer',
        displayName: user?.displayName || 'Dancer',
        avatarUrl: user?.avatarUrl,
        xpEarned: 0,
        moves: 0,
        isHost: false,
        joinedAt: new Date(),
        isActive: true,
      }

      const updatedParty = {
        ...partyToJoin,
        members: [...partyToJoin.members, memberMe],
        bonusMultiplier: calculateBonusMultiplier(partyToJoin.members.length + 2),
      }
      setParty(updatedParty)
      setState('waiting')
    },
    [user]
  )

  // Start the party
  const startParty = useCallback(() => {
    if (!party) return
    setParty({ ...party, status: 'active', startedAt: new Date() })
    setState('active')
    startTimeRef.current = Date.now()
  }, [party])

  // Cast invite to Farcaster
  const castInvite = useCallback(() => {
    if (!party) return
    const inviteText = `Join my dance party on DANZ! ${party.danceStyle ? `We're dancing ${party.danceStyle}` : 'Come dance with me!'}

Earn ${party.bonusMultiplier}x XP when you dance together!

Join here: https://danz.fun/party/${party.id}`

    composeCast?.(inviteText)
  }, [party, composeCast])

  // Update stats while active
  useEffect(() => {
    if (state !== 'active' || !party) return

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const memberCount = party.members.length + 1
      const moves = Math.floor(elapsed * 2.5 * memberCount)
      const intensity = 50 + Math.random() * 30

      setStats({
        totalMoves: moves,
        totalXp: Math.floor(moves * 0.1 * party.bonusMultiplier),
        totalCalories: Math.floor(elapsed * 0.15 * memberCount),
        duration: elapsed,
        avgIntensity: intensity,
        memberCount,
        bonusMultiplier: party.bonusMultiplier,
      })
    }, 500)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state, party])

  // End the party
  const endParty = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (party) {
      setParty({ ...party, status: 'ended', endedAt: new Date() })
    }
    setState('complete')
  }, [party])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      {state === 'browse' && (
        <BrowsePartiesView
          parties={activeParties}
          onJoin={joinParty}
          onCreate={() => setState('create')}
        />
      )}

      {state === 'create' && (
        <CreatePartyView
          onCreate={createParty}
          onBack={() => setState('browse')}
        />
      )}

      {state === 'waiting' && party && (
        <WaitingRoomView
          party={party}
          onStart={startParty}
          onCastInvite={castInvite}
          onLeave={() => {
            setParty(null)
            setState('browse')
          }}
          isHost={party.hostId === (user?.id || 'self')}
        />
      )}

      {state === 'active' && party && (
        <ActivePartyView
          party={party}
          stats={stats}
          formatTime={formatTime}
          onEnd={endParty}
        />
      )}

      {state === 'complete' && party && (
        <PartyCompleteView
          party={party}
          stats={stats}
          formatTime={formatTime}
          onNewParty={() => {
            setParty(null)
            setState('browse')
          }}
          isHost={party.hostId === (user?.id || 'self')}
        />
      )}
    </div>
  )
}

// Browse active parties
function BrowsePartiesView({
  parties,
  onJoin,
  onCreate,
}: {
  parties: DancePartyType[]
  onJoin: (party: DancePartyType) => void
  onCreate: () => void
}) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🎊</span>
          Dance Parties
        </h2>
        <button onClick={onCreate} className="btn-primary text-sm py-2 px-4">
          + Create Party
        </button>
      </div>

      <p className="text-text-secondary text-sm mb-4">
        Join a party to earn bonus XP! More dancers = bigger rewards.
      </p>

      {/* Bonus info card */}
      <div className="card glow-purple mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚀</span>
          <div>
            <p className="font-semibold text-white">Party Bonus Multipliers</p>
            <p className="text-xs text-text-muted">
              2 dancers: 1.2x | 3: 1.5x | 4: 1.8x | 5+: 2x XP!
            </p>
          </div>
        </div>
      </div>

      {/* Active parties list */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {parties.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <span className="text-4xl block mb-3">🕺</span>
            <p>No active parties right now</p>
            <p className="text-sm">Be the first to start one!</p>
          </div>
        ) : (
          parties.map(party => (
            <PartyCard key={party.id} party={party} onJoin={() => onJoin(party)} />
          ))
        )}
      </div>
    </div>
  )
}

// Party card component
function PartyCard({
  party,
  onJoin,
}: {
  party: DancePartyType
  onJoin: () => void
}) {
  const memberCount = party.members.length + 1
  const spotsLeft = party.maxMembers - memberCount
  const multiplier = calculateBonusMultiplier(memberCount)

  return (
    <div className="card hover:border-neon-pink/40 transition-all">
      <div className="flex items-start gap-3">
        {/* Host avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center overflow-hidden">
            {party.host.avatarUrl ? (
              <img
                src={party.host.avatarUrl}
                alt={party.host.displayName || 'Host'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl">💃</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-xs">
            👑
          </div>
        </div>

        {/* Party info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{party.name}</h3>
          <p className="text-sm text-text-muted">
            Hosted by @{party.host.username}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {party.danceStyle && (
              <span className="text-xs bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded-full">
                {party.danceStyle}
              </span>
            )}
            <span className="text-xs text-text-muted flex items-center gap-1">
              <span>👥</span> {memberCount}/{party.maxMembers}
            </span>
            <span className="text-xs text-yellow-400 font-medium">
              {multiplier}x XP
            </span>
          </div>
        </div>

        {/* Join button */}
        <button
          onClick={onJoin}
          disabled={spotsLeft <= 0}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            spotsLeft > 0
              ? 'bg-gradient-to-r from-neon-pink to-neon-purple text-white hover:opacity-90'
              : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
          }`}
        >
          {spotsLeft > 0 ? 'Join' : 'Full'}
        </button>
      </div>

      {/* Member avatars */}
      {party.members.length > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/10">
          <span className="text-xs text-text-muted mr-2">Dancers:</span>
          {party.members.slice(0, 4).map((member, i) => (
            <div
              key={member.id}
              className="w-6 h-6 rounded-full bg-bg-hover border border-white/20 flex items-center justify-center text-xs overflow-hidden"
              style={{ marginLeft: i > 0 ? '-6px' : 0 }}
            >
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                '🕺'
              )}
            </div>
          ))}
          {party.members.length > 4 && (
            <span className="text-xs text-text-muted ml-1">
              +{party.members.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Create party view
function CreatePartyView({
  onCreate,
  onBack,
}: {
  onCreate: (name: string, style?: string, isPublic?: boolean) => void
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [style, setStyle] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const danceStyles = ['Hip Hop', 'Salsa', 'House', 'Breaking', 'Contemporary', 'Freestyle']

  return (
    <div className="flex flex-col h-full p-4">
      <button onClick={onBack} className="text-neon-pink text-sm mb-4 self-start">
        ← Back to parties
      </button>

      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span className="text-2xl">🎉</span>
        Create Dance Party
      </h2>

      <div className="space-y-4 flex-1">
        {/* Party name */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">Party Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Awesome Dance Party"
            className="w-full px-4 py-3 bg-bg-card border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:border-neon-pink/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Dance style */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">Dance Style (optional)</label>
          <div className="flex flex-wrap gap-2">
            {danceStyles.map(s => (
              <button
                key={s}
                onClick={() => setStyle(style === s ? '' : s)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  style === s
                    ? 'bg-neon-purple text-white'
                    : 'bg-bg-card text-text-secondary border border-white/10 hover:border-neon-purple/30'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Public/Private toggle */}
        <div className="flex items-center justify-between p-4 bg-bg-card rounded-xl">
          <div>
            <p className="font-medium text-white">Public Party</p>
            <p className="text-xs text-text-muted">Anyone can join from the list</p>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              isPublic ? 'bg-neon-pink' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                isPublic ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Info card */}
        <div className="card bg-neon-pink/10 border-neon-pink/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-sm">
              <p className="font-medium text-white mb-1">Host Benefits</p>
              <p className="text-text-secondary">
                As the host, you'll earn an extra 10% XP bonus on top of the party multiplier!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create button */}
      <button
        onClick={() => onCreate(name || 'Dance Party', style || undefined, isPublic)}
        className="btn-primary w-full mt-4"
      >
        Create Party 🚀
      </button>
    </div>
  )
}

// Waiting room view
function WaitingRoomView({
  party,
  onStart,
  onCastInvite,
  onLeave,
  isHost,
}: {
  party: DancePartyType
  onStart: () => void
  onCastInvite: () => void
  onLeave: () => void
  isHost: boolean
}) {
  const memberCount = party.members.length + 1
  const multiplier = calculateBonusMultiplier(memberCount)

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-neon-pink to-neon-purple mx-auto mb-4 flex items-center justify-center animate-pulse-slow">
          <span className="text-4xl">🎊</span>
        </div>
        <h2 className="text-xl font-bold mb-1">{party.name}</h2>
        <p className="text-text-muted text-sm">
          {isHost ? 'Waiting for dancers to join...' : 'Waiting for host to start...'}
        </p>
      </div>

      {/* Multiplier display */}
      <div className="card glow-pink text-center mb-4">
        <p className="text-sm text-text-muted mb-1">Current Bonus</p>
        <p className="text-4xl font-bold bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">
          {multiplier}x
        </p>
        <p className="text-xs text-text-muted mt-1">
          {memberCount === 1
            ? 'Invite friends to increase bonus!'
            : `${memberCount} dancers in party`}
        </p>
      </div>

      {/* Members list */}
      <div className="card flex-1 overflow-y-auto">
        <h3 className="font-semibold mb-3 text-sm text-text-secondary">Party Members ({memberCount})</h3>
        <div className="space-y-2">
          {/* Host */}
          <MemberRow member={party.host} isHost />
          {/* Other members */}
          {party.members.map(member => (
            <MemberRow key={member.id} member={member} />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 mt-4">
        {/* Cast invite button */}
        <button
          onClick={onCastInvite}
          className="w-full py-3 px-4 bg-[#855DCD] hover:bg-[#7149b8] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
          </svg>
          Cast Invite on Farcaster
        </button>

        {isHost ? (
          <button onClick={onStart} className="btn-primary w-full">
            Start Party 🚀
          </button>
        ) : (
          <button
            onClick={onLeave}
            className="btn-secondary w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            Leave Party
          </button>
        )}
      </div>
    </div>
  )
}

// Member row component
function MemberRow({ member, isHost }: { member: PartyMember; isHost?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center overflow-hidden">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>💃</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {member.displayName || member.username}
        </p>
        <p className="text-xs text-text-muted">@{member.username}</p>
      </div>
      {isHost && (
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1">
          👑 Host
        </span>
      )}
    </div>
  )
}

// Active party view
function ActivePartyView({
  party,
  stats,
  formatTime,
  onEnd,
}: {
  party: DancePartyType
  stats: PartyStats
  formatTime: (s: number) => string
  onEnd: () => void
}) {
  return (
    <div className="flex flex-col h-full p-4">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-sm font-medium uppercase tracking-wide">
            Live Party
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full">
          <span className="text-yellow-400 font-bold">{stats.bonusMultiplier}x</span>
          <span className="text-xs text-yellow-400">XP Bonus</span>
        </div>
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <div className="text-6xl font-bold font-mono text-white mb-2">
          {formatTime(stats.duration)}
        </div>
        <p className="text-text-muted text-sm">{party.name}</p>
      </div>

      {/* Party stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card text-center py-3">
          <span className="text-2xl">💃</span>
          <p className="text-xl font-bold text-white">{stats.totalMoves}</p>
          <p className="text-xs text-text-muted">Total Moves</p>
        </div>
        <div className="card text-center py-3">
          <span className="text-2xl">⚡</span>
          <p className="text-xl font-bold text-yellow-400">{stats.totalXp}</p>
          <p className="text-xs text-text-muted">XP Earned</p>
        </div>
        <div className="card text-center py-3">
          <span className="text-2xl">🔥</span>
          <p className="text-xl font-bold text-white">{Math.round(stats.avgIntensity)}%</p>
          <p className="text-xs text-text-muted">Avg Intensity</p>
        </div>
        <div className="card text-center py-3">
          <span className="text-2xl">👥</span>
          <p className="text-xl font-bold text-neon-purple">{stats.memberCount}</p>
          <p className="text-xs text-text-muted">Dancers</p>
        </div>
      </div>

      {/* Active members */}
      <div className="card flex-1 overflow-y-auto mb-4">
        <h3 className="font-semibold mb-3 text-sm text-text-secondary">Dancing Now</h3>
        <div className="space-y-2">
          <ActiveMemberRow member={party.host} />
          {party.members.map(member => (
            <ActiveMemberRow key={member.id} member={member} />
          ))}
        </div>
      </div>

      {/* End button */}
      <button
        onClick={onEnd}
        className="btn-secondary border-red-500/50 text-red-400 hover:bg-red-500/10"
      >
        End Party
      </button>
    </div>
  )
}

// Active member row with live stats
function ActiveMemberRow({ member }: { member: PartyMember }) {
  const [moves] = useState(() => Math.floor(Math.random() * 100) + 50)

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center overflow-hidden">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>💃</span>
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-bg-card" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{member.displayName || member.username}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-white">{moves} moves</p>
      </div>
    </div>
  )
}

// Party complete view
function PartyCompleteView({
  party,
  stats,
  formatTime,
  onNewParty,
  isHost,
}: {
  party: DancePartyType
  stats: PartyStats
  formatTime: (s: number) => string
  onNewParty: () => void
  isHost: boolean
}) {
  const rewards = calculatePartyRewards(
    Math.floor(stats.totalMoves * 0.1),
    stats.memberCount,
    isHost
  )

  return (
    <div className="flex flex-col h-full p-4 items-center">
      {/* Celebration header */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-2xl font-bold mb-1">Amazing Party!</h2>
        <p className="text-text-muted">{party.name}</p>
      </div>

      {/* Summary */}
      <div className="card w-full mb-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-text-muted text-sm">Duration</p>
            <p className="text-xl font-bold">{formatTime(stats.duration)}</p>
          </div>
          <div>
            <p className="text-text-muted text-sm">Dancers</p>
            <p className="text-xl font-bold">{stats.memberCount}</p>
          </div>
          <div>
            <p className="text-text-muted text-sm">Total Moves</p>
            <p className="text-xl font-bold">{stats.totalMoves}</p>
          </div>
          <div>
            <p className="text-text-muted text-sm">Party Bonus</p>
            <p className="text-xl font-bold text-yellow-400">{stats.bonusMultiplier}x</p>
          </div>
        </div>
      </div>

      {/* Rewards breakdown */}
      <div className="card w-full glow-pink mb-4">
        <h3 className="font-semibold mb-3 text-center">Your Rewards</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Base XP</span>
            <span className="text-white">{rewards.baseXp}</span>
          </div>
          <div className="flex justify-between text-yellow-400">
            <span>Party Bonus ({stats.bonusMultiplier}x)</span>
            <span>+{rewards.partyBonus}</span>
          </div>
          {rewards.hostBonus > 0 && (
            <div className="flex justify-between text-neon-purple">
              <span>Host Bonus (10%)</span>
              <span>+{rewards.hostBonus}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold">
            <span>Total XP</span>
            <span className="text-xl bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">
              {rewards.totalXp}
            </span>
          </div>
        </div>
        <div className="text-center mt-4 pt-4 border-t border-white/10">
          <p className="text-text-muted text-sm mb-1">DANZ Earned</p>
          <p className="text-3xl font-bold text-danz-gold">
            {rewards.danzTokens.toFixed(1)} DANZ
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full mt-auto">
        <button onClick={onNewParty} className="btn-secondary flex-1">
          New Party
        </button>
        <button className="btn-primary flex-1">Share Results</button>
      </div>
    </div>
  )
}
