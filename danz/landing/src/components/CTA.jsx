import React from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, viewportConfig } from '../hooks/useMotion'

function CTA() {
  const handleJoinWaitlist = (e) => {
    e.preventDefault()
    const event = new CustomEvent('openWaitlist')
    window.dispatchEvent(event)
  }

  return (
    <section className="section cta-section cta-blobs-wrapper">
      {/* Animated gradient blobs */}
      <div className="cta-blob cta-blob-1" />
      <div className="cta-blob cta-blob-2" />
      <div className="cta-blob cta-blob-3" />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <motion.div
          className="cta-content"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <motion.h2 className="cta-title" variants={fadeInUp}>
            <span className="gradient-text">Ready to dance?</span>
          </motion.h2>
          <motion.p className="cta-description" variants={fadeInUp}>
            Join the movement. Find events, connect with dancers, and never miss a beat. This is DANZ.NOW.
          </motion.p>
          <motion.div className="cta-actions" variants={fadeInUp}>
            <a href="#" className="btn btn-primary btn-large btn-glow" onClick={handleJoinWaitlist}>Get Early Access</a>
            <a href="#" className="btn btn-secondary btn-large" onClick={(e) => {
              e.preventDefault()
              const el = document.querySelector('#hosts')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}>Host an Event</a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default CTA
