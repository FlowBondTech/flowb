'use client'

import { DailyCheckIn } from '@/components/checkin'
import { MiniAppSplash } from '@/components/ui/MiniAppSplash'
import { BottomNav } from '@/components/ui/BottomNav'
import { WebLoginPrompt } from '@/components/auth'
import { useAuth } from '@/contexts/AuthContext'
import { useFarcasterSDK } from '@/hooks/useFarcasterSDK'
import { useCheckin } from '@/hooks/useCheckin'
import { useEffect, useState } from 'react'

export default function Home() {
  const { isLoaded, ready } = useFarcasterSDK()
  const { user, isAuthenticated, isLoading, isFarcasterFrame, openSignupPage } = useAuth()
  const { hasCheckedInToday, stats, checkIn, isLoading: checkinLoading } = useCheckin()
  const [showSplash, setShowSplash] = useState(true)

  // Get streak from stats or default to 0
  const currentStreak = stats?.currentStreak ?? 0

  // Handle splash screen timing and SDK ready call
  useEffect(() => {
    if (!isLoaded || isLoading) return

    const timer = setTimeout(async () => {
      // CRITICAL: Call ready() to hide Farcaster splash screen
      await ready()
      setShowSplash(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [isLoaded, isLoading, ready])

  // Render splash screen
  if (showSplash || !isLoaded || isLoading || checkinLoading) {
    return <MiniAppSplash title="Daily Danz" subtitle="Check in. Build streaks. Earn rewards." />
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-bg-secondary/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Inline SVG logo */}
          <svg className="w-7 h-7" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="url(#hdr-grad)" strokeWidth="3" fill="none" />
            <path d="M24 20 L32 44 L40 20" stroke="url(#hdr-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <defs>
              <linearGradient id="hdr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6ec7" />
                <stop offset="100%" stopColor="#b967ff" />
              </linearGradient>
            </defs>
          </svg>
          <span className="font-display font-bold text-base bg-gradient-neon bg-clip-text text-transparent">
            Daily Danz
          </span>
        </div>

        {/* User avatar if authenticated */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-2">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.displayName || 'User'}
                className="w-7 h-7 rounded-full border-2 border-neon-pink"
              />
            )}
          </div>
        )}

        {/* Signup button for users not in Farcaster frame */}
        {!isFarcasterFrame && (
          <button onClick={openSignupPage} className="btn-secondary text-xs py-1.5 px-3">
            Sign Up
          </button>
        )}
      </header>

      {/* Main Content - add padding for auto-hide nav */}
      <main className="flex-1 overflow-y-auto pb-20">
        {/* Show login prompt for web users not authenticated */}
        {!isFarcasterFrame && !isAuthenticated ? (
          <WebLoginPrompt onSignUp={openSignupPage} />
        ) : (
          <DailyCheckIn
            currentStreak={currentStreak}
            hasCheckedInToday={hasCheckedInToday}
            onCheckIn={checkIn}
          />
        )}
      </main>

      {/* Auto-hide Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
