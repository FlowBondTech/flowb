import React from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, viewportConfig } from '../hooks/useMotion'
import FlipCard from './FlipCard'

const hostFeatures = [
  {
    icon: '&#x1F3AA;',
    title: 'Host Events',
    description: 'Create dance events, workshops, and battles that bring people together.'
  },
  {
    icon: '&#x1F4E3;',
    title: 'Reach More Dancers',
    description: 'Get your events in front of the right audience automatically.'
  },
  {
    icon: '&#x1F4CA;',
    title: 'See What Works',
    description: 'Track attendance, engagement, and what your community loves.'
  },
  {
    icon: '&#x1F91D;',
    title: 'Grow Your Network',
    description: 'Connect with dancers, DJs, and organizers in your city.'
  }
]

const hostTypes = [
  {
    icon: '&#x1F3E2;',
    title: 'Studio Owners',
    benefits: ['Fill your classes', 'Grow your community', 'Track member engagement'],
    cta: 'Start hosting'
  },
  {
    icon: '&#x1F3AD;',
    title: 'Event Organizers',
    benefits: ['Promote events easily', 'Sell tickets in-app', 'Reach local dancers'],
    cta: 'List your event'
  },
  {
    icon: '&#x1F4AA;',
    title: 'Dance Instructors',
    benefits: ['Build your following', 'Share your craft', 'Get discovered'],
    cta: 'Create your profile'
  },
  {
    icon: '&#x1F465;',
    title: 'Community Leaders',
    benefits: ['Unite local dancers', 'Organize meetups', 'Grow your scene'],
    cta: 'Lead the movement'
  }
]

function ForHosts() {
  return (
    <section id="hosts" className="section for-hosts-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <span className="section-tag">For Hosts</span>
          <h2 className="section-title">Build Your Dance Community</h2>
          <p className="section-description" style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
            Create unforgettable movement experiences and grow your audience.
          </p>
        </motion.div>

        <motion.div
          className="features-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          {hostFeatures.map((feature) => (
            <motion.div key={feature.title} className="feature-card" variants={fadeInUp}>
              <div className="feature-icon" dangerouslySetInnerHTML={{__html: feature.icon}}></div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <h3 className="subsection-title" style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '3rem' }}>Perfect For</h3>
        </motion.div>

        <motion.div
          className="flip-cards-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          {hostTypes.map((type, i) => (
            <motion.div key={type.title} variants={fadeInUp}>
              <FlipCard
                icon={type.icon}
                title={type.title}
                benefits={type.benefits}
                cta={type.cta}
                index={i}
                autoFlipDelay={800 + i * 400}
              />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="host-cta"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <div className="cta-content">
            <h3>Ready to Host?</h3>
            <p>Join our host program and start growing your dance community today.</p>
            <button className="btn btn-primary btn-large">
              Apply to Host
              <span className="btn-arrow">&rarr;</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default ForHosts
