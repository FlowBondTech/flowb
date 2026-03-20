import React from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, viewportConfig } from '../hooks/useMotion'

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Download the App',
      description: 'Create your profile and discover dance events near you',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="12" y="8" width="24" height="32" rx="4" stroke="currentColor" strokeWidth="2"/>
          <circle cx="24" cy="20" r="3" fill="currentColor"/>
          <rect x="16" y="26" width="16" height="2" fill="currentColor" rx="1"/>
          <rect x="16" y="30" width="12" height="2" fill="currentColor" rx="1"/>
        </svg>
      )
    },
    {
      number: '02',
      title: 'Dance Your Way',
      description: 'Hit the dance floor at events, studios, or even your living room',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M20 20L24 24L28 20M24 24V32M20 28L16 36M28 28L32 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      number: '03',
      title: 'Get Rewarded',
      description: 'Earn rewards for moving, attending events, and being part of the community',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 8L28 18H38L30 24L33 34L24 28L15 34L18 24L10 18H20L24 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      number: '04',
      title: 'Connect & Grow',
      description: 'Meet dancers, find your crew, and never miss an event in your city',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="18" cy="18" r="6" stroke="currentColor" strokeWidth="2"/>
          <circle cx="30" cy="18" r="6" stroke="currentColor" strokeWidth="2"/>
          <circle cx="24" cy="30" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M22 26L26 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    }
  ]

  return (
    <section id="how-it-works" className="section how-it-works-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <span className="section-tag">Simple as 1-2-3-4</span>
          <h2 className="section-title">How It Works</h2>
          <p className="section-description">
            Start dancing and connecting in minutes.
          </p>
        </motion.div>
        <motion.div
          className="process-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          {steps.map((step, index) => (
            <motion.div key={index} className="process-card" variants={fadeInUp}>
              <div className="card-glow"></div>
              <div className="process-number">{step.number}</div>
              <div className="process-icon">
                {step.icon}
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default HowItWorks
