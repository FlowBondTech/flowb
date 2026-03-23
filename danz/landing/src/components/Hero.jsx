import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTypingEffect, useCounters } from '../hooks/useNeonEffects'
import { fadeInUp, staggerContainer, viewportConfig } from '../hooks/useMotion'
import DanceStylesCarousel from './DanceStylesCarousel'

function Hero() {
  const titleRef = useRef(null)
  const counterRefs = useRef([])
  const [showPurchase, setShowPurchase] = useState(false)

  useTypingEffect(titleRef)
  useCounters(counterRefs)

  const handleLearnMore = (e) => {
    e.preventDefault()
    const element = document.querySelector('#how-it-works')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section id="home" className="hero">
      <div className="hero-bg-gradient"></div>
      <div className="hero-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      <motion.div
        className="container hero-content"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 className="hero-title" variants={fadeInUp}>
          <span className="gradient-text" ref={titleRef}></span>
        </motion.h1>
        <motion.p className="hero-description" variants={fadeInUp}>
          Dance. Get rewarded. Connect with your community.
          <br />Find events, meet dancers, and turn every move into something meaningful.
        </motion.p>
        <motion.div className="hero-cta" variants={fadeInUp}>
          <a href="#" className="btn btn-primary" onClick={(e) => {
            e.preventDefault()
            setShowPurchase(true)
          }}>
            <span>Get the App</span>
            <svg className="btn-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="/danz" onClick={handleLearnMore} className="btn btn-secondary">See How It Works</a>
        </motion.div>
        <motion.div className="hero-stats" variants={fadeInUp}>
          <div className="stat">
            <div className="stat-value">
              <span className="launch-location">&#x1F334; Bali</span>
            </div>
            <div className="stat-label">Indonesia</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat">
            <div className="stat-value">
              <span className="launch-location">&#x1F3B8; Austin</span>
            </div>
            <div className="stat-label">Texas, USA</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat">
            <div className="stat-value">
              <span className="launch-location">&#x1F3DD;&#xFE0F; Tulum</span>
            </div>
            <div className="stat-label">Mexico</div>
          </div>
        </motion.div>
        <motion.div
          className="launch-date"
          variants={fadeInUp}
          style={{textAlign: 'center', marginTop: '2rem', fontSize: '1.2rem', color: 'var(--neon-purple)'}}
        >
          <strong>Launching Q4 2025</strong>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          style={{ marginTop: '2.5rem' }}
        >
          <DanceStylesCarousel />
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Hero
