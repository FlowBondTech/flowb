'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
import { STRIPE_PRICE_IDS, stripeService } from '@/src/services/stripe.service'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { FiCheck, FiCreditCard, FiX } from 'react-icons/fi'

const plans = [
  {
    id: 'monthly',
    name: 'Monthly Flow',
    price: '$9.99',
    period: '/month',
    priceId: STRIPE_PRICE_IDS.MONTHLY,
    features: [
      'Unlimited event matching',
      'Priority access to popular events',
      'Double $DANZ token rewards',
      'Advanced movement analytics',
      'Community chat and messaging',
      'Exclusive facilitator workshops',
    ],
  },
  {
    id: 'yearly',
    name: 'Annual Flow',
    price: '$99',
    period: '/year',
    priceId: STRIPE_PRICE_IDS.YEARLY,
    features: [
      'Unlimited event matching',
      'Priority access to popular events',
      'Double $DANZ token rewards',
      'Advanced movement analytics',
      'Community chat and messaging',
      'Exclusive facilitator workshops',
    ],
    badge: 'Save 17%',
  },
]

function SubscriptionContent() {
  const { data, loading, refetch } = useGetMyProfileQuery()
  const searchParams = useSearchParams()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const user = data?.me

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccessMessage('Subscription activated successfully!')
      refetch()

      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('success')
      window.history.replaceState({}, '', newUrl)
    } else if (searchParams.get('cancelled') === 'true') {
      setError('Subscription process was cancelled')

      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('cancelled')
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams, refetch])

  const handleSubscribe = async (plan: (typeof plans)[0]) => {
    setIsLoading(true)
    setError(null)

    try {
      // Only allow new subscriptions - no upgrades
      const { url } = await stripeService.createCheckoutSession(
        plan.priceId,
        plan.id as 'monthly' | 'yearly',
      )
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err)
      setError('Failed to start checkout. Please try again.')
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { url } = await stripeService.createPortalSession()
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Failed to create portal session:', err)
      setError('Failed to open subscription management. Please try again.')
      setIsLoading(false)
    }
  }

  const isPremium = user?.is_premium === 'active'

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Subscription</h1>
          <p className="text-text-secondary">Manage your DANZ subscription and billing</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 flex items-center gap-2">
            <FiCheck size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 flex items-center gap-2">
            <FiX size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Current Status */}
        {loading ? (
          <div className="bg-bg-secondary rounded-xl p-6 border border-white/10 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-32 mb-4" />
            <div className="h-8 bg-white/10 rounded w-48" />
          </div>
        ) : isPremium ? (
          <div className="bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-xl p-6 border border-neon-purple/30 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FiCreditCard className="text-neon-purple" size={24} />
                  <h2 className="text-xl font-bold text-text-primary">Active Subscription</h2>
                </div>
                <p className="text-text-secondary">
                  You have an active{' '}
                  <span className="font-medium text-text-primary">
                    {user?.subscription_plan === 'yearly' ? 'Annual' : 'Monthly'} Flow
                  </span>{' '}
                  subscription
                </p>
                {user?.subscription_end_date && (
                  <p className="text-sm text-text-muted mt-2">
                    Next billing date: {new Date(user.subscription_end_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="px-6 py-3 bg-neon-purple/20 text-neon-purple border border-neon-purple/30 rounded-lg font-medium hover:bg-neon-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Manage Subscription'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-bg-secondary rounded-xl p-6 border border-white/10 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <FiCreditCard className="text-text-muted" size={24} />
              <h2 className="text-xl font-bold text-text-primary">Free Account</h2>
            </div>
            <p className="text-text-secondary">
              Upgrade to Premium to unlock all features and get the most out of DANZ
            </p>
          </div>
        )}

        {/* Pricing Plans - Only show if user doesn't have premium */}
        {!isPremium && (
          <div className="grid md:grid-cols-2 gap-6">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`relative bg-bg-secondary rounded-xl p-6 border transition-all ${
                  selectedPlan === plan.id
                    ? 'border-neon-purple/50 shadow-lg shadow-neon-purple/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 right-6">
                    <span className="bg-gradient-neon text-white px-3 py-1 rounded-full text-sm font-medium">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-text-primary mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold gradient-text">{plan.price}</span>
                    <span className="text-text-muted">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FiCheck className="w-3 h-3 text-text-primary" />
                      </div>
                      <span className="text-text-secondary text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    selectedPlan === plan.id
                      ? 'bg-gradient-neon text-white shadow-lg hover:shadow-neon-purple/50'
                      : 'bg-white/5 text-text-primary border border-white/10 hover:bg-white/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? 'Processing...' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Benefits Section */}
        <div className="mt-12 bg-bg-secondary rounded-xl p-8 border border-white/10">
          <h3 className="text-2xl font-bold text-text-primary mb-6">Why Go Premium?</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Priority Access',
                description: 'Get first access to popular events before they fill up',
              },
              {
                title: 'Double Rewards',
                description: 'Earn 2x $DANZ tokens for all your dance activities',
              },
              {
                title: 'Advanced Analytics',
                description: 'Track your progress with detailed movement insights',
              },
              {
                title: 'Exclusive Workshops',
                description: 'Join facilitator-led sessions only for premium members',
              },
              {
                title: 'Community Features',
                description: 'Connect with other dancers through premium chat',
              },
              {
                title: 'Cancel Anytime',
                description: 'No commitment - manage or cancel your subscription anytime',
              },
            ].map((benefit, index) => (
              <div key={index}>
                <h4 className="font-semibold text-text-primary mb-2">{benefit.title}</h4>
                <p className="text-sm text-text-secondary">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-text-primary text-2xl">Loading...</div>
          </div>
        </DashboardLayout>
      }
    >
      <SubscriptionContent />
    </Suspense>
  )
}
