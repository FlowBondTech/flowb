'use client'

import { useEffect, useState } from 'react'

export type TransactionStatus = 'pending' | 'success' | 'error'

export interface Transaction {
  id: string
  type: 'purchase' | 'reward' | 'transfer' | 'checkin'
  status: TransactionStatus
  title: string
  description?: string
  amount?: number
  emoji?: string
}

interface TransactionToastProps {
  transaction: Transaction | null
  onDismiss: () => void
  autoDismissMs?: number
}

export function TransactionToast({
  transaction,
  onDismiss,
  autoDismissMs = 4000
}: TransactionToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (transaction) {
      setIsVisible(true)
      setIsExiting(false)

      // Auto-dismiss after delay (only for success/error)
      if (transaction.status !== 'pending') {
        const timer = setTimeout(() => {
          handleDismiss()
        }, autoDismissMs)
        return () => clearTimeout(timer)
      }
    }
  }, [transaction, autoDismissMs])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 300)
  }

  if (!transaction || !isVisible) return null

  const statusConfig = {
    pending: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/40',
      icon: '⏳',
      text: 'text-yellow-400',
    },
    success: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/40',
      icon: '✅',
      text: 'text-green-400',
    },
    error: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      icon: '❌',
      text: 'text-red-400',
    },
  }

  const config = statusConfig[transaction.status]

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center pointer-events-none px-3 pt-2">
      <div
        className={`
          pointer-events-auto max-w-sm w-full
          ${config.bg} ${config.border}
          backdrop-blur-xl rounded-xl border p-3
          shadow-lg shadow-black/20
          transition-all duration-300 ease-out
          ${isExiting
            ? 'opacity-0 -translate-y-4 scale-95'
            : 'opacity-100 translate-y-0 scale-100'
          }
        `}
        onClick={transaction.status !== 'pending' ? handleDismiss : undefined}
      >
        <div className="flex items-start gap-3">
          {/* Icon/Emoji */}
          <div className="flex-shrink-0 text-xl">
            {transaction.status === 'pending' ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <span>{transaction.emoji || config.icon}</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`font-semibold text-sm ${config.text}`}>
                {transaction.title}
              </h4>
              {transaction.amount !== undefined && (
                <span className="text-xs font-mono text-danz-pink-400 shrink-0">
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount} DANZ
                </span>
              )}
            </div>
            {transaction.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                {transaction.description}
              </p>
            )}
          </div>

          {/* Close button (not shown for pending) */}
          {transaction.status !== 'pending' && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-300"
            >
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>

        {/* Progress bar for pending */}
        {transaction.status === 'pending' && (
          <div className="mt-2 h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400/60 rounded-full animate-pulse w-full" />
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for managing transaction toasts
export function useTransactionToast() {
  const [transaction, setTransaction] = useState<Transaction | null>(null)

  const showTransaction = (txn: Omit<Transaction, 'id'>) => {
    setTransaction({
      ...txn,
      id: Date.now().toString(),
    })
  }

  const dismissTransaction = () => {
    setTransaction(null)
  }

  const showPurchase = (itemName: string, price: number) => {
    showTransaction({
      type: 'purchase',
      status: 'pending',
      title: 'Processing Purchase',
      description: `Buying ${itemName}...`,
      amount: -price,
      emoji: '🛒',
    })
  }

  const showPurchaseSuccess = (itemName: string, price: number) => {
    showTransaction({
      type: 'purchase',
      status: 'success',
      title: 'Purchase Complete!',
      description: `You bought ${itemName}`,
      amount: -price,
      emoji: '🎉',
    })
  }

  const showPurchaseError = (itemName: string, error?: string) => {
    showTransaction({
      type: 'purchase',
      status: 'error',
      title: 'Purchase Failed',
      description: error || `Could not buy ${itemName}`,
      emoji: '😢',
    })
  }

  const showReward = (amount: number, reason: string) => {
    showTransaction({
      type: 'reward',
      status: 'success',
      title: 'Reward Earned!',
      description: reason,
      amount: amount,
      emoji: '💰',
    })
  }

  const showCheckinReward = (xp: number, streakBonus: number) => {
    showTransaction({
      type: 'checkin',
      status: 'success',
      title: 'Check-in Complete!',
      description: streakBonus > 0 ? `+${streakBonus} streak bonus` : undefined,
      amount: xp + streakBonus,
      emoji: '💃',
    })
  }

  return {
    transaction,
    showTransaction,
    dismissTransaction,
    showPurchase,
    showPurchaseSuccess,
    showPurchaseError,
    showReward,
    showCheckinReward,
  }
}
