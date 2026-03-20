'use client'

import { heroStats } from '@/src/components/ethdenver/data'
import { motion } from 'motion/react'

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-bg-primary to-pink-900/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-full blur-3xl" />

      <div className="container relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Tag */}
          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium uppercase tracking-wider mb-8">
            ETHDenver 2026 Activation
          </span>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6">
            <span className="gradient-text gradient-text-animate">Mission Board</span>
          </h1>

          <p className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto mb-4 leading-relaxed">
            Turn ETHDenver into a dance-to-earn playground.
          </p>
          <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-12">
            Gamified missions for attendees. Measurable engagement for sponsors. Rewards
            powered by movement and the upcoming $DANZ token.
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12"
        >
          {heroStats.map((stat, _i) => (
            <div
              key={stat.label}
              className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
            >
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-text-muted uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <motion.a
            href="#sponsors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary text-lg px-8 py-4"
          >
            Become a Sponsor
          </motion.a>
          <motion.a
            href="#missions"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-secondary text-lg px-8 py-4"
          >
            Explore Missions
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
