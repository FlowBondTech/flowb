'use client'

import { useTrackReferralClickMutation } from '@/src/generated/graphql'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const [trackReferralClick] = useTrackReferralClickMutation()
  const [isTracking, setIsTracking] = useState(true)
  const [tracked, setTracked] = useState(false)

  useEffect(() => {
    if (!username || tracked) return

    // Save referral code to localStorage for later use during registration
    if (typeof window !== 'undefined') {
      localStorage.setItem('referral_code', username)
      console.log('Saved referral code to localStorage:', username)
    }

    const trackClick = async () => {
      try {
        // Collect device fingerprint
        const userAgent = navigator.userAgent
        const deviceInfo = {
          screen_width: window.screen.width,
          screen_height: window.screen.height,
          platform: navigator.platform,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }

        // Track the click
        await trackReferralClick({
          variables: {
            input: {
              referral_code: username,
              ip_address: null, // IP will be detected server-side via headers
              user_agent: userAgent,
              device_info: JSON.stringify(deviceInfo),
            },
          },
        })

        console.log('Referral click tracked for:', username)
        setTracked(true)
      } catch (error) {
        console.error('Failed to track referral click:', error)
        // Mark as tracked even on error to avoid retry loops
        setTracked(true)
      } finally {
        setIsTracking(false)
      }
    }

    trackClick()
  }, [username, trackReferralClick, tracked])

  const handleSignUp = () => {
    router.push(`/register?ref=${username}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="text-center">
          {isTracking ? (
            <>
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Processing your invite...
              </h2>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🎉</span>
                </div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">You're Invited!</h1>
                <p className="text-purple-200 text-lg">
                  <span className="font-semibold text-text-primary">{username}</span> has invited
                  you to join DANZ
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleSignUp}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  SIGN UP NOW
                </button>

                <p className="text-sm text-purple-200">
                  Join the movement and start earning rewards for dancing!
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-6 text-center text-purple-200/60 text-sm">
        <p>
          Powered by{' '}
          <a
            href="https://flowbond.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-pink-300 transition-colors"
          >
            FlowBond.Tech
          </a>
        </p>
      </footer>
    </div>
  )
}
