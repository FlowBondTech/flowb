import React from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, viewportConfig } from '../hooks/useMotion'

const showcaseCards = [
  {
    title: 'Discover Events',
    gradient: 'linear-gradient(135deg, #ff6ec7 0%, #b967ff 100%)',
    elements: [
      { type: 'event-card', label: 'Salsa Night', detail: 'Tonight 8pm', top: '15%', left: '10%', delay: 0.3 },
      { type: 'event-card', label: 'Hip Hop Battle', detail: 'Saturday', top: '45%', right: '8%', delay: 0.6 },
      { type: 'badge', label: '12 events near you', bottom: '20%', left: '15%', delay: 0.9 },
    ]
  },
  {
    title: 'Track Progress',
    gradient: 'linear-gradient(135deg, #b967ff 0%, #6366f1 100%)',
    elements: [
      { type: 'progress', label: 'Weekly Goal', value: 75, top: '18%', left: '12%', delay: 0.4 },
      { type: 'stat-bubble', label: '47 sessions', top: '50%', right: '10%', delay: 0.7 },
      { type: 'streak', label: '12 day streak', bottom: '18%', left: '10%', delay: 1.0 },
    ]
  },
  {
    title: 'Connect & Grow',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
    elements: [
      { type: 'chat-bubble', label: 'Great session!', top: '15%', right: '12%', delay: 0.5 },
      { type: 'badge', label: 'Level 8 Dancer', top: '48%', left: '8%', delay: 0.8 },
      { type: 'notification', label: '+3 new connections', bottom: '22%', right: '10%', delay: 1.1 },
    ]
  }
]

function FloatingElement({ element }) {
  const style = {
    position: 'absolute',
    ...(element.top && { top: element.top }),
    ...(element.bottom && { bottom: element.bottom }),
    ...(element.left && { left: element.left }),
    ...(element.right && { right: element.right }),
  }

  return (
    <motion.div
      className={`showcase-float showcase-${element.type}`}
      style={style}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: element.delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      animate={{ y: [0, -6, 0] }}
    >
      {element.type === 'progress' ? (
        <>
          <span className="showcase-float-label">{element.label}</span>
          <div className="showcase-progress-bar">
            <motion.div
              className="showcase-progress-fill"
              initial={{ width: 0 }}
              whileInView={{ width: `${element.value}%` }}
              viewport={{ once: true }}
              transition={{ delay: element.delay + 0.3, duration: 0.8 }}
            />
          </div>
        </>
      ) : (
        <>
          {element.detail && <span className="showcase-float-detail">{element.detail}</span>}
          <span className="showcase-float-label">{element.label}</span>
        </>
      )}
    </motion.div>
  )
}

function ShowcaseSection() {
  return (
    <section className="section showcase-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <span className="section-tag">The Experience</span>
          <h2 className="section-title">See DANZ.NOW In Action</h2>
          <p className="section-description" style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
            A glimpse into the app that&apos;s bringing dancers together.
          </p>
        </motion.div>

        <motion.div
          className="showcase-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          {showcaseCards.map((card, i) => (
            <motion.div
              key={card.title}
              className="showcase-card"
              variants={fadeInUp}
            >
              <div className="showcase-phone" style={{ background: card.gradient }}>
                <div className="showcase-phone-notch" />
                {card.elements.map((el, j) => (
                  <FloatingElement key={j} element={el} />
                ))}
              </div>
              <h3 className="showcase-card-title">{card.title}</h3>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default ShowcaseSection
