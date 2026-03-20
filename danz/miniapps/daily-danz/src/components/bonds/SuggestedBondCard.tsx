'use client'

import { SuggestedBond, BOND_TYPE_INFO, MATCH_REASON_INFO } from '@/types/bonds'

interface SuggestedBondCardProps {
  bond: SuggestedBond
  onAccept: (bondId: string) => void
  onDecline: (bondId: string) => void
  isLoading?: boolean
}

export function SuggestedBondCard({ bond, onAccept, onDecline, isLoading }: SuggestedBondCardProps) {
  const bondInfo = BOND_TYPE_INFO[bond.bondType]

  // Get top 3 match reasons
  const topReasons = bond.matchReasons
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  return (
    <div className="relative overflow-hidden rounded-2xl bg-bg-card/80 backdrop-blur-md border border-white/10 p-4 transition-all duration-300 hover:border-neon-pink/30">
      {/* Compatibility score badge */}
      <div className="absolute top-3 right-3">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-danz-pink-500/20 to-danz-purple-500/20 border border-danz-pink-500/30">
          <span className="text-xs text-danz-pink-300 font-semibold">
            {bond.compatibilityScore}% match
          </span>
        </div>
      </div>

      {/* User info */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar with bond type ring */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-danz-pink-500 to-danz-purple-500 opacity-60 blur-sm" />
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-danz-pink-500/50">
            {bond.suggestedUser.avatarUrl ? (
              <img
                src={bond.suggestedUser.avatarUrl}
                alt={bond.suggestedUser.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-danz-pink-500 to-danz-purple-500 flex items-center justify-center text-xl font-bold text-white">
                {bond.suggestedUser.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Bond type emoji badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-bg-primary border border-white/20 flex items-center justify-center text-sm">
            {bondInfo.emoji}
          </div>
        </div>

        {/* Name and bond type */}
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-white font-semibold truncate">
            {bond.suggestedUser.displayName}
          </h3>
          <p className="text-gray-400 text-sm truncate">
            @{bond.suggestedUser.username}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-danz-cyan-400 font-medium">
              {bondInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Bio if available */}
      {bond.suggestedUser.bio && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {bond.suggestedUser.bio}
        </p>
      )}

      {/* Match reasons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {topReasons.map((reason, index) => {
          const reasonInfo = MATCH_REASON_INFO[reason.type]
          return (
            <div
              key={index}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs"
            >
              <span>{reasonInfo.emoji}</span>
              <span className="text-gray-300">{reasonInfo.label}</span>
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onDecline(bond.id)}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-600/50 text-gray-400 text-sm font-medium
                     transition-all duration-300 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-800/30
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Skip
        </button>
        <button
          onClick={() => onAccept(bond.id)}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-danz-pink-500 to-danz-purple-500
                     text-white text-sm font-semibold shadow-glow-pink
                     transition-all duration-300 hover:scale-[1.02] hover:shadow-neon-glow
                     active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Bonding...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <span>{bondInfo.emoji}</span>
              Bond
            </span>
          )}
        </button>
      </div>

      {/* Expiry notice */}
      <p className="text-center text-gray-500 text-xs mt-3">
        Expires in {getTimeUntilExpiry(bond.expiresAt)}
      </p>
    </div>
  )
}

function getTimeUntilExpiry(expiresAt: string): string {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry.getTime() - now.getTime()

  if (diff <= 0) return 'expired'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes} min`
}
