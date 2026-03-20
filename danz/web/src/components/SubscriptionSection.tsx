'use client'

import { useAuth } from '@/src/contexts/AuthContext'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
import { STRIPE_PRICE_IDS, stripeService } from '@/src/services/stripe.service'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FiCheck, FiCreditCard } from 'react-icons/fi'

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
    highlighted: false,
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
    highlighted: true,
    badge: 'Most Popular',
  },
]

export default function SubscriptionSection() {
  const { isAuthenticated, login } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: profileData } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })

  const user = profileData?.me
  const isPremium = user?.is_premium === 'active'
  const currentPlan = user?.subscription_plan

  const handleSelectPlan = async (plan: (typeof plans)[0]) => {
    if (!isAuthenticated) {
      login()
      return
    }

    // Don't allow selecting if user already has a subscription
    if (isPremium) {
      return
    }

    setLoading(plan.id)
    setError(null)

    try {
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
      setLoading(null)
    }
  }
  return (
    <section className="section bg-gradient-to-b from-bg-primary via-bg-secondary/30 to-bg-primary relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-neon-purple/5 to-neon-pink/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Tag */}
              <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium uppercase tracking-wider mb-8">
                Premium Access
              </span>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                Find Your Flow
              </h2>

              <p className="text-xl text-text-secondary max-w-3xl mx-auto">
                Connect with your vibe through our premium matching system
              </p>

              {/* Current Plan Status */}
              {isPremium && (
                <div className="mt-8">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-neon-purple/30 rounded-full mb-4">
                    <FiCreditCard className="text-neon-purple" size={20} />
                    <span className="text-text-primary font-medium">
                      You're on the {currentPlan === 'yearly' ? 'Annual' : 'Monthly'} Flow plan
                    </span>
                  </div>
                  <p className="text-text-secondary">
                    Visit your dashboard to manage your subscription
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Pricing Cards - Only show if user doesn't have premium */}
          {!isPremium && (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`relative ${plan.highlighted ? '' : ''}`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 right-6 z-10">
                      <span className="bg-gradient-neon text-white px-4 py-1.5 rounded-full text-sm font-medium">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div
                    className={`bg-bg-card/30 backdrop-blur-sm border rounded-3xl p-8 h-full relative overflow-hidden transition-all duration-300 ${
                      plan.highlighted
                        ? 'border-neon-purple/50 shadow-xl shadow-neon-purple/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold text-center mb-8">{plan.name}</h3>

                    {/* Features List */}
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FiCheck className="w-3 h-3 text-text-primary" />
                          </div>
                          <span className="text-text-primary">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Price Section */}
                    <div className="text-center mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold gradient-text">{plan.price}</span>
                        <span className="text-text-muted">{plan.period}</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={loading === plan.id}
                      className={`w-full py-3 px-6 rounded-xl font-medium transition-all ${
                        plan.highlighted
                          ? 'bg-gradient-neon text-white shadow-lg hover:shadow-neon-purple/50'
                          : 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 text-white border border-white/10 hover:border-white/20'
                      } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {loading === plan.id
                        ? 'Processing...'
                        : isAuthenticated
                          ? 'Select Plan'
                          : 'Join to Select'}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-center mb-8">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {/* Bottom Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <p className="text-text-secondary text-lg">
              Start with a free account to explore basic features, then upgrade when you're ready to
              unlock the full FlowBond experience.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
