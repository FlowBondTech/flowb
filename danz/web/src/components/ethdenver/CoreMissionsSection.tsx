'use client'

import { missionCategories } from '@/src/components/ethdenver/data'
import { motion } from 'motion/react'
import { useState } from 'react'

export default function CoreMissionsSection() {
  const [activeCategory, setActiveCategory] = useState(missionCategories[0].id)
  const active = missionCategories.find(c => c.id === activeCategory) ?? missionCategories[0]

  return (
    <section id="missions" className="section bg-bg-secondary/50 relative overflow-hidden">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium uppercase tracking-wider mb-8">
            Mission Categories
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
            Missions to <span className="gradient-text">Complete</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Three mission categories designed to get people moving, exploring, and engaging.
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex justify-center gap-3 mb-12">
          {missionCategories.map(cat => (
            <motion.button
              key={cat.id}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-gradient-neon text-white shadow-lg'
                  : 'bg-bg-card/50 text-text-secondary border border-white/10 hover:border-white/20'
              }`}
            >
              {cat.title}
            </motion.button>
          ))}
        </div>

        {/* Active Category */}
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">{active.title}</h3>
            <p className="text-text-muted">{active.subtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {active.missions.map((mission, i) => (
              <motion.div
                key={mission.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -5 }}
                className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-neon-purple/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{mission.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-text-primary truncate">{mission.name}</h4>
                      <span className="text-xs font-medium text-neon-purple whitespace-nowrap">
                        +{mission.xp} XP
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">{mission.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
