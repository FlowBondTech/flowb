'use client'

import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { FiArrowUp } from 'react-icons/fi'

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <motion.button
      type="button"
      onClick={scrollToTop}
      initial={false}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
      transition={{ duration: 0.2 }}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-neon text-white shadow-lg shadow-neon-purple/30 flex items-center justify-center hover:shadow-neon-purple/50 transition-shadow"
      aria-label="Back to top"
    >
      <FiArrowUp className="w-5 h-5" />
    </motion.button>
  )
}
