'use client'

import Footer from '@/src/components/Footer'
import Layout from '@/src/components/Layout'
import Navbar from '@/src/components/Navbar'
import { useAuth } from '@/src/contexts/AuthContext'
import { stripeService } from '@/src/services/stripe.service'
import type { ClaimTokenVerification } from '@/src/services/stripe.service'
import { motion } from 'motion/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { FiCheck, FiLoader, FiAlertCircle, FiArrowRight } from 'react-icons/fi'

type ClaimState = 'loading' | 'valid' | 'claiming' | 'claimed' | 'error'

function SponsorClaimContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, isLoading, login } = useAuth()

  const claimToken = searchParams.get('claim_token')
  const [state, setState] = useState<ClaimState>('loading')
  const [purchase, setPurchase] = useState<ClaimTokenVerification | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const hasClaimedRef = useRef(false)

  // Verify the claim token on mount
  useEffect(() => {
    if (!claimToken) {
      setState('error')
      setErrorMsg('No claim token provided. Please check your link.')
      return
    }

    async function verify() {
      const result = await stripeService.verifyClaimToken(claimToken!)

      if (result.valid) {
        setPurchase(result)
        setState('valid')
      } else if (result.error === 'Token not found' && retryCount < 3) {
        // Webhook may not have fired yet - retry after delay
        setTimeout(() => setRetryCount(prev => prev + 1), 3000)
      } else {
        setState('error')
        setErrorMsg(
          result.error === 'Token already claimed'
            ? 'This sponsorship has already been claimed.'
            : result.error === 'Token expired'
              ? 'This claim link has expired. Please contact support.'
              : result.error === 'Token not found'
                ? 'Payment is still processing. Please wait a moment and refresh.'
                : 'Unable to verify your purchase. Please contact support.',
        )
      }
    }

    verify()
  }, [claimToken, retryCount])

  // Auto-claim when authenticated + token is valid
  const claimPurchase = useCallback(async () => {
    if (!claimToken || hasClaimedRef.current) return
    hasClaimedRef.current = true

    setState('claiming')
    try {
      const result = await stripeService.claimSponsorPurchase(claimToken)
      if (result.success) {
        setState('claimed')
        setTimeout(() => router.push('/dashboard/sponsor'), 2500)
      } else {
        setState('error')
        setErrorMsg('Failed to claim purchase. Please try again.')
        hasClaimedRef.current = false
      }
    } catch (err: any) {
      setState('error')
      setErrorMsg(err.message || 'Failed to claim purchase.')
      hasClaimedRef.current = false
    }
  }, [claimToken, router])

  useEffect(() => {
    if (state === 'valid' && isAuthenticated && !isLoading) {
      claimPurchase()
    }
  }, [state, isAuthenticated, isLoading, claimPurchase])

  return (
    <Layout>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full"
        >
          <div className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center">
            {state === 'loading' && (
              <>
                <FiLoader className="w-12 h-12 text-neon-purple mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl font-bold mb-2">Verifying Your Purchase</h1>
                <p className="text-text-secondary">
                  {retryCount > 0
                    ? `Waiting for payment confirmation... (attempt ${retryCount + 1})`
                    : 'Please wait while we verify your payment...'}
                </p>
              </>
            )}

            {state === 'valid' && purchase && !isAuthenticated && (
              <>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center mx-auto mb-6">
                  <FiCheck className="w-8 h-8 text-neon-purple" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Payment Confirmed!</h1>
                <p className="text-text-secondary mb-6">
                  Your <span className="text-white font-medium">{purchase.tierName}</span> sponsorship
                  is ready to activate.
                </p>

                <div className="bg-white/5 rounded-2xl p-4 mb-6 text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Tier</span>
                    <span className="font-medium">{purchase.tierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Amount</span>
                    <span className="font-medium">${purchase.amountUsd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">$FLOW Tokens</span>
                    <span className="font-medium gradient-text">
                      {Number(purchase.flowAmount).toLocaleString()}
                    </span>
                  </div>
                </div>

                <motion.button
                  onClick={() => login()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 px-6 bg-gradient-neon text-white rounded-xl font-medium text-lg shadow-lg hover:shadow-neon-purple/50 transition-shadow flex items-center justify-center gap-2"
                >
                  Create Account & Activate Sponsorship
                  <FiArrowRight className="w-5 h-5" />
                </motion.button>
                <p className="text-xs text-text-secondary mt-3">
                  Sign up or log in to claim your sponsor dashboard and $FLOW tokens.
                </p>
              </>
            )}

            {state === 'valid' && isAuthenticated && (
              <>
                <FiLoader className="w-12 h-12 text-neon-purple mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl font-bold mb-2">Activating Sponsorship</h1>
                <p className="text-text-secondary">Linking your purchase to your account...</p>
              </>
            )}

            {state === 'claiming' && (
              <>
                <FiLoader className="w-12 h-12 text-neon-purple mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl font-bold mb-2">Activating Sponsorship</h1>
                <p className="text-text-secondary">Setting up your sponsor profile...</p>
              </>
            )}

            {state === 'claimed' && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-500/30 flex items-center justify-center mx-auto mb-6"
                >
                  <FiCheck className="w-8 h-8 text-green-400" />
                </motion.div>
                <h1 className="text-2xl font-bold mb-2">Sponsorship Activated!</h1>
                <p className="text-text-secondary">
                  Redirecting to your sponsor dashboard...
                </p>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                  <FiAlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Something Went Wrong</h1>
                <p className="text-text-secondary mb-6">{errorMsg}</p>
                <motion.button
                  onClick={() => router.push('/ethdenver')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="py-3 px-6 bg-white/10 text-white rounded-xl font-medium border border-white/10 hover:border-white/20 transition-colors"
                >
                  Back to ETHDenver
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </main>
      <Footer />
    </Layout>
  )
}

export default function SponsorClaimPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <Navbar />
          <main className="min-h-screen flex items-center justify-center">
            <FiLoader className="w-12 h-12 text-neon-purple animate-spin" />
          </main>
          <Footer />
        </Layout>
      }
    >
      <SponsorClaimContent />
    </Suspense>
  )
}
