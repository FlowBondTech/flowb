'use client'

import { useAuth } from '@/src/contexts/AuthContext'
import { useFarcasterFrame } from '@/src/hooks/useFarcasterFrame'
import { useCallback, useEffect, useState } from 'react'

type AppPhase = 'splash' | 'auth' | 'main'
type Tab = 'home' | 'dance' | 'events' | 'wallet' | 'profile'

export default function MappPage() {
  // Farcaster SDK
  const {
    isLoaded: farcasterLoaded,
    isInFrame,
    context: farcasterContext,
    ready: farcasterReady,
    user: farcasterUser,
  } = useFarcasterFrame()

  // App auth context
  const { user, isAuthenticated, isLoading, login } = useAuth()

  // Local state
  const [phase, setPhase] = useState<AppPhase>('splash')
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [splashProgress, setSplashProgress] = useState(0)

  // Splash progress animation
  useEffect(() => {
    if (phase !== 'splash') return
    const interval = setInterval(() => {
      setSplashProgress(p => Math.min(p + 2, 100))
    }, 30)
    return () => clearInterval(interval)
  }, [phase])

  // Main initialization flow
  useEffect(() => {
    // Wait for both SDKs to load
    if (!farcasterLoaded || isLoading) return

    // Minimum splash duration (1.5s)
    const minSplashTime = setTimeout(() => {
      // Check auth state
      if (isAuthenticated && user) {
        setPhase('main')
      } else if (!isLoading) {
        setPhase('auth')
      }

      // CRITICAL: Tell Farcaster we're ready to show content
      farcasterReady()
    }, 1500)

    return () => clearTimeout(minSplashTime)
  }, [farcasterLoaded, isLoading, isAuthenticated, user, farcasterReady])

  // Handle login
  const handleLogin = useCallback(async () => {
    try {
      await login()
    } catch (error) {
      console.error('Login error:', error)
    }
  }, [login])

  // Watch for auth changes after login
  useEffect(() => {
    if (phase === 'auth' && isAuthenticated && user) {
      setPhase('main')
    }
  }, [phase, isAuthenticated, user])

  // ═══════════════════════════════════════════════════════════════
  // SPLASH SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (phase === 'splash') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-bg-primary to-[#0f0f1e]">
        {/* Video Background (optional - can enable later) */}
        {/* <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-30">
          <source src="/DancingDanz.mp4" type="video/mp4" />
        </video> */}

        {/* Logo Container */}
        <div className="relative w-[150px] h-[150px] mb-8 animate-fade-in">
          {/* Glow effect */}
          <div className="absolute inset-[-15px] bg-neon-pink rounded-full opacity-20 blur-xl animate-pulse" />

          {/* Spinning ring */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="w-full h-full rounded-full p-[3px] bg-gradient-to-br from-neon-pink to-neon-purple">
              <div className="w-full h-full rounded-full bg-transparent" />
            </div>
          </div>

          {/* Inner circle with logo */}
          <div className="absolute inset-[15px] rounded-full bg-bg-secondary flex flex-col items-center justify-center border-2 border-neon-pink/50">
            <span className="text-neon-pink text-2xl font-bold -mb-1">$</span>
            <span className="text-text-primary text-[28px] font-bold tracking-[2px]">DANZ</span>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-text-secondary text-lg tracking-[2px] mb-8 animate-fade-in">
          Move. Connect. Earn.
        </p>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-pink to-neon-purple transition-all duration-100"
            style={{ width: `${splashProgress}%` }}
          />
        </div>

        {/* Loading indicator */}
        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-neon-pink animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>

        {/* Farcaster context info (dev only) */}
        {isInFrame && farcasterUser && (
          <p className="text-text-muted text-xs mt-8 opacity-50">
            Welcome, @{farcasterUser.username || `fid:${farcasterUser.fid}`}
          </p>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTH SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (phase === 'auth') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-bg-primary to-[#0f0f1e] p-6">
        {/* Logo */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-pink to-neon-purple rounded-full opacity-20 blur-lg" />
          <div className="absolute inset-2 rounded-full bg-bg-secondary flex items-center justify-center border border-neon-pink/30">
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" stroke="url(#auth-grad)" strokeWidth="3" fill="none" />
              <path
                d="M24 20 L32 44 L40 20"
                stroke="url(#auth-grad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <defs>
                <linearGradient id="auth-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6ec7" />
                  <stop offset="100%" stopColor="#b967ff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome to DANZ</h1>
        <p className="text-text-secondary text-center mb-8 max-w-xs">
          Sign in to track your dance moves, earn tokens, and connect with dancers worldwide.
        </p>

        {/* Farcaster user info */}
        {isInFrame && farcasterUser && (
          <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 mb-6">
            {farcasterUser.pfpUrl && (
              <img
                src={farcasterUser.pfpUrl}
                alt=""
                className="w-10 h-10 rounded-full border-2 border-neon-purple"
              />
            )}
            <div>
              <p className="text-text-primary font-medium">
                {farcasterUser.displayName || farcasterUser.username}
              </p>
              <p className="text-text-muted text-sm">@{farcasterUser.username}</p>
            </div>
          </div>
        )}

        {/* Login button */}
        <button
          onClick={handleLogin}
          className="w-full max-w-xs py-4 px-6 bg-gradient-to-r from-neon-pink to-neon-purple rounded-xl font-semibold text-white shadow-lg shadow-neon-pink/20 hover:shadow-neon-pink/40 transition-all active:scale-95"
        >
          {isInFrame ? 'Continue with Farcaster' : 'Sign In'}
        </button>

        {/* Alternative login */}
        {!isInFrame && (
          <p className="text-text-muted text-sm mt-4">Connect with wallet, email, or social</p>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN APP
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-bg-secondary/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="url(#hdr-grad)" strokeWidth="3" fill="none" />
            <path
              d="M24 20 L32 44 L40 20"
              stroke="url(#hdr-grad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <defs>
              <linearGradient id="hdr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6ec7" />
                <stop offset="100%" stopColor="#b967ff" />
              </linearGradient>
            </defs>
          </svg>
          <span className="font-bold text-lg bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">
            DANZ
          </span>
        </div>

        {/* User avatar */}
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">@{user.username || 'dancer'}</span>
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full border-2 border-neon-pink"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-white text-sm font-bold">
                {user.username?.[0]?.toUpperCase() || 'D'}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'home' && <HomeTab onNavigate={setActiveTab} />}
        {activeTab === 'dance' && <DanceTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'profile' && <ProfileTab user={user} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex items-center justify-around px-2 py-2 border-t border-white/10 bg-bg-secondary/90 backdrop-blur-md safe-area-bottom">
        <NavButton
          icon="home"
          label="Home"
          active={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
        />
        <NavButton
          icon="dance"
          label="Dance"
          active={activeTab === 'dance'}
          onClick={() => setActiveTab('dance')}
        />
        <NavButton
          icon="events"
          label="Events"
          active={activeTab === 'events'}
          onClick={() => setActiveTab('events')}
        />
        <NavButton
          icon="wallet"
          label="Wallet"
          active={activeTab === 'wallet'}
          onClick={() => setActiveTab('wallet')}
        />
        <NavButton
          icon="profile"
          label="Profile"
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
        />
      </nav>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION BUTTON
// ═══════════════════════════════════════════════════════════════
function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  onClick: () => void
}) {
  const icons: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    dance:
      'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
    events:
      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    wallet:
      'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
        active ? 'bg-neon-pink/20 text-neon-pink' : 'text-text-muted hover:text-text-secondary'
      }`}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[icon]} />
      </svg>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB CONTENT
// ═══════════════════════════════════════════════════════════════
function HomeTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  return (
    <div className="p-4 space-y-4">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 rounded-2xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-text-primary mb-2">Ready to Dance?</h2>
        <p className="text-text-secondary text-sm mb-4">
          Start a session to earn tokens and track your moves.
        </p>
        <button
          onClick={() => onNavigate('dance')}
          className="w-full py-3 bg-gradient-to-r from-neon-pink to-neon-purple rounded-xl font-semibold text-white"
        >
          Start Dancing
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Today's Steps" value="0" icon="fire" />
        <StatCard label="Streak" value="0 days" icon="bolt" />
        <StatCard label="Total Earned" value="0 DANZ" icon="coin" />
        <StatCard label="Events" value="0" icon="calendar" />
      </div>

      {/* Quick Actions */}
      <div className="bg-bg-secondary rounded-2xl p-4 border border-white/5">
        <h3 className="text-sm font-semibold text-text-muted mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-2">
          <QuickAction icon="check" label="Check In" onClick={() => {}} />
          <QuickAction icon="share" label="Invite" onClick={() => {}} />
          <QuickAction icon="gift" label="Rewards" onClick={() => {}} />
        </div>
      </div>
    </div>
  )
}

function DanceTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center mb-6 animate-pulse">
        <span className="text-5xl">💃</span>
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Dance Mode</h2>
      <p className="text-text-secondary text-center mb-6">Tap to start tracking your dance moves</p>
      <button className="px-8 py-4 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full font-bold text-white text-lg shadow-lg shadow-neon-pink/30">
        Start Session
      </button>
    </div>
  )
}

function EventsTab() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-text-primary mb-4">Upcoming Events</h2>
      <div className="bg-bg-secondary rounded-2xl p-6 border border-white/5 text-center">
        <span className="text-4xl mb-4 block">📅</span>
        <p className="text-text-secondary">No upcoming events</p>
        <p className="text-text-muted text-sm mt-1">Check back soon for dance events near you!</p>
      </div>
    </div>
  )
}

function WalletTab() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 rounded-2xl p-6 border border-white/10 text-center">
        <p className="text-text-muted text-sm mb-1">Your Balance</p>
        <p className="text-4xl font-bold bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">
          0 DANZ
        </p>
        <p className="text-text-muted text-xs mt-1">$0.00 USD</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button className="py-3 bg-neon-pink rounded-xl font-semibold text-white">Deposit</button>
        <button className="py-3 bg-white/10 rounded-xl font-semibold text-text-primary">
          Withdraw
        </button>
      </div>
    </div>
  )
}

function ProfileTab({ user }: { user: any }) {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-bg-secondary rounded-2xl p-6 border border-white/5 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-3xl text-white font-bold">
              {user?.username?.[0]?.toUpperCase() || 'D'}
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-text-primary">
          {user?.display_name || user?.username || 'Dancer'}
        </h2>
        <p className="text-text-muted">@{user?.username || 'dancer'}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  const icons: Record<string, string> = {
    fire: '🔥',
    bolt: '⚡',
    coin: '💰',
    calendar: '📅',
  }
  return (
    <div className="bg-bg-secondary rounded-xl p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        <span>{icons[icon]}</span>
        <span className="text-text-muted text-xs">{label}</span>
      </div>
      <p className="text-text-primary font-bold text-lg">{value}</p>
    </div>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
}: { icon: string; label: string; onClick: () => void }) {
  const icons: Record<string, string> = {
    check: '✓',
    share: '↗',
    gift: '🎁',
  }
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
    >
      <span className="text-lg">{icons[icon]}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </button>
  )
}
