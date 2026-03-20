import React from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, scaleIn, staggerContainer, viewportConfig } from '../hooks/useMotion'
import { useInViewRef } from '../hooks/useMotion'

function AnimatedCounter({ end, suffix = '' }) {
  const [ref, isInView] = useInViewRef()
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!isInView) return
    let start = 0
    const duration = 1500
    const step = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isInView, end])

  return <span ref={ref}>{count}{suffix}</span>
}

const bentoItems = [
  {
    size: 'large',
    icon: '\u{1F483}',
    title: 'Dance Anywhere',
    description: 'At home, the studio, or live events',
    stat: { value: 50, suffix: 'K+', label: 'Sessions tracked' },
    gradient: 'linear-gradient(135deg, rgba(255, 110, 199, 0.15), rgba(185, 103, 255, 0.15))',
  },
  {
    size: 'medium',
    icon: '\u{1F3AF}',
    title: 'Track Progress',
    description: 'Movement streaks & milestones',
    gradient: 'linear-gradient(135deg, rgba(185, 103, 255, 0.1), rgba(99, 102, 241, 0.1))',
  },
  {
    size: 'medium',
    icon: '\u{1F3C6}',
    title: 'Join Challenges',
    description: 'Compete & level up',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1))',
  },
  {
    size: 'medium',
    icon: '\u{1F30D}',
    title: 'Find Your People',
    description: 'Connect with local dancers',
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(99, 102, 241, 0.1))',
  },
  {
    size: 'medium',
    icon: '\u{1F4F1}',
    title: 'No Equipment',
    description: 'Just you & your phone',
    gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
  },
]

function ForDancers() {
  return (
    <section id="dancers" className="section for-dancers-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <span className="section-tag">For Dancers</span>
          <h2 className="section-title">Your Dance. Your Community.</h2>
          <p className="section-description" style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
            Whether you&apos;re a pro or just love to move, DANZ.NOW is your home.
          </p>
        </motion.div>

        <motion.div
          className="bento-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          {bentoItems.map((item, i) => (
            <motion.div
              key={item.title}
              className={`bento-card bento-${item.size}`}
              variants={i === 0 ? scaleIn : fadeInUp}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              style={{ background: item.gradient }}
            >
              <span className="bento-icon">{item.icon}</span>
              <h3 className="bento-title">{item.title}</h3>
              <p className="bento-desc">{item.description}</p>
              {item.stat && (
                <div className="bento-stat">
                  <span className="bento-stat-value">
                    <AnimatedCounter end={item.stat.value} suffix={item.stat.suffix} />
                  </span>
                  <span className="bento-stat-label">{item.stat.label}</span>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default ForDancers
