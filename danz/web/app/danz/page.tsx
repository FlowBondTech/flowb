'use client'

import Footer from '@/src/components/Footer'
import Layout from '@/src/components/Layout'
import Navbar from '@/src/components/Navbar'
import { motion } from 'motion/react'
import Link from 'next/link'

export default function DanzPage() {
  return (
    <Layout>
      <Navbar />
      <main className="pt-32 pb-20 min-h-screen relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-bg-primary to-pink-900/20" />

        <div className="container relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Section 1: Hero with $DANZ */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-32"
            >
              <Link
                href="/"
                className="inline-block mb-12 text-text-muted hover:text-text-primary transition-colors"
              >
                ← BACK HOME
              </Link>

              <h1 className="text-7xl md:text-8xl font-display font-bold mb-12">
                <span className="gradient-text gradient-text-animate">$DANZ</span>
              </h1>

              <p className="text-2xl md:text-3xl text-text-secondary mb-4 leading-relaxed">
                Where movement becomes currency,
              </p>
              <p className="text-2xl md:text-3xl text-text-secondary mb-4 leading-relaxed">
                connection becomes value,
              </p>
              <p className="text-2xl md:text-3xl text-text-secondary mb-12 leading-relaxed">
                and every beat counts.
              </p>

              <p className="text-lg md:text-xl text-text-secondary max-w-4xl mx-auto leading-relaxed">
                $DANZ is the official movement token of the FlowBond ecosystem — a decentralized
                token that rewards dancers, movers, and flow-activators for doing what they love:
                showing up, moving their bodies, and generating high-vibe energy with others.
              </p>
            </motion.section>

            {/* Section 2: What is $DANZ? */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-32"
            >
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-12">
                <span className="text-text-muted">{'>'}</span> What is{' '}
                <span className="gradient-text">$DANZ</span>?
              </h2>

              <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12">
                <p className="text-lg md:text-xl text-text-secondary leading-relaxed">
                  $DANZ is a utility and rewards token designed to power a dance-based economy. It
                  lives at the intersection of dance culture, Web3 technology, and biometric flow
                  states. Through the FlowBond wearable and ecosystem, every dance session, group
                  sync, and flow activation generates real, measurable value — and $DANZ is how that
                  value is distributed.
                </p>
              </div>
            </motion.section>

            {/* Section 3: Why $DANZ? */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mb-32"
            >
              <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-16">
                Why <span className="gradient-text">$DANZ</span>?
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:border-neon-purple/50 transition-all"
                >
                  <h3 className="text-2xl font-bold mb-4 text-neon-purple">Move-to-Earn</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Get rewarded for dancing, activating the floor, and participating in live or
                    virtual dance journeys.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:border-neon-purple/50 transition-all"
                >
                  <h3 className="text-2xl font-bold mb-4 text-neon-purple">Access Utility</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Use $DANZ to unlock events, retreats, exclusive workshops, and immersive
                    wellness & movement experiences.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:border-neon-purple/50 transition-all"
                >
                  <h3 className="text-2xl font-bold mb-4 text-neon-purple">Social Flow Matching</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Connect with people you vibe with — literally. FlowBond wearables detect
                    co-regulation and reward group flow with bonus $DANZ.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:border-neon-purple/50 transition-all"
                >
                  <h3 className="text-2xl font-bold mb-4 text-neon-purple">Proof of Movement</h3>
                  <p className="text-text-secondary leading-relaxed">
                    On-chain verification that you're not just watching — you're dancing, leading,
                    and co-creating the rhythm.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:border-neon-purple/50 transition-all"
                >
                  <h3 className="text-2xl font-bold mb-4 text-neon-purple">Collective Rewards</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Teams, dance crews, and communities can pool their movement for amplified
                    rewards.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:border-neon-purple/50 transition-all"
                >
                  <h3 className="text-2xl font-bold mb-4 text-neon-purple">
                    Bridge Between Body & Blockchain
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    $DANZ links the biointelligence of the body with the smart contracts of Web3,
                    offering a new form of embodied economy.
                  </p>
                </motion.div>
              </div>
            </motion.section>

            {/* Section 4: The Vision */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-32"
            >
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-12">
                <span className="text-text-muted">{'>'}</span> The Vision
              </h2>

              <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12 space-y-8">
                <p className="text-lg md:text-xl text-text-secondary leading-relaxed">
                  $DANZ is more than a token — it's a cultural catalyst for regenerative joy and
                  embodied connection. As the FlowBond network grows, $DANZ will become the
                  energetic fuel for a new kind of decentralized movement economy — one where those
                  who move the most, feel the most, and connect the most are the ones who thrive.
                </p>

                <p className="text-xl md:text-2xl text-center font-semibold">
                  In a world where attention is monetized, $DANZ offers a new paradigm:{' '}
                  <span className="text-neon-purple">presence as value</span>.
                </p>
              </div>
            </motion.section>

            {/* CTA Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-center"
            >
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-12">
                Ready to start earning through movement?
              </h2>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary text-lg px-8 py-4"
                  type="button"
                >
                  Join the $DANZ Movement
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-secondary text-lg px-8 py-4"
                  type="button"
                >
                  View Tokenomics
                </motion.button>
              </div>
            </motion.section>
          </div>
        </div>
      </main>
      <Footer />
    </Layout>
  )
}
