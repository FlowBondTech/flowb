'use client'

import { motion } from 'motion/react'
import { FiCalendar, FiClock, FiTrendingUp } from 'react-icons/fi'

const tokenFeatures = [
  {
    icon: FiTrendingUp,
    title: 'Earn by Moving',
    description: 'Every step, dance move, and yoga pose counts',
  },
  {
    icon: FiCalendar,
    title: 'Event Rewards',
    description: 'Bonus tokens for attending community events',
  },
  {
    icon: FiClock,
    title: 'Fair Distribution',
    description: '30% of event fees go to the token treasury',
  },
]

export default function TokenIntroduction() {
  return (
    <section className="section bg-gradient-to-b from-bg-primary via-bg-secondary/20 to-bg-primary relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Tag */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium uppercase tracking-wider">
                Movement Rewards
              </span>
            </motion.div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
              Introducing <span className="gradient-text gradient-text-animate">$DANZ</span>
            </h2>

            <p className="text-lg md:text-xl text-text-secondary mb-10 leading-relaxed">
              The world's first dance-based reward token. Turn your rhythm into real rewards - no
              crypto knowledge required.
            </p>

            {/* Features */}
            <div className="space-y-6 mb-10">
              {tokenFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-neon-purple" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-text-secondary">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-neon text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-neon-purple/50 transition-all"
              >
                Start Earning
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-text-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all"
              >
                How It Works
              </motion.button>
            </div>
          </motion.div>

          {/* Right: Token Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex items-center justify-center lg:pl-12"
          >
            <div className="relative w-full max-w-md aspect-square">
              {/* Glow effect */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-80 bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 rounded-full blur-3xl animate-pulse" />
              </div>

              {/* Animated rings */}
              {[1, 2].map(ring => (
                <motion.div
                  key={ring}
                  className="absolute inset-0 border-2 border-neon-purple/20 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.1, 0.3],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 5 + ring * 2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: ring * 0.5,
                    ease: 'easeInOut',
                  }}
                />
              ))}

              {/* Main Token */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'linear',
                  }}
                  className="relative"
                >
                  <div className="w-64 h-64 bg-gradient-to-br from-neon-purple via-neon-pink to-neon-purple rounded-full flex items-center justify-center shadow-2xl shadow-neon-purple/50 relative overflow-hidden">
                    {/* Inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />

                    {/* Token text */}
                    <div className="text-6xl font-bold text-text-primary transform -rotate-12">
                      $DANZ
                    </div>

                    {/* Sparkle effects */}
                    {[0, 1, 2, 3].map(i => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-white rounded-full"
                        style={{
                          top: `${20 + i * 20}%`,
                          left: `${15 + i * 20}%`,
                        }}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.5,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Floating particles */}
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 bg-gradient-to-br from-neon-purple to-neon-pink rounded-full"
                  style={{
                    top: `${10 + i * 15}%`,
                    left: `${5 + i * 18}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    x: [0, 10, 0],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.8,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
