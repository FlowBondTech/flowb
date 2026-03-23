'use client'

import { rewardTiers } from '@/src/components/ethdenver/data'
import { motion } from 'motion/react'

export default function LeaderboardRewardsSection() {
  return (
    <section
      id="leaderboard"
      className="section bg-gradient-to-b from-bg-primary via-bg-secondary/30 to-bg-primary relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-full blur-3xl" />
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
            Leaderboard Rewards
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
            Climb the <span className="gradient-text">Leaderboard</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Complete missions, earn XP, and compete for exclusive rewards throughout the week.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {rewardTiers.map((tier, index) => (
            <motion.div
              key={tier.rank}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              whileHover={{ y: -10 }}
              className="relative"
            >
              <div
                className={`bg-bg-card/30 backdrop-blur-sm border rounded-2xl p-8 h-full transition-all ${
                  index === 0
                    ? 'border-yellow-400/30 shadow-lg shadow-yellow-400/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Rank Badge */}
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center shadow-lg`}
                  >
                    <span className="text-lg font-bold text-white">
                      {index === 0 ? '1' : index === 1 ? '2' : '3'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">{tier.rank}</h3>
                    <p className="text-sm text-text-muted">{tier.label}</p>
                  </div>
                </div>

                <ul className="space-y-3">
                  {tier.rewards.map(reward => (
                    <li key={reward} className="flex items-start gap-3">
                      <div
                        className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${tier.gradient} flex-shrink-0 mt-2`}
                      />
                      <span className="text-text-secondary text-sm">{reward}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
