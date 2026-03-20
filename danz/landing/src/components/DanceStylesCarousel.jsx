import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const danceStyles = [
  { name: 'Hip Hop', emoji: '\u{1F525}', gradient: 'linear-gradient(135deg, #ff6b35, #f7931e)' },
  { name: 'Salsa', emoji: '\u{1F336}\uFE0F', gradient: 'linear-gradient(135deg, #e74c3c, #c0392b)' },
  { name: 'Bachata', emoji: '\u{1F339}', gradient: 'linear-gradient(135deg, #e91e63, #9c27b0)' },
  { name: 'K-Pop', emoji: '\u{1F49C}', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)' },
  { name: 'House', emoji: '\u{1F3B5}', gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
  { name: 'Afrobeat', emoji: '\u{1F30D}', gradient: 'linear-gradient(135deg, #f59e0b, #10b981)' },
  { name: 'Breaking', emoji: '\u{1F4A5}', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
  { name: 'Voguing', emoji: '\u{2728}', gradient: 'linear-gradient(135deg, #d946ef, #6366f1)' },
  { name: 'Dancehall', emoji: '\u{1F3B6}', gradient: 'linear-gradient(135deg, #22c55e, #eab308)' },
  { name: 'Contemporary', emoji: '\u{1F54A}\uFE0F', gradient: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' },
  { name: 'Waacking', emoji: '\u{1F4AB}', gradient: 'linear-gradient(135deg, #f472b6, #fb923c)' },
  { name: 'Locking', emoji: '\u{1F513}', gradient: 'linear-gradient(135deg, #fbbf24, #ef4444)' },
]

// Duplicate for seamless loop
const allStyles = [...danceStyles, ...danceStyles]

function DanceStylesCarousel() {
  const trackRef = useRef(null)
  const animationRef = useRef(null)
  const offsetRef = useRef(0)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragOffset = useRef(0)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const speed = 0.5 // px per frame
    const track = trackRef.current
    if (!track) return

    const singleSetWidth = track.scrollWidth / 2

    const animate = () => {
      if (!isDragging.current) {
        offsetRef.current -= speed
        if (Math.abs(offsetRef.current) >= singleSetWidth) {
          offsetRef.current += singleSetWidth
        }
        track.style.transform = `translateX(${offsetRef.current}px)`
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationRef.current)
  }, [])

  const handlePointerDown = (e) => {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragOffset.current = offsetRef.current
    trackRef.current.style.cursor = 'grabbing'
  }

  const handlePointerMove = (e) => {
    if (!isDragging.current) return
    const diff = e.clientX - dragStartX.current
    offsetRef.current = dragOffset.current + diff
    trackRef.current.style.transform = `translateX(${offsetRef.current}px)`
  }

  const handlePointerUp = () => {
    isDragging.current = false
    if (trackRef.current) trackRef.current.style.cursor = 'grab'
  }

  return (
    <div className="carousel-wrapper">
      <div className="carousel-fade-left" />
      <div className="carousel-fade-right" />
      <div
        className="carousel-track"
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: 'grab' }}
      >
        {allStyles.map((style, i) => (
          <motion.div
            key={`${style.name}-${i}`}
            className="carousel-card"
            style={{ background: style.gradient }}
            whileHover={{ scale: 1.08, y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className="carousel-card-emoji">{style.emoji}</span>
            <span className="carousel-card-name">{style.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default DanceStylesCarousel
