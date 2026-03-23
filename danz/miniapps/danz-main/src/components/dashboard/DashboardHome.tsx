'use client'

import { useAuth } from '@/contexts/AuthContext'

interface DashboardHomeProps {
  onStartDance: () => void
  onStartParty: () => void
  onNavigate: (tab: string) => void
}

export function DashboardHome({ onStartDance, onStartParty, onNavigate }: DashboardHomeProps) {
  const { user, isAuthenticated } = useAuth()

  // Mock user stats - will be replaced with GraphQL
  const userStats = {
    level: 1,
    xp: 250,
    xpToNextLevel: 1000,
    danzTokens: 0,
    sessions: 0,
    eventsAttended: 0,
    achievements: 0,
    totalDanceTime: '0h 0m',
    danceBonds: 0,
  }

  const xpProgress = (userStats.xp / userStats.xpToNextLevel) * 100

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Hero Section with Avatar and Level Ring */}
      <div className="card glow-pink">
        <div className="flex flex-col items-center py-4">
          {/* Avatar with Level Ring */}
          <div className="relative w-24 h-24 mb-4">
            {/* Animated level ring */}
            <div className="level-ring" />
            <div className="level-ring-inner" />

            {/* Avatar */}
            <div className="absolute inset-[6px] rounded-full overflow-hidden bg-bg-card flex items-center justify-center">
              {isAuthenticated && user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">💃</span>
              )}
            </div>

            {/* Level badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-neon-pink to-neon-purple flex items-center justify-center text-sm font-bold shadow-glow-sm">
              {userStats.level}
            </div>
          </div>

          {/* User name */}
          <h2 className="text-xl font-bold mb-1">
            {isAuthenticated && user ? (
              user.displayName || user.username || 'Dancer'
            ) : (
              'Welcome, Dancer!'
            )}
          </h2>

          {/* Username */}
          {isAuthenticated && user && (
            <p className="text-text-muted text-sm mb-3">
              @{user.username || (user.fid ? `fid:${user.fid}` : 'dancer')}
            </p>
          )}

          {/* XP Progress Bar */}
          <div className="w-full max-w-[200px] mb-2">
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Level {userStats.level}</span>
              <span>{userStats.xp} / {userStats.xpToNextLevel} XP</span>
            </div>
            <div className="xp-progress">
              <div
                className="xp-progress-fill"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>

          {/* CTA Button */}
          <button onClick={onStartDance} className="btn-primary mt-2">
            Start Dancing
          </button>
        </div>
      </div>

      {/* Dance Party Banner */}
      <div
        onClick={onStartParty}
        className="card bg-gradient-to-r from-neon-purple/20 via-neon-pink/20 to-neon-purple/20 border-neon-purple/30 cursor-pointer hover:scale-[1.02] transition-transform"
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl animate-bounce">🎊</div>
          <div className="flex-1">
            <h3 className="font-bold text-white flex items-center gap-2">
              Dance Party
              <span className="text-xs bg-neon-pink px-2 py-0.5 rounded-full">NEW</span>
            </h3>
            <p className="text-sm text-text-secondary">
              Dance with friends for <span className="text-yellow-400 font-medium">2x XP bonus!</span>
            </p>
          </div>
          <span className="text-neon-pink text-2xl">→</span>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard
          icon="🎯"
          title="Daily Goal"
          subtitle="0/3 dances"
          gradient="from-neon-pink/20 to-neon-purple/20"
          onClick={() => onStartDance()}
        />
        <QuickActionCard
          icon="🎊"
          title="Party"
          subtitle="2x XP bonus"
          gradient="from-neon-purple/20 to-blue-500/20"
          onClick={onStartParty}
        />
        <QuickActionCard
          icon="⚡"
          title="Activity"
          subtitle="View stats"
          gradient="from-orange-500/20 to-yellow-500/20"
          onClick={() => onNavigate('profile')}
        />
        <QuickActionCard
          icon="👤"
          title="Profile"
          subtitle="Edit info"
          gradient="from-green-500/20 to-emerald-500/20"
          onClick={() => onNavigate('profile')}
        />
      </div>

      {/* Stats Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-neon-pink">📊</span>
          Your Stats
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <StatCard
            icon="💃"
            value={userStats.sessions.toString()}
            label="Sessions"
          />
          <StatCard
            icon="📍"
            value={userStats.eventsAttended.toString()}
            label="Events"
          />
          <StatCard
            icon="🏆"
            value={userStats.achievements.toString()}
            label="Badges"
          />
          <StatCard
            icon="⏱️"
            value={userStats.totalDanceTime}
            label="Dance Time"
          />
          <StatCard
            icon="🤝"
            value={userStats.danceBonds.toString()}
            label="Bonds"
          />
          <StatCard
            icon="🪙"
            value={userStats.danzTokens.toString()}
            label="DANZ"
            highlight
          />
        </div>
      </div>

      {/* Leaderboard Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-neon-purple">🏅</span>
            Leaderboard
          </h3>
          <button className="text-sm text-neon-pink">View All</button>
        </div>

        <div className="space-y-2">
          <LeaderboardRow rank={1} name="DanceQueen" xp={12500} isGold />
          <LeaderboardRow rank={2} name="GrooveKing" xp={11200} isSilver />
          <LeaderboardRow rank={3} name="MovesMaster" xp={10800} isBronze />
          <div className="border-t border-white/10 pt-2 mt-2">
            <LeaderboardRow
              rank={99}
              name={user?.displayName || 'You'}
              xp={userStats.xp}
              isYou
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick Action Card Component
function QuickActionCard({
  icon,
  title,
  subtitle,
  gradient,
  onClick,
}: {
  icon: string
  title: string
  subtitle: string
  gradient: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`action-card bg-gradient-to-br ${gradient}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="text-left">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-text-muted">{subtitle}</p>
        </div>
      </div>
    </button>
  )
}

// Stat Card Component
function StatCard({
  icon,
  value,
  label,
  highlight,
}: {
  icon: string
  value: string
  label: string
  highlight?: boolean
}) {
  return (
    <div className={`stat-card text-center ${highlight ? 'border-neon-pink/30 bg-neon-pink/5' : ''}`}>
      <span className="text-lg">{icon}</span>
      <p className={`text-lg font-bold ${highlight ? 'text-neon-pink' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  )
}

// Leaderboard Row Component
function LeaderboardRow({
  rank,
  name,
  xp,
  isGold,
  isSilver,
  isBronze,
  isYou,
}: {
  rank: number
  name: string
  xp: number
  isGold?: boolean
  isSilver?: boolean
  isBronze?: boolean
  isYou?: boolean
}) {
  const getRankStyle = () => {
    if (isGold) return 'bg-yellow-500/20 text-yellow-400'
    if (isSilver) return 'bg-gray-400/20 text-gray-300'
    if (isBronze) return 'bg-orange-600/20 text-orange-400'
    if (isYou) return 'bg-neon-pink/20 text-neon-pink'
    return 'bg-white/10 text-text-muted'
  }

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${isYou ? 'bg-neon-pink/10' : ''}`}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getRankStyle()}`}>
        {rank}
      </span>
      <span className={`flex-1 text-sm font-medium ${isYou ? 'text-neon-pink' : ''}`}>
        {name}
      </span>
      <span className="text-sm text-text-muted">
        {xp.toLocaleString()} XP
      </span>
    </div>
  )
}
