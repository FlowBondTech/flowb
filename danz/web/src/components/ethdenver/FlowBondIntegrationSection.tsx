'use client'

import { flowBondFeatures } from '@/src/components/ethdenver/data'
import { motion } from 'motion/react'
import { FiActivity } from 'react-icons/fi'

export default function FlowBondIntegrationSection() {
  return (
    <section
      id="flowbond"
      className="section bg-gradient-to-b from-bg-primary via-bg-secondary/30 to-bg-primary relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          {/* Left: Device Visual */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex items-center justify-center"
          >
            <div className="relative w-72 h-72">
              {/* Glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 rounded-full blur-3xl animate-pulse" />
              </div>

              {/* Animated Rings */}
              {[1, 2, 3].map(ring => (
                <motion.div
                  key={ring}
                  className="absolute inset-0 border border-neon-purple/20 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.05, 0.3],
                  }}
                  transition={{
                    duration: 4 + ring,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: ring * 0.7,
                    ease: 'easeInOut',
                  }}
                />
              ))}

              {/* Central Device */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
              >
                <div className="w-32 h-32 bg-gradient-to-br from-neon-purple via-neon-pink to-neon-purple rounded-3xl flex items-center justify-center shadow-2xl shadow-neon-purple/50 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                  <FiActivity className="w-12 h-12 text-text-primary relative z-10" />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right: Features */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium uppercase tracking-wider mb-8">
              FlowBond Enhancement
            </span>

            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              <span className="gradient-text gradient-text-animate">FlowBond</span> Multipliers
            </h2>

            <p className="text-lg text-text-secondary mb-10 leading-relaxed">
              Wearing a FlowBond device unlocks bonus multipliers and proof-of-movement verification
              for all dance missions.
            </p>

            <div className="space-y-4">
              {flowBondFeatures.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-neon-purple/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-text-primary mb-1">{feature.title}</h3>
                      <p className="text-sm text-text-secondary">{feature.description}</p>
                    </div>
                    {feature.multiplier && (
                      <span className="text-sm font-medium text-neon-purple bg-neon-purple/10 px-3 py-1 rounded-full whitespace-nowrap">
                        {feature.multiplier}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
