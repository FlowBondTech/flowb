'use client'

import { useAuth } from '@/src/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

// Supabase config (using service role for verification completion)
const SUPABASE_URL = 'https://eoajujwpdkfuicnoxetk.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg'

interface VerificationResult {
  success: boolean
  error?: string
  username?: string
  display_name?: string
  platform?: string
}

async function completeVerification(code: string, userId: string): Promise<VerificationResult> {
  try {
    // First, find the pending verification
    const findUrl = `${SUPABASE_URL}/rest/v1/pending_verifications?code=eq.${code}&verified_at=is.null&select=*`
    const findRes = await fetch(findUrl, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })

    if (!findRes.ok) {
      return { success: false, error: 'Failed to check verification code' }
    }

    const verifications = await findRes.json()
    if (!verifications || verifications.length === 0) {
      return { success: false, error: 'Invalid or expired verification code' }
    }

    const verification = verifications[0]

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' }
    }

    // Get user info
    const userUrl = `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=username,display_name`
    const userRes = await fetch(userUrl, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })

    let username = 'Dancer'
    let displayName = 'Dancer'

    if (userRes.ok) {
      const users = await userRes.json()
      if (users && users.length > 0) {
        username = users[0].username || 'Dancer'
        displayName = users[0].display_name || username
      }
    }

    // Complete the verification
    const updateUrl = `${SUPABASE_URL}/rest/v1/pending_verifications?id=eq.${verification.id}`
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        verified_at: new Date().toISOString(),
        danz_user_id: userId,
      }),
    })

    if (!updateRes.ok) {
      return { success: false, error: 'Failed to complete verification' }
    }

    // Update user's platform ID (telegram_id or farcaster_fid)
    if (verification.platform === 'telegram') {
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: verification.platform_user_id,
        }),
      })
    } else if (verification.platform === 'farcaster') {
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farcaster_fid: verification.platform_user_id,
        }),
      })
    }

    // Award signup points (50 XP)
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/award_xp`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        amount: 50,
        reason: 'Chat platform verification bonus',
      }),
    }).catch(() => {
      // Silently fail if RPC doesn't exist - XP will be awarded by the bot
    })

    return {
      success: true,
      username,
      display_name: displayName,
      platform: verification.platform,
    }
  } catch (error) {
    console.error('Verification error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Particle animation around the DANZ logo
function ParticleLogo({ animating }: { animating: boolean }) {
  return (
    <div className="relative w-24 h-24 mx-auto mb-4">
      {/* Particle ring */}
      {animating && (
        <>
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={
                {
                  background: `hsl(${270 + i * 15}, 80%, ${60 + (i % 3) * 10}%)`,
                  top: '50%',
                  left: '50%',
                  animation: `particle-orbit ${2 + (i % 3) * 0.5}s linear infinite`,
                  animationDelay: `${i * -0.25}s`,
                  transformOrigin: '0 0',
                  // @ts-ignore
                  '--orbit-radius': `${36 + (i % 3) * 8}px`,
                  '--start-angle': `${i * 30}deg`,
                } as React.CSSProperties
              }
            />
          ))}
          {/* Glow pulse */}
          <div
            className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"
            style={{ animationDuration: '2s' }}
          />
          <div className="absolute -inset-2 rounded-full bg-purple-500/10 animate-pulse" />
        </>
      )}
      {/* Logo */}
      <img
        src="/danz-icon-white.png"
        alt="DANZ"
        className={`w-24 h-24 relative z-10 transition-transform duration-500 ${animating ? 'scale-110' : ''}`}
      />
      <style jsx>{`
        @keyframes particle-orbit {
          from {
            transform: rotate(var(--start-angle)) translateX(var(--orbit-radius)) rotate(calc(-1 * var(--start-angle)));
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
          to {
            transform: rotate(calc(var(--start-angle) + 360deg)) translateX(var(--orbit-radius)) rotate(calc(-1 * (var(--start-angle) + 360deg)));
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

// Platform display names and icons
const PLATFORM_INFO: Record<string, { name: string; icon: string; chatLabel: string }> = {
  telegram: { name: 'Telegram', icon: '✈️', chatLabel: 'your Telegram chat' },
  discord: { name: 'Discord', icon: '💬', chatLabel: 'your Discord server' },
  farcaster: { name: 'Farcaster', icon: '🟣', chatLabel: 'Farcaster' },
  openclaw: { name: 'OpenClaw', icon: '🦀', chatLabel: 'your OpenClaw chat' },
}

function LinkPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { login, isAuthenticated, isLoading, user } = useAuth()

  const [status, setStatus] = useState<
    'loading' | 'needs_auth' | 'verifying' | 'success' | 'error'
  >('loading')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [hasStartedVerification, setHasStartedVerification] = useState(false)
  const [sourceInfo, setSourceInfo] = useState<{ platform: string; username?: string } | null>(null)

  const code = searchParams.get('code')

  const platformDisplay = sourceInfo?.platform ? PLATFORM_INFO[sourceInfo.platform] : null
  const chatLabel = platformDisplay?.chatLabel || 'your chat'

  // Fetch source platform info on load (before auth)
  useEffect(() => {
    if (!code) return
    const fetchSource = async () => {
      try {
        const url = `${SUPABASE_URL}/rest/v1/pending_verifications?code=eq.${code}&select=platform,platform_username`
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.[0]) {
            setSourceInfo({ platform: data[0].platform, username: data[0].platform_username })
          }
        }
      } catch {}
    }
    fetchSource()
  }, [code])

  const doVerification = useCallback(async () => {
    if (!code || !user?.id) return
    setStatus('verifying')
    setHasStartedVerification(true)

    // Minimum display time so the animation is visible
    const minDelay = new Promise(resolve => setTimeout(resolve, 2500))
    const verifyPromise = completeVerification(code, user.id)

    const [verifyResult] = await Promise.all([verifyPromise, minDelay])
    setResult(verifyResult)
    setStatus(verifyResult.success ? 'success' : 'error')
  }, [code, user?.id])

  useEffect(() => {
    if (!code) {
      setStatus('error')
      setResult({ success: false, error: 'No verification code provided' })
      return
    }

    if (isLoading) {
      return // Wait for auth to initialize
    }

    if (!isAuthenticated) {
      setStatus('needs_auth')
      return
    }

    // User is authenticated, complete verification
    if (!hasStartedVerification) {
      doVerification()
    }
  }, [code, isLoading, isAuthenticated, user, hasStartedVerification, doVerification])

  const handleLogin = async () => {
    try {
      await login()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 text-center relative">
        {/* Logo with particles */}
        <div className="mb-6">
          <ParticleLogo animating={status === 'verifying'} />
          <h1 className="text-2xl font-bold text-white">DANZ.Now</h1>
          <p className="text-purple-300 mt-2">Account Verification</p>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="py-8">
            <div className="animate-spin w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        )}

        {/* Needs Auth State */}
        {status === 'needs_auth' && (
          <div className="py-4">
            {platformDisplay && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300 mb-4">
                <span>{platformDisplay.icon}</span>
                <span>from {platformDisplay.name}</span>
                {sourceInfo?.username && (
                  <span className="text-purple-400">@{sourceInfo.username}</span>
                )}
              </div>
            )}
            <h2 className="text-xl font-semibold text-white mb-4">Link Your Account</h2>
            <p className="text-gray-400 mb-6">
              Sign in or create a DANZ.Now account to link with {chatLabel}.
            </p>
            <button
              onClick={handleLogin}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all transform hover:scale-105"
            >
              Sign In / Sign Up
            </button>
            <p className="text-gray-500 text-sm mt-4">
              Verification code: <code className="text-purple-400">{code}</code>
            </p>
          </div>
        )}

        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="py-6">
            <p className="text-purple-300 font-medium text-lg mb-2">
              {platformDisplay
                ? `Linking ${platformDisplay.name} to DANZ.Now...`
                : 'Linking your accounts...'}
            </p>
            <p className="text-gray-500 text-sm">This will only take a moment</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && result && (
          <div className="py-4">
            <div className="text-5xl mb-4">&#127881;</div>
            <h2 className="text-xl font-semibold text-white mb-3">
              Welcome, <span className="text-purple-400">@{result.username}</span>!
            </h2>

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-5">
              <p className="text-purple-300 font-semibold text-lg">+50 XP</p>
              <p className="text-gray-400 text-sm">Verification bonus — you're linked!</p>
            </div>

            <p className="text-gray-500 text-sm mb-5">
              Head back to {chatLabel} and say <span className="text-purple-400">"status"</span> to
              confirm.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => window.close()}
                className="w-full py-2.5 px-6 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Close this page
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && result && (
          <div className="py-4">
            <div className="text-5xl mb-4">&#128533;</div>
            <h2 className="text-xl font-semibold text-white mb-3">Verification Failed</h2>
            <p className="text-red-400 mb-5">{result.error}</p>

            <p className="text-gray-400 text-sm mb-5">
              {result.error?.includes('expired') || result.error?.includes('Invalid') ? (
                <>
                  Say <span className="text-purple-400 font-medium">"signup"</span> in {chatLabel}{' '}
                  for a fresh link.
                </>
              ) : result.error?.includes('No verification code') ? (
                <>Open the link from {chatLabel} — it includes the code.</>
              ) : (
                <>
                  Try refreshing, or say{' '}
                  <span className="text-purple-400 font-medium">"signup"</span> in {chatLabel} for a
                  new link.
                </>
              )}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all"
              >
                Go to Home
              </button>
              <button
                onClick={() => window.close()}
                className="w-full py-2.5 px-6 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Close this page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <LinkPageContent />
    </Suspense>
  )
}
