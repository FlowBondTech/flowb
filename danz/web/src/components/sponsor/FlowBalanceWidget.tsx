'use client'

import { FiArrowUpRight, FiClock, FiDollarSign, FiTrendingUp } from 'react-icons/fi'

interface FlowBalanceWidgetProps {
  availableBalance: number
  pendingBalance?: number
  totalEarned?: number
  variant?: 'default' | 'compact' | 'detailed'
  onSwapClick?: () => void
  onWithdrawClick?: () => void
}

export default function FlowBalanceWidget({
  availableBalance,
  pendingBalance = 0,
  totalEarned = 0,
  variant = 'default',
  onSwapClick,
  onWithdrawClick,
}: FlowBalanceWidgetProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center">
          <FiDollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-text-muted">$FLOW Balance</p>
          <p className="text-lg font-bold text-text-primary">
            ${availableBalance.toLocaleString()}
          </p>
        </div>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className="p-6 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-2xl border border-neon-purple/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-text-muted">$FLOW Balance</p>
              <p className="text-2xl font-bold text-text-primary">
                ${availableBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <FiClock className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-text-muted">Pending</span>
            </div>
            <p className="text-lg font-semibold text-yellow-400">
              ${pendingBalance.toLocaleString()}
            </p>
          </div>

          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <FiTrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-text-muted">Total Earned</span>
            </div>
            <p className="text-lg font-semibold text-green-400">${totalEarned.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {onSwapClick && (
            <button
              onClick={onSwapClick}
              className="flex-1 py-2.5 px-4 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-lg text-neon-purple font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              Swap to $DANZ
              <FiArrowUpRight className="w-4 h-4" />
            </button>
          )}
          {onWithdrawClick && (
            <button
              onClick={onWithdrawClick}
              className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-text-primary font-medium text-sm transition-colors"
            >
              Withdraw
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className="p-5 bg-bg-secondary border border-white/10 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center">
            <FiDollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-text-muted">Available $FLOW</p>
            <p className="text-xl font-bold text-text-primary">
              ${availableBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {(pendingBalance > 0 || totalEarned > 0) && (
        <div className="flex items-center gap-4 text-sm mb-4">
          {pendingBalance > 0 && (
            <div className="flex items-center gap-1.5 text-yellow-400">
              <FiClock className="w-3.5 h-3.5" />
              <span>${pendingBalance.toLocaleString()} pending</span>
            </div>
          )}
          {totalEarned > 0 && (
            <div className="flex items-center gap-1.5 text-green-400">
              <FiTrendingUp className="w-3.5 h-3.5" />
              <span>${totalEarned.toLocaleString()} earned</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {onSwapClick && (
          <button
            onClick={onSwapClick}
            className="flex-1 py-2 px-3 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-lg text-neon-purple font-medium text-sm transition-colors"
          >
            Swap
          </button>
        )}
        {onWithdrawClick && (
          <button
            onClick={onWithdrawClick}
            className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-text-primary font-medium text-sm transition-colors"
          >
            Withdraw
          </button>
        )}
      </div>
    </div>
  )
}
