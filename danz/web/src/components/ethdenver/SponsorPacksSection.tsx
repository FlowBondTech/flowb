'use client'

import { sponsorTiers } from '@/src/components/ethdenver/data'
import { stripeService } from '@/src/services/stripe.service'
import { motion } from 'motion/react'
import { useState } from 'react'
import { FiCheck } from 'react-icons/fi'

export default function SponsorPacksSection() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const handleSponsorClick = async (tierId: string) => {
    try {
      setLoadingTier(tierId)
      const { url } = await stripeService.createGuestSponsorCheckoutSession(tierId)
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Failed to create sponsor checkout:', error)
      setLoadingTier(null)
    }
  }

  return (
    <section
      id="sponsors"
      className="section bg-gradient-to-b from-bg-primary via-bg-secondary/30 to-bg-primary relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-neon-purple/5 to-neon-pink/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium uppercase tracking-wider mb-8">
            Sponsor Packages
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
            Activate Your <span className="gradient-text">Brand</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Custom mission packs that drive real engagement, not just logo placement.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {sponsorTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-gradient-neon text-white px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <div
                className={`bg-bg-card/30 backdrop-blur-sm border rounded-3xl p-6 h-full flex flex-col transition-all duration-300 ${
                  tier.highlighted
                    ? 'border-neon-purple/50 shadow-xl shadow-neon-purple/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold gradient-text">{tier.price}</span>
                </div>
                <p className="text-sm text-neon-purple font-medium mb-6">{tier.missions}</p>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map(feature => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FiCheck className="w-3 h-3 text-text-primary" />
                      </div>
                      <span className="text-sm text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                <motion.button
                  onClick={() => handleSponsorClick(tier.id)}
                  disabled={loadingTier !== null}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-3 px-6 rounded-xl font-medium text-center transition-all block disabled:opacity-60 disabled:cursor-not-allowed ${
                    tier.highlighted
                      ? 'bg-gradient-neon text-white shadow-lg hover:shadow-neon-purple/50'
                      : 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  {loadingTier === tier.id ? 'Redirecting...' : tier.cta}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
