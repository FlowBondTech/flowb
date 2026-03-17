'use client'

import { useAuth } from '@/src/contexts/AuthContext'
import { supabase } from '@/src/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { FiArrowLeft, FiLoader, FiLock, FiMail } from 'react-icons/fi'

type AuthTab = 'magic-link' | 'wallet' | 'password'
type MagicLinkStep = 'email' | 'code'

// Minimal ETH icon as inline SVG to avoid extra dependency
function EthIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 1.5l-7 10.167L12 15.5l7-3.833L12 1.5zM5 13.5L12 22.5l7-9-7 3.833L5 13.5z" />
    </svg>
  )
}

function LoginContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [tab, setTab] = useState<AuthTab>('magic-link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [magicLinkStep, setMagicLinkStep] = useState<MagicLinkStep>('email')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasWallet, setHasWallet] = useState(false)

  // Detect if browser has an Ethereum wallet
  useEffect(() => {
    setHasWallet(typeof window !== 'undefined' && !!(window as any).ethereum)
  }, [])

  if (!isLoading && isAuthenticated) {
    router.push(redirectTo)
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-primary text-xl">Redirecting...</div>
      </div>
    )
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(redirectTo)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
      })
      if (error) throw error
      setMagicLinkStep('code')
      setMessage('Check your email for a 6-digit code or click the magic link!')
    } catch (err: any) {
      setError(err.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const trimmedEmail = email.trim().toLowerCase()
    try {
      // Try type 'email' first (standard OTP)
      const { error: emailErr } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: otpCode,
        type: 'email',
      })
      if (emailErr) {
        // Fallback: try 'signup' type for first-time users
        const { error: signupErr } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: otpCode,
          type: 'signup',
        })
        if (signupErr) throw emailErr // Throw original error if both fail
      }
      router.push(redirectTo)
    } catch (err: any) {
      const msg = err.message || 'Invalid code'
      if (msg.includes('expired') || msg.includes('invalid')) {
        setError('Code expired or invalid. Try resending a new code.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleWalletLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const { error } = await (supabase.auth as any).signInWithWeb3({
        chain: 'ethereum',
        statement: 'Sign in to DANZ NOW',
      })
      if (error) throw error
      router.push(redirectTo)
    } catch (err: any) {
      const msg = err.message || 'Wallet sign-in failed'
      if (msg.includes('rejected') || msg.includes('denied')) {
        setError('Signature request was rejected')
      } else if (msg.includes('No provider') || msg.includes('ethereum')) {
        setError('No wallet detected. Install MetaMask or another Web3 wallet.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const resetMagicLink = () => {
    setMagicLinkStep('email')
    setOtpCode('')
    setError('')
    setMessage('')
  }

  const tabs: { id: AuthTab; label: string }[] = [
    { id: 'magic-link', label: 'Magic Link' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'password', label: 'Password' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-primary text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-neon-purple/20 rounded-full flex items-center justify-center">
            <FiLock className="w-8 h-8 text-neon-purple" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Sign in to DANZ</h1>
        </div>

        {/* Tab bar */}
        <div className="flex bg-bg-secondary rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id)
                setError('')
                setMessage('')
                resetMagicLink()
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-neon-purple text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Error / message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm flex items-center gap-2">
            <FiMail className="flex-shrink-0" />
            {message}
          </div>
        )}

        {/* Magic Link flow */}
        {tab === 'magic-link' && magicLinkStep === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-text-primary text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-black/50 border border-neon-purple/30 rounded-xl text-text-primary focus:border-neon-purple focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-medium rounded-xl hover:opacity-90 transition-opacity min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <FiLoader className="animate-spin" /> : <FiMail />}
              Send Code
            </button>
          </form>
        )}

        {/* OTP code verification */}
        {tab === 'magic-link' && magicLinkStep === 'code' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-text-primary text-sm">Enter 6-digit code</label>
                <button
                  type="button"
                  onClick={resetMagicLink}
                  className="text-text-secondary text-xs hover:text-neon-purple flex items-center gap-1"
                >
                  <FiArrowLeft size={12} />
                  Change email
                </button>
              </div>
              <p className="text-text-secondary text-xs mb-3">
                Sent to <span className="text-neon-purple">{email}</span>
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                className="w-full px-4 py-3 bg-black/50 border border-neon-purple/30 rounded-xl text-text-primary text-center text-2xl tracking-[0.5em] font-mono focus:border-neon-purple focus:outline-none"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3 px-6 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-medium rounded-xl hover:opacity-90 transition-opacity min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <FiLoader className="animate-spin" /> : null}
              Verify & Sign In
            </button>
            <button
              type="button"
              onClick={() => handleSendOtp()}
              disabled={loading}
              className="w-full py-2 text-text-secondary text-sm hover:text-neon-purple transition-colors disabled:opacity-50"
            >
              Resend code
            </button>
          </form>
        )}

        {/* Web3 Wallet sign-in */}
        {tab === 'wallet' && (
          <div className="space-y-4">
            <div className="text-center text-text-secondary text-sm">
              Connect your Ethereum wallet to sign in
            </div>
            <button
              type="button"
              onClick={handleWalletLogin}
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-medium rounded-xl hover:opacity-90 transition-opacity min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <FiLoader className="animate-spin" />
              ) : (
                <EthIcon className="w-5 h-5" />
              )}
              {loading ? 'Waiting for wallet...' : 'Sign in with Wallet'}
            </button>
            {!hasWallet && (
              <p className="text-text-muted text-xs text-center">
                No wallet detected.{' '}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon-purple hover:underline"
                >
                  Install MetaMask
                </a>
              </p>
            )}
          </div>
        )}

        {/* Email / Password form */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-text-primary text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-black/50 border border-neon-purple/30 rounded-xl text-text-primary focus:border-neon-purple focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-text-primary text-sm mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-black/50 border border-neon-purple/30 rounded-xl text-text-primary focus:border-neon-purple focus:outline-none"
                placeholder="Your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-medium rounded-xl hover:opacity-90 transition-opacity min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <FiLoader className="animate-spin" /> : null}
              Sign In
            </button>
          </form>
        )}

        <p className="text-sm text-text-secondary text-center">
          New to DANZ?{' '}
          <a href="/register" className="text-neon-purple hover:underline">
            Create an account
          </a>
        </p>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 py-6 text-center text-text-muted text-sm safe-area-bottom">
        <p>
          Powered by{' '}
          <a
            href="https://flowbond.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon-purple hover:text-neon-pink transition-colors"
          >
            FlowBond.Tech
          </a>
        </p>
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary flex items-center justify-center">
          <div className="text-text-primary text-xl">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
