'use client'

import { communityPartners } from '@/src/components/ethdenver/data'
import { motion } from 'motion/react'

export default function CommunityMissionsSection() {
  return (
    <section id="community" className="section bg-bg-secondary/50 relative overflow-hidden">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium uppercase tracking-wider mb-8">
            Community Missions
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
            Partner <span className="gradient-text">Activations</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Hack houses, side events, and venues create custom missions to drive foot traffic and
            engagement.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {communityPartners.map((partner, index) => (
            <motion.div
              key={partner.type}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              whileHover={{ y: -10 }}
              className="group"
            >
              <div className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-xl p-8 h-full hover:border-neon-purple/30 transition-all">
                <h3 className="text-2xl font-bold mb-4 text-text-primary">{partner.type}</h3>

                <div className="flex flex-wrap gap-2 mb-6">
                  {partner.examples.map(example => (
                    <span
                      key={example}
                      className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-full text-text-muted"
                    >
                      {example}
                    </span>
                  ))}
                </div>

                <p className="text-text-secondary text-sm">{partner.benefit}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 backdrop-blur-sm border border-white/10 rounded-2xl px-8 py-4">
            <span className="text-text-secondary">Want to create missions for your venue?</span>
            <a
              href="#cta"
              className="text-neon-purple font-semibold hover:text-neon-pink transition-colors"
            >
              Partner with us
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
