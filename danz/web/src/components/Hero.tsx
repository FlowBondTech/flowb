'use client'

import { useAuth } from '@/src/contexts/AuthContext'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect, useState } from 'react'

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false)
  const { isAuthenticated, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleLearnMore = (e: React.MouseEvent) => {
    e.preventDefault()
    const element = document.querySelector('#how-it-works')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleJoinMovement = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      login()
    }
  }

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 via-bg-primary to-neon-pink/10" />

      {/* Animated orbs */}
      <div className="hero-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Old motion divs for backward compatibility */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl opacity-50"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 15,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-pink/20 rounded-full blur-3xl"
        />
      </div>

      <div className="container relative z-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6"
        >
          <span className="gradient-text">Move. Connect. Earn.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto mb-4"
        >
          The app that rewards you for dancing, hosting events, and finding your vibe. Transform
          your passion for movement into meaningful connections and real rewards.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-lg text-text-secondary/80 mb-12"
        >
          Powered by{' '}
          <a
            href="https://flowbond.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon-purple hover:text-neon-pink transition-colors"
          >
            FlowBond.Tech
          </a>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button onClick={handleJoinMovement} className="btn btn-primary">
            {isAuthenticated ? 'Go to Dashboard' : 'Join the Community'}
          </button>
          <button onClick={handleLearnMore} className="btn btn-secondary">
            Learn More
          </button>
        </motion.div>

        {/* Launch Locations */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl mb-2">🌴</div>
            <div className="text-xl font-bold text-text-primary">Bali</div>
            <div className="text-text-muted mt-1">Indonesia</div>
          </div>
          <div className="text-center md:border-x border-white/10">
            <div className="text-3xl md:text-4xl mb-2">🎸</div>
            <div className="text-xl font-bold text-text-primary">Austin</div>
            <div className="text-text-muted mt-1">Texas, USA</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl mb-2">🏝️</div>
            <div className="text-xl font-bold text-text-primary">Tulum</div>
            <div className="text-text-muted mt-1">Mexico</div>
          </div>
          <div className="text-center md:border-l border-white/10">
            <div className="text-3xl md:text-4xl mb-2">🏔️</div>
            <div className="text-xl font-bold text-text-primary">Buenos Aires</div>
            <div className="text-text-muted mt-1">Argentina</div>
          </div>
        </motion.div>

        {/* Launch Date */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-center mt-12"
        >
          <p className="text-xl md:text-2xl font-bold gradient-text">Launching Q4 2025</p>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          className="w-6 h-10 border-2 border-text-muted rounded-full flex justify-center"
        >
          <div className="w-1 h-2 bg-text-muted rounded-full mt-2" />
        </motion.div>
      </motion.div>
    </section>
  )
}
