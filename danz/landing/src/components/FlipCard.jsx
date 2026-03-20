import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

function FlipCard({ icon, title, benefits, cta, index, autoFlipDelay }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const cardRef = useRef(null)
  const hasAutoFlipped = useRef(false)

  useEffect(() => {
    if (!autoFlipDelay) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAutoFlipped.current) {
          hasAutoFlipped.current = true
          const timeout = setTimeout(() => {
            setIsFlipped(true)
            // Flip back after 2s
            setTimeout(() => setIsFlipped(false), 2000)
          }, autoFlipDelay)
          return () => clearTimeout(timeout)
        }
      },
      { threshold: 0.5 }
    )

    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [autoFlipDelay])

  return (
    <div
      ref={cardRef}
      className="flip-card-container"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="flip-card-inner"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div className="flip-card-face flip-card-front">
          <div className="flip-card-icon" dangerouslySetInnerHTML={{ __html: icon }} />
          <h4 className="flip-card-title">{title}</h4>
          <span className="flip-card-hint">Tap to flip</span>
        </div>
        {/* Back */}
        <div className="flip-card-face flip-card-back">
          <ul className="flip-card-benefits">
            {benefits.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          {cta && <span className="flip-card-cta">{cta}</span>}
        </div>
      </motion.div>
    </div>
  )
}

export default FlipCard
