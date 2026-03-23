'use client'

import { DashboardHome } from '@/components/dashboard/DashboardHome'
import { DanceTracker } from '@/components/dance/DanceTracker'
import { DanceParty } from '@/components/party'
import { EmailBanner } from '@/components/ui/EmailBanner'
import { MiniAppSplash } from '@/components/ui/MiniAppSplash'
import { Navigation } from '@/components/ui/Navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useFarcasterSDK } from '@/hooks/useFarcasterSDK'
import { useEffect, useState } from 'react'

type Tab = 'home' | 'dance' | 'party' | 'wallet' | 'profile'

export default function Home() {
  const { isLoaded, ready } = useFarcasterSDK()
  const { user, isAuthenticated, isLoading, isFarcasterFrame, subscribedEmail, openSignupPage } = useAuth()
  const [showSplash, setShowSplash] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')

  // Handle splash screen timing and SDK ready call
  useEffect(() => {
    if (!isLoaded || isLoading) return

    const timer = setTimeout(async () => {
      // CRITICAL: Call ready() to hide Farcaster splash screen
      await ready()
      setShowSplash(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [isLoaded, isLoading, ready])

  // Render splash screen
  if (showSplash || !isLoaded || isLoading) {
    return <MiniAppSplash />
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-bg-secondary/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Inline SVG logo */}
          <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="url(#hdr-grad)" strokeWidth="3" fill="none" />
            <path d="M24 20 L32 44 L40 20" stroke="url(#hdr-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <defs>
              <linearGradient id="hdr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6ec7" />
                <stop offset="100%" stopColor="#b967ff" />
              </linearGradient>
            </defs>
          </svg>
          <span className="font-display font-bold text-lg bg-gradient-neon bg-clip-text text-transparent">
            DANZ
          </span>
        </div>

        {/* User avatar if authenticated */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-2">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border-2 border-neon-pink"
              />
            )}
            <span className="text-sm text-text-secondary">
              @{user.username || `fid:${user.fid}`}
            </span>
          </div>
        )}

        {/* Signup button for users not in Farcaster frame */}
        {!isFarcasterFrame && (
          <button onClick={openSignupPage} className="btn-secondary text-sm py-2 px-4">
            Sign Up
          </button>
        )}
      </header>

      {/* Email collection banner */}
      <EmailBanner />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'home' && (
          <DashboardHome
            onStartDance={() => setActiveTab('dance')}
            onStartParty={() => setActiveTab('party')}
            onNavigate={(tab) => setActiveTab(tab as Tab)}
          />
        )}
        {activeTab === 'dance' && <DanceTracker />}
        {activeTab === 'party' && <DanceParty />}
        {activeTab === 'wallet' && <WalletContent />}
        {activeTab === 'profile' && <ProfileContent />}
      </main>

      {/* Bottom Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

// Wallet Content Component
function WalletContent() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span className="text-neon-pink">💎</span>
        Wallet
      </h2>

      {/* Main Balance Card */}
      <div className="card glow-pink">
        <div className="text-center py-6">
          <p className="text-sm text-text-muted mb-1">Your Balance</p>
          <p className="text-4xl font-bold bg-gradient-neon bg-clip-text text-transparent mb-2">
            0 DANZ
          </p>
          <p className="text-xs text-text-muted">$0.00 USD</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-primary py-3 text-sm">
          Deposit
        </button>
        <button className="btn-secondary py-3 text-sm">
          Withdraw
        </button>
      </div>

      {/* Transaction History */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recent Activity</h3>
          <button className="text-sm text-neon-pink">View All</button>
        </div>
        <div className="text-center py-8 text-text-muted">
          <span className="text-3xl block mb-2">📜</span>
          <p className="text-sm">No transactions yet</p>
          <p className="text-xs">Start dancing to earn DANZ!</p>
        </div>
      </div>
    </div>
  )
}

// Profile Content Component
function ProfileContent() {
  const { user, isAuthenticated, logout, subscribedEmail, openSignupPage } = useAuth()
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [email, setEmail] = useState('')
  const { subscribeEmail } = useAuth()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      await subscribeEmail(email)
      setShowEmailInput(false)
      setEmail('')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span className="text-neon-pink">👤</span>
        Profile
      </h2>

      {/* User Info Card */}
      <div className="card glow-purple text-center py-6">
        {isAuthenticated && user ? (
          <>
            {/* Avatar with level ring */}
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="level-ring" />
              <div className="level-ring-inner" />
              <div className="absolute inset-[6px] rounded-full overflow-hidden bg-bg-card flex items-center justify-center">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">💃</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-neon-pink to-neon-purple flex items-center justify-center text-sm font-bold">
                1
              </div>
            </div>

            <p className="text-xl font-bold">{user.displayName || 'Dancer'}</p>
            <p className="text-text-muted">
              @{user.username || `fid:${user.fid}`}
            </p>

            {/* Auth source badge */}
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs bg-neon-purple/20 text-neon-purple px-3 py-1 rounded-full">
                via Farcaster
              </span>
              {subscribedEmail && (
                <span className="text-xs bg-neon-pink/20 text-neon-pink px-3 py-1 rounded-full">
                  Email subscribed
                </span>
              )}
            </div>

            {/* Email status */}
            {subscribedEmail && (
              <p className="text-sm text-text-muted mt-2">{subscribedEmail}</p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <span className="text-5xl block">💃</span>
            <p className="text-text-muted">Open in Warpcast to sign in</p>
            <button onClick={openSignupPage} className="btn-primary">
              Full Signup on DANZ.app
            </button>
          </div>
        )}
      </div>

      {/* Actions Card */}
      {isAuthenticated && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-sm text-text-muted">Settings</h3>

          {!subscribedEmail && (
            showEmailInput ? (
              <form onSubmit={handleEmailSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-purple"
                  required
                />
                <button type="submit" className="btn-primary py-2 px-4 text-sm">
                  Save
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowEmailInput(true)}
                className="w-full py-3 px-4 bg-neon-purple/20 hover:bg-neon-purple/30 rounded-xl text-left flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span>📧</span>
                  <span className="text-sm">Subscribe for updates</span>
                </div>
                <span className="text-neon-purple">+</span>
              </button>
            )
          )}

          <button
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-left flex items-center gap-3 text-text-secondary text-sm transition-colors"
          >
            <span>🔔</span>
            <span>Notifications</span>
          </button>

          <button
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-left flex items-center gap-3 text-text-secondary text-sm transition-colors"
          >
            <span>🎨</span>
            <span>Appearance</span>
          </button>

          <button
            onClick={logout}
            className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-left flex items-center gap-3 text-red-400 text-sm transition-colors"
          >
            <span>🚪</span>
            <span>Clear Data</span>
          </button>
        </div>
      )}
    </div>
  )
}
