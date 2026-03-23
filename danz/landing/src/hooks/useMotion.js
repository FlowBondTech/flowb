import { useInView } from 'framer-motion'
import { useRef } from 'react'

// Reusable animation variants
export const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5 }
  }
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
}

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
}

export const staggerFast = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
}

// Float animation for decorative elements
export const floatAnimation = {
  y: [0, -15, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut'
  }
}

export const floatSlow = {
  y: [0, -10, 0],
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: 'easeInOut'
  }
}

// Shared viewport config
export const viewportConfig = {
  once: true,
  amount: 0.2,
  margin: '-50px'
}

// Hook to check if element is in view
export function useInViewRef(options = {}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3, ...options })
  return [ref, isInView]
}
