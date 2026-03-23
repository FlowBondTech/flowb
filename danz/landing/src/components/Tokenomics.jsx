import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

function Tokenomics() {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0)
  }, [])

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  }

  const fadeInScale = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const tableRowVariant = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 100
      }
    }
  }

  return (
    <div className="tokenomics-page">
      {/* Tokenomics Hero */}
      <section className="tokenomics-hero">
        <div className="hero-bg-gradient"></div>
        <div className="container">
          <motion.div 
            className="section-header"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div 
              className="tokenomics-title-wrapper"
              variants={fadeInScale}
              transition={{ duration: 0.8, type: "spring" }}
            >
              <h1 className="tokenomics-title gradient-text">
                $DANZ Tokenomics
              </h1>
            </motion.div>
            <motion.p 
              className="tokenomics-subtitle"
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              The Token That Moves With You — Online & On the Dancefloor
            </motion.p>
            <motion.p 
              className="tokenomics-description"
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              $DANZ is the official token of the FlowBond ecosystem — a Solana-based meme coin that rewards real-world dance, 
              viral memes, and human connection. It bridges TikTok culture and crypto virality with in-person dance events, 
              conscious festivals, and underground parties.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Total Supply */}
      <section className="section supply-section">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="section-title"
              variants={fadeInUp}
            >
              🔢 Total Supply
            </motion.h2>
            <motion.div 
              className="supply-box"
              variants={fadeInScale}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="supply-number gradient-text"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  type: "spring",
                  damping: 10,
                  stiffness: 100,
                  delay: 0.2
                }}
              >
                1,000,000,000 $DANZ
              </motion.div>
              <motion.div 
                className="supply-label"
                variants={fadeInUp}
              >
                (1 Billion Tokens)
              </motion.div>
              <motion.p 
                className="supply-tagline"
                variants={fadeInUp}
              >
                Big enough to go viral. Finite enough to grow value.
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Allocation Breakdown */}
      <section className="section allocation-section">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="section-title"
              variants={fadeInUp}
            >
              📊 Allocation Breakdown
            </motion.h2>
            <motion.div 
              className="allocation-table"
              variants={staggerContainer}
            >
              <motion.div 
                className="allocation-row header"
                variants={tableRowVariant}
              >
                <div className="allocation-col">Category</div>
                <div className="allocation-col">% of Supply</div>
                <div className="allocation-col">Tokens</div>
                <div className="allocation-col">Status</div>
                <div className="allocation-col">Purpose</div>
              </motion.div>
              {[
                { icon: '🛒', name: 'Public Market Liquidity', percent: '30%', tokens: '300,000,000', status: '✅ Unlocked at launch', purpose: 'Trade on DEX (Raydium/Jupiter)' },
                { icon: '🪂', name: 'Airdrops & Rewards', percent: '30%', tokens: '300,000,000', status: '✅ Phased unlock', purpose: 'Dance challenges, meme contests, referrals' },
                { icon: '👨‍💻', name: 'Team & Founders', percent: '10%', tokens: '100,000,000', status: '🔒 3mo cliff + 12mo vesting', purpose: 'Core contributors, builders' },
                { icon: '🎤', name: 'Creators & Ambassadors', percent: '5%', tokens: '50,000,000', status: '🔒 Vested', purpose: 'DJs, influencers, community leads' },
                { icon: '📈', name: 'Ecosystem Growth', percent: '5%', tokens: '50,000,000', status: '🔒 6mo linear vesting', purpose: 'Strategic partners, collabs' },
                { icon: '🏛️', name: 'DAO Treasury Reserve', percent: '5%', tokens: '50,000,000', status: '🔒 12mo lockup', purpose: 'Governance, staking, safety fund' },
                { icon: '💧', name: 'Future LP & CEX Listings', percent: '15%', tokens: '150,000,000', status: '🔒 Locked for 6–12mo', purpose: 'Future liquidity and listings' }
              ].map((item, index) => (
                <motion.div 
                  key={index} 
                  className="allocation-row"
                  variants={tableRowVariant}
                  whileHover={{ 
                    backgroundColor: "rgba(255, 110, 199, 0.05)",
                    x: 10,
                    transition: { duration: 0.2 }
                  }}
                >
                  <div className="allocation-col category" data-label="">
                    <motion.span 
                      className="category-icon"
                      whileHover={{ scale: 1.2, rotate: 10 }}
                    >
                      {item.icon}
                    </motion.span>
                    <span>{item.name}</span>
                  </div>
                  <div className="allocation-col percent" data-label="Supply:">{item.percent}</div>
                  <div className="allocation-col tokens" data-label="Tokens:">{item.tokens}</div>
                  <div className="allocation-col status" data-label="Status:">{item.status}</div>
                  <div className="allocation-col purpose" data-label="Purpose:">{item.purpose}</div>
                </motion.div>
              ))}
            </motion.div>
            <motion.div 
              className="allocation-notes"
              variants={fadeInUp}
              transition={{ delay: 0.5 }}
            >
              <motion.div 
                className="note"
                whileHover={{ scale: 1.05 }}
              >
                ✅ No VC allocation
              </motion.div>
              <motion.div 
                className="note"
                whileHover={{ scale: 1.05 }}
              >
                ✅ No private sales
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Vesting Schedule */}
      <section className="section vesting-section">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="section-title"
              variants={fadeInUp}
            >
              🔐 Vesting Schedule
            </motion.h2>
            <motion.div 
              className="vesting-grid"
              variants={staggerContainer}
            >
              {[
                { title: 'Team & Founders', desc: '3-month cliff, then 12-month linear vesting' },
                { title: 'Creators & Ambassadors', desc: 'Same structure' },
                { title: 'Growth Partners', desc: '6-month linear unlock' },
                { title: 'DAO Treasury', desc: '12-month lock, DAO-controlled multisig' }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  className="vesting-card"
                  variants={fadeInScale}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(255, 110, 199, 0.2)"
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Real-World Utility */}
      <section className="section utility-section">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="section-title"
              variants={fadeInUp}
            >
              🎟️ Real-World Utility
            </motion.h2>
            <motion.div 
              className="utility-grid"
              variants={staggerContainer}
            >
              {[
                { title: 'Dance-to-Earn', desc: 'Join in-person events and challenges' },
                { title: 'Meme-to-Earn', desc: 'Submit viral content, memes, remix battles' },
                { title: 'Buy Event Tickets', desc: 'Use $DANZ to access real-life dances and festivals' },
                { title: 'Exclusive Drops', desc: 'NFTs, merch, and VIP passes purchasable with $DANZ' }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  className="utility-card"
                  variants={fadeInScale}
                  whileHover={{ 
                    scale: 1.05,
                    rotate: 2,
                    boxShadow: "0 20px 40px rgba(255, 110, 199, 0.2)"
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
            <motion.div 
              className="utility-features"
              variants={fadeInUp}
              transition={{ delay: 0.4 }}
            >
              {[
                { icon: '🗳️', title: 'Governance:', desc: 'Vote on collabs, event themes, and feature releases' },
                { icon: '🔥', title: 'Burn-to-Flex:', desc: 'Burn $DANZ for limited edition mints and elite access' },
                { icon: '💫', title: 'OG Holder Perks:', desc: 'Stake or hold $DANZ to unlock status and rewards' }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  className="feature-item"
                  variants={fadeInUp}
                  whileHover={{ x: 10 }}
                >
                  <motion.span 
                    className="feature-icon"
                    whileHover={{ scale: 1.3, rotate: 15 }}
                  >
                    {item.icon}
                  </motion.span>
                  <div>
                    <strong>{item.title}</strong> {item.desc}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Launch Plan */}
      <section className="section launch-section">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="section-title"
              variants={fadeInUp}
            >
              🚀 Launch Plan
            </motion.h2>
            <motion.div 
              className="launch-steps"
              variants={staggerContainer}
            >
              {[
                { icon: '🪂', desc: 'Viral airdrops for dance videos, memes, and referrals' },
                { icon: '🚀', desc: 'DEX launch on Solana via Raydium or Jupiter aggregator' },
                { icon: '🌍', desc: 'Real-life activations in cities like Bali, NYC, Berlin, Tulum' },
                { icon: '🔒', desc: 'Fully locked liquidity + transparent public vesting' },
                { icon: '🎉', desc: 'Partner DJs and crews powering events around the world' }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  className="launch-step"
                  variants={tableRowVariant}
                  whileHover={{ 
                    x: 20,
                    backgroundColor: "rgba(255, 110, 199, 0.05)"
                  }}
                >
                  <motion.span 
                    className="step-icon"
                    animate={{ 
                      y: [0, -5, 0],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.2
                    }}
                  >
                    {item.icon}
                  </motion.span>
                  <p>{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TL;DR */}
      <section className="section tldr-section">
        <div className="container">
          <div className="animate">
            <h2 className="section-title">TL;DR</h2>
            <div className="tldr-grid">
              <div className="tldr-item">
                <span>🔗</span>
                <p>Solana-based $DANZ token with 1B supply</p>
              </div>
              <div className="tldr-item">
                <span>🛒</span>
                <p>30% tradable at launch, 30% for community rewards</p>
              </div>
              <div className="tldr-item">
                <span>🕺</span>
                <p>IRL + digital utility: events, memes, challenges, and access</p>
              </div>
              <div className="tldr-item">
                <span>🔐</span>
                <p>No VCs, no rugs — just vibes, music, and on-chain rhythm</p>
              </div>
            </div>
            <div className="tldr-quote">
              <p>"$DANZ is the tokenized frequency of joy. A meme coin with soul — rooted in real-world rhythm, community, and movement."</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section danz-cta">
        <div className="container">
          <div className="cta-content animate">
            <h2>Ready to join the movement?</h2>
            <div className="cta-actions">
              <a href="#" className="btn btn-primary">Get $DANZ</a>
              <a href="/danz" className="btn btn-ghost">Learn About $DANZ</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Tokenomics