'use client'

import { valueCards } from '@/src/components/ethdenver/data'
import { motion } from 'motion/react'

export default function ValuePropositionSection() {
  return (
    <section id="value" className="section bg-bg-secondary/50 relative overflow-hidden">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium uppercase tracking-wider mb-8">
            Why DANZ
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
            Value for <span className="gradient-text">Everyone</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Whether you're a sponsor, organizer, or attendee, the Mission Board adds value.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {valueCards.map((card, index) => (
            <motion.div
              key={card.audience}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              whileHover={{ y: -10 }}
              className="group cursor-pointer"
            >
              <div className="bg-bg-card/30 backdrop-blur-sm border border-white/5 rounded-xl p-8 h-full relative overflow-hidden hover:border-neon-purple/30 transition-all">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                />

                <div className="relative z-10">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl mb-6 shadow-lg`}
                  >
                    <span className="text-lg font-bold text-white">{card.audience.charAt(0)}</span>
                  </div>

                  <h3 className="text-xl font-bold mb-2 text-text-primary">{card.audience}</h3>
                  <p className="text-neon-purple text-sm font-medium mb-6">{card.headline}</p>

                  <ul className="space-y-3">
                    {card.points.map(point => (
                      <li key={point} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-purple flex-shrink-0 mt-2" />
                        <span className="text-sm text-text-secondary">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
