import React from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, viewportConfig } from '../hooks/useMotion'

function About() {
  const handleCardClick = (link) => {
    const element = document.querySelector(link)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const companyPillars = [
    {
      title: 'The App',
      subtitle: 'Your Dance Companion',
      description: 'Discover events, track your sessions, and connect with dancers in your city. Available on iOS and Android.',
      link: '#how-it-works',
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
      title: 'The Community',
      subtitle: 'Find Your Crew',
      description: 'Join a global network of dancers, hosts, and movement lovers who share your passion.',
      link: '#dancers',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="18" cy="18" r="6" stroke="currentColor" strokeWidth="2"/>
          <circle cx="30" cy="18" r="6" stroke="currentColor" strokeWidth="2"/>
          <circle cx="24" cy="30" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M22 26L26 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      title: 'The Events',
      subtitle: 'Never Miss a Beat',
      description: 'From street battles to studio workshops, find dance events happening near you every week.',
      link: '#hosts',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="12" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 20H40" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 8V16M32 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="24" cy="30" r="4" fill="currentColor"/>
        </svg>
      )
    }
  ]

  return (
    <section id="about" className="section about-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <span className="section-tag">About DANZ.NOW</span>
          <h2 className="section-title">Dance More. Together.</h2>
          <p className="section-description">
            DANZ.NOW is the app for people who love to dance. Discover events, connect with your community, and never dance alone.
          </p>
        </motion.div>
        <motion.div
          className="process-grid centered"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          {companyPillars.map((pillar, index) => (
            <motion.div
              key={index}
              className="process-card clickable"
              variants={fadeInUp}
              onClick={() => handleCardClick(pillar.link)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-glow"></div>
              <div className="process-icon">
                {pillar.icon}
              </div>
              <h3>{pillar.title}</h3>
              <h4 className="pillar-subtitle">{pillar.subtitle}</h4>
              <p>{pillar.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default About
