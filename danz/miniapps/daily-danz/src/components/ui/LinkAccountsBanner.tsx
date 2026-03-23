'use client'

import { useState } from 'react'
import {
  getLinkingStatus,
  LINKING_REWARDS,
  type User
} from '@/types/auth'

interface LinkAccountsBannerProps {
  user: User | null
  onLinkAccount?: () => void
  variant?: 'banner' | 'compact' | 'card'
}

export function LinkAccountsBanner({
  user,
  onLinkAccount,
  variant = 'banner'
}: LinkAccountsBannerProps) {
  const [isLinking, setIsLinking] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Don't show if no user or dismissed
  if (!user || dismissed) return null

  const status = getLinkingStatus(user)

  // Don't show if already fully linked
  if (status.hasFarcaster && status.hasPrivy) return null

  const handleLinkAccount = async () => {
    setIsLinking(true)
    try {
      if (onLinkAccount) {
        onLinkAccount()
      } else {
        // Default: Generate linking token and open web app
        const response = await fetch('/api/auth/generate-linking-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetProvider: 'privy' })
        })
        const data = await response.json()

        if (data.linkUrl) {
          window.open(data.linkUrl, '_blank')
        }
      }
    } catch (error) {
      console.error('Failed to initiate linking:', error)
    } finally {
      setIsLinking(false)
    }
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleLinkAccount}
        disabled={isLinking}
        className="flex items-center gap-2 px-3 py-1.5 text-xs
                   bg-gradient-to-r from-pink-500/20 to-purple-500/20
                   border border-pink-500/30 rounded-full
                   hover:from-pink-500/30 hover:to-purple-500/30
                   transition-all duration-200"
      >
        <span>🔗</span>
        <span className="text-white/90">Link Account +{LINKING_REWARDS.firstLink} XP</span>
      </button>
    )
  }

  if (variant === 'card') {
    return (
      <div className="glass-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500
                          flex items-center justify-center text-2xl flex-shrink-0">
            🔗
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-white text-lg mb-1">
              Link Your Accounts
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Connect your DANZ web account to sync all your rewards, streaks,
              and XP in one place. Plus earn a bonus!
            </p>

            {/* Current status */}
            <div className="flex flex-wrap gap-2 mb-4">
              <StatusPill
                icon="🟣"
                label="Farcaster"
                connected={status.hasFarcaster}
                detail={status.farcasterUsername}
              />
              <StatusPill
                icon="🌐"
                label="DANZ Web"
                connected={status.hasPrivy}
                detail={status.privyEmail}
              />
            </div>

            <button
              onClick={handleLinkAccount}
              disabled={isLinking}
              className="w-full py-3 rounded-xl font-semibold text-white
                         bg-gradient-to-r from-pink-500 to-purple-500
                         hover:from-pink-600 hover:to-purple-600
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-lg shadow-purple-500/25"
            >
              {isLinking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Connecting...
                </span>
              ) : (
                <span>Link DANZ Account · +{LINKING_REWARDS.firstLink} XP</span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Default: Banner variant
  return (
    <div className="relative overflow-hidden rounded-2xl mb-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20" />
      <div className="absolute inset-0 backdrop-blur-xl" />

      {/* Border glow */}
      <div className="absolute inset-0 rounded-2xl border border-white/10" />

      {/* Content */}
      <div className="relative p-4">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 text-white/40 hover:text-white/70
                     transition-colors rounded-full hover:bg-white/10"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500
                          flex items-center justify-center text-xl flex-shrink-0
                          shadow-lg shadow-purple-500/30">
            🔗
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">
              Link Your DANZ Account
            </p>
            <p className="text-white/60 text-xs truncate">
              Sync rewards & earn +{LINKING_REWARDS.firstLink} XP bonus!
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleLinkAccount}
            disabled={isLinking}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-pink-500 to-purple-500
                       hover:from-pink-600 hover:to-purple-600
                       disabled:opacity-50 flex-shrink-0
                       transition-all duration-200 shadow-lg shadow-purple-500/25"
          >
            {isLinking ? '...' : 'Link'}
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-3">
          <ProgressDot
            filled={status.hasFarcaster}
            label="Farcaster"
          />
          <div className="w-4 h-px bg-white/20" />
          <ProgressDot
            filled={status.hasPrivy}
            label="DANZ Web"
          />
          <div className="w-4 h-px bg-white/20" />
          <ProgressDot
            filled={status.hasFarcaster && status.hasPrivy}
            label="Synced!"
          />
        </div>
      </div>
    </div>
  )
}

// Helper Components

function StatusPill({
  icon,
  label,
  connected,
  detail
}: {
  icon: string
  label: string
  connected: boolean
  detail?: string
}) {
  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
      ${connected
        ? 'bg-green-500/20 border border-green-500/30'
        : 'bg-white/5 border border-white/10'
      }
    `}>
      <span>{icon}</span>
      <span className={connected ? 'text-green-400' : 'text-white/50'}>
        {connected ? (detail || label) : `Connect ${label}`}
      </span>
      {connected && (
        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  )
}

function ProgressDot({
  filled,
  label
}: {
  filled: boolean
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`
        w-2 h-2 rounded-full transition-all duration-300
        ${filled
          ? 'bg-green-400 shadow-lg shadow-green-400/50'
          : 'bg-white/20'
        }
      `} />
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  )
}

export default LinkAccountsBanner
