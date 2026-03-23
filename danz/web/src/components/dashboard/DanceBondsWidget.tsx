'use client'

import { useRouter } from 'next/navigation'
import { FiMessageCircle, FiUserPlus, FiUsers } from 'react-icons/fi'

interface DanceBond {
  id: string
  username: string
  displayName: string
  avatar: string | null
  danceStyles: string[]
  bondStrength: number
  recentActivity: string
  isOnline: boolean
}

// Mock data - will be replaced with real GraphQL data
const mockBonds: DanceBond[] = [
  {
    id: '1',
    username: 'alex_moves',
    displayName: 'Alex Martinez',
    avatar: null,
    danceStyles: ['Contemporary', 'Ballet'],
    bondStrength: 95,
    recentActivity: 'Posted 2h ago',
    isOnline: true,
  },
  {
    id: '2',
    username: 'rhythm_king',
    displayName: 'Marcus Johnson',
    avatar: null,
    danceStyles: ['Hip Hop', 'Breaking'],
    bondStrength: 87,
    recentActivity: 'Active 5h ago',
    isOnline: false,
  },
  {
    id: '3',
    username: 'dance_queen',
    displayName: 'Sarah Chen',
    avatar: null,
    danceStyles: ['Jazz', 'Tap'],
    bondStrength: 82,
    recentActivity: 'Posted 1d ago',
    isOnline: true,
  },
  {
    id: '4',
    username: 'breaker_pro',
    displayName: 'Tommy Lee',
    avatar: null,
    danceStyles: ['Breaking', 'Popping'],
    bondStrength: 78,
    recentActivity: 'Active 3d ago',
    isOnline: false,
  },
]

export default function DanceBondsWidget() {
  const router = useRouter()

  const getBondColor = (strength: number) => {
    if (strength >= 90) return 'text-yellow-400'
    if (strength >= 70) return 'text-neon-purple'
    if (strength >= 50) return 'text-blue-400'
    return 'text-gray-400'
  }

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
            <FiUsers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Dance Bonds</h2>
            <p className="text-sm text-text-secondary">{mockBonds.length} connections</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/connections')}
          className="text-sm text-neon-purple hover:text-neon-pink font-medium transition-colors"
        >
          View All
        </button>
      </div>

      {mockBonds.length > 0 ? (
        <div className="space-y-3">
          {mockBonds.slice(0, 4).map(bond => (
            <div
              key={bond.id}
              className="flex items-center gap-3 p-3 bg-bg-primary/30 hover:bg-bg-primary/50 border border-white/5 hover:border-neon-purple/30 rounded-xl transition-all cursor-pointer group"
              onClick={() => router.push(`/profile/${bond.username}`)}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {bond.avatar ? (
                  <img
                    src={bond.avatar}
                    alt={bond.displayName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-bg-secondary"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold border-2 border-bg-secondary">
                    {bond.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                {bond.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-bg-secondary rounded-full" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-neon-purple transition-colors">
                    {bond.displayName}
                  </h3>
                  {/* Bond Strength Indicator */}
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${getBondColor(bond.bondStrength)}`}
                    />
                    <span className={`text-xs font-medium ${getBondColor(bond.bondStrength)}`}>
                      {bond.bondStrength}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-muted mb-1">@{bond.username}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {bond.danceStyles.slice(0, 2).map(style => (
                    <span
                      key={style}
                      className="px-2 py-0.5 bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs rounded-full"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-1">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    router.push(`/messages/${bond.username}`)
                  }}
                  className="p-2 bg-bg-secondary hover:bg-neon-purple/10 border border-white/10 hover:border-neon-purple/50 rounded-lg text-text-secondary hover:text-neon-purple transition-all"
                  aria-label="Message"
                >
                  <FiMessageCircle size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-500/10 flex items-center justify-center">
            <FiUsers className="w-8 h-8 text-pink-400" />
          </div>
          <p className="text-text-secondary mb-4">No dance bonds yet</p>
          <button
            onClick={() => router.push('/dashboard/discover')}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-pink-500/30 transition-all inline-flex items-center gap-2"
          >
            <FiUserPlus size={18} />
            Discover Dancers
          </button>
        </div>
      )}

      {/* Suggested Connections */}
      {mockBonds.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Suggested for You</h3>
            <button className="text-xs text-neon-purple hover:text-neon-pink font-medium transition-colors">
              Refresh
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="flex-shrink-0 w-20 p-2 bg-bg-primary/30 hover:bg-bg-primary/50 border border-white/5 hover:border-neon-purple/30 rounded-lg text-center cursor-pointer group transition-all"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                  {String.fromCharCode(65 + i)}
                </div>
                <p className="text-xs text-text-secondary group-hover:text-neon-purple truncate transition-colors">
                  @user{i}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
