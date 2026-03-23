'use client'

import { useState } from 'react'
import type { PartyTreasury as TreasuryType, MemberStake, SlashEvent } from '@/types/accountability'
import type { PartyPoolType, PARTY_POOL_CONFIGS } from '@/types/party'

interface PartyTreasuryProps {
  treasury: TreasuryType
  memberStake: MemberStake
  partyType: PartyPoolType
  recentSlashes?: SlashEvent[]
  onStakeMore?: () => void
  onWithdraw?: () => void
}

export function PartyTreasury({
  treasury,
  memberStake,
  partyType,
  recentSlashes = [],
  onStakeMore,
  onWithdraw,
}: PartyTreasuryProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Calculate days until unlock
  const daysUntilUnlock = Math.max(
    0,
    Math.ceil((new Date(memberStake.lockedUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  const isLocked = daysUntilUnlock > 0

  // Calculate protection status
  const hasProtection = memberStake.slashProtectionActive
  const protectionExpiry = memberStake.slashProtectionExpiresAt
    ? new Date(memberStake.slashProtectionExpiresAt)
    : null

  // Format numbers
  const formatNumber = (n: number) => n.toLocaleString()

  return (
    <div className="bg-bg-card/80 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <span>🏦</span> Party Treasury
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            partyType === 'intimate'
              ? 'bg-purple-500/20 text-purple-400'
              : partyType === 'creator'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {partyType.charAt(0).toUpperCase() + partyType.slice(1)} Pool
          </span>
        </div>
      </div>

      {/* Treasury Overview */}
      <div className="p-4 bg-gradient-to-br from-danz-purple-500/10 to-danz-pink-500/10">
        <div className="grid grid-cols-2 gap-4">
          {/* Total Treasury */}
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Total Treasury</p>
            <p className="text-2xl font-display font-bold bg-gradient-neon bg-clip-text text-transparent">
              {formatNumber(treasury.totalBalance)}
            </p>
            <p className="text-xs text-gray-500">DANZ</p>
          </div>

          {/* Rewards Pool */}
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Rewards Pool</p>
            <p className="text-2xl font-display font-bold text-green-400">
              {formatNumber(treasury.rewardsPool)}
            </p>
            <p className="text-xs text-gray-500">DANZ</p>
          </div>
        </div>

        {/* Creator Token Balance (if applicable) */}
        {treasury.creatorTokenAddress && (
          <div className="mt-4 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Creator Token Balance</span>
              <span className="font-bold text-yellow-400">
                {formatNumber(treasury.creatorTokenBalance || 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Your Stake */}
      <div className="p-4 border-t border-white/5">
        <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
          <span>💰</span> Your Stake
        </h4>

        <div className="space-y-3">
          {/* Staked Amount */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Staked Amount</span>
            <span className="font-bold text-lg">{formatNumber(memberStake.stakedAmount)} DANZ</span>
          </div>

          {/* Lock Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Lock Status</span>
            {isLocked ? (
              <span className="text-orange-400 text-sm flex items-center gap-1">
                🔒 {daysUntilUnlock} days remaining
              </span>
            ) : (
              <span className="text-green-400 text-sm flex items-center gap-1">
                🔓 Unlocked
              </span>
            )}
          </div>

          {/* Protection Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Slash Protection</span>
            {hasProtection ? (
              <span className="text-cyan-400 text-sm flex items-center gap-1">
                🛡️ Active
                {protectionExpiry && (
                  <span className="text-xs text-gray-500">
                    (until {protectionExpiry.toLocaleDateString()})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-gray-500 text-sm">None active</span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-2 bg-red-500/10 rounded-lg text-center">
              <p className="text-xs text-gray-400">Total Slashed</p>
              <p className="font-bold text-red-400">-{formatNumber(memberStake.totalSlashed)}</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg text-center">
              <p className="text-xs text-gray-400">Total Earned</p>
              <p className="font-bold text-green-400">+{formatNumber(memberStake.totalEarned)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Slashes (if any) */}
      {recentSlashes.length > 0 && (
        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-sm"
          >
            <span className="text-gray-400 flex items-center gap-2">
              <span>⚠️</span> Recent Slash Events ({recentSlashes.length})
            </span>
            <span className="text-gray-500">{showDetails ? '▲' : '▼'}</span>
          </button>

          {showDetails && (
            <div className="mt-3 space-y-2">
              {recentSlashes.slice(0, 5).map((slash) => (
                <div
                  key={slash.id}
                  className={`p-2 rounded-lg text-xs ${
                    slash.wasProtected
                      ? 'bg-cyan-500/10 border border-cyan-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize text-gray-300">
                      {slash.reason.replace(/_/g, ' ')}
                    </span>
                    {slash.wasProtected ? (
                      <span className="text-cyan-400">🛡️ Protected</span>
                    ) : (
                      <span className="text-red-400">-{slash.amount} DANZ</span>
                    )}
                  </div>
                  <p className="text-gray-500 mt-1">
                    {new Date(slash.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-white/5 flex gap-3">
        <button
          onClick={onStakeMore}
          className="flex-1 py-3 bg-gradient-to-r from-neon-pink to-neon-purple rounded-xl font-medium text-sm hover:scale-[1.02] transition-transform"
        >
          Stake More
        </button>
        <button
          onClick={onWithdraw}
          disabled={isLocked}
          className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
            isLocked
              ? 'bg-white/5 text-gray-500 cursor-not-allowed'
              : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          {isLocked ? `Locked (${daysUntilUnlock}d)` : 'Withdraw'}
        </button>
      </div>

      {/* Next Distribution */}
      <div className="px-4 pb-4">
        <p className="text-xs text-center text-gray-500">
          Next reward distribution: {new Date(treasury.nextDistributionAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

// Compact version for party cards
export function TreasuryBadge({
  totalBalance,
  rewardsPool,
}: {
  totalBalance: number
  rewardsPool: number
}) {
  return (
    <div className="flex items-center gap-3 p-2 bg-bg-card/60 rounded-lg">
      <div className="text-center">
        <p className="text-xs text-gray-400">Treasury</p>
        <p className="font-bold text-sm">{totalBalance.toLocaleString()}</p>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="text-center">
        <p className="text-xs text-gray-400">Rewards</p>
        <p className="font-bold text-sm text-green-400">{rewardsPool.toLocaleString()}</p>
      </div>
    </div>
  )
}
