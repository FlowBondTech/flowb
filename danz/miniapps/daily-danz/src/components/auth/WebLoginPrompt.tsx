'use client'

import { useState } from 'react'
import { FarcasterLoginButton } from './FarcasterLoginButton'

interface WebLoginPromptProps {
  onSignUp: () => void
  onFarcasterLogin?: (user: {
    fid: number
    username: string
    displayName: string
    pfpUrl: string
  }) => void
}

export function WebLoginPrompt({ onSignUp, onFarcasterLogin }: WebLoginPromptProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleFarcasterSuccess = (user: {
    fid: number
    username: string
    displayName: string
    pfpUrl: string
    signerUuid: string
  }) => {
    setIsLoggingIn(false)
    if (onFarcasterLogin) {
      onFarcasterLogin(user)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-8 text-center">
      {/* Logo/Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-danz-pink-500 to-danz-purple-600 flex items-center justify-center shadow-neon-pink mb-6">
        <span className="text-4xl">💃</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-2">
        Daily DANZ
      </h1>
      <p className="text-gray-400 text-sm mb-6 max-w-xs">
        Check in daily, build streaks, and earn rewards for dancing!
      </p>

      {/* Sign In With Farcaster */}
      <div className="w-full max-w-xs mb-4">
        <FarcasterLoginButton
          onSuccess={handleFarcasterSuccess}
          onError={(error) => {
            console.error('Farcaster login error:', error)
            setIsLoggingIn(false)
          }}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4 w-full max-w-xs">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-gray-500 text-xs">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Open in Warpcast - secondary option */}
      <a
        href="https://warpcast.com/~/frames/launch?url=https://dailydanz.app"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full max-w-xs py-3 px-6 bg-white/5 border border-white/10 rounded-xl text-white/80 font-medium text-center hover:bg-white/10 transition-colors mb-3 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        Open in Warpcast
      </a>

      {/* Create Account */}
      <button
        onClick={onSignUp}
        className="w-full max-w-xs py-3 px-6 bg-white/5 border border-white/10 rounded-xl text-white/80 font-medium hover:bg-white/10 transition-colors"
      >
        Create DANZ Account
      </button>

      {/* Info */}
      <p className="text-gray-500 text-xs mt-6 max-w-xs">
        Sign in with Farcaster to track your daily check-ins and earn rewards.
      </p>
    </div>
  )
}

// For testing: A simple FID input form
export function DevLoginForm({
  onLogin,
}: {
  onLogin: (fid: number) => void
}) {
  const [fid, setFid] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fidNum = parseInt(fid, 10)
    if (isNaN(fidNum) || fidNum <= 0) {
      setError('Please enter a valid FID')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Verify user exists via Neynar
      const response = await fetch(`/api/farcaster/user?fid=${fidNum}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'User not found')
      }

      onLogin(fidNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mt-4">
      <p className="text-yellow-400 text-xs mb-2">
        Dev Mode: Login with FID
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={fid}
          onChange={(e) => setFid(e.target.value)}
          placeholder="Enter FID"
          className="flex-1 px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-danz-pink-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-danz-pink-500 rounded-lg text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? '...' : 'Login'}
        </button>
      </form>
      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}
    </div>
  )
}
