'use client'

import {
  useMagneticButtons,
  useParticles,
  useRevealAnimations,
  useScrollIndicator,
} from '@/src/hooks/useNeonEffects'
import { useEffect } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  useParticles()
  useScrollIndicator()
  useMagneticButtons()
  useRevealAnimations()

  useEffect(() => {
    // Add initial page load animation
    document.body.style.opacity = '0'
    setTimeout(() => {
      document.body.style.transition = 'opacity 0.5s ease'
      document.body.style.opacity = '1'
    }, 100)
  }, [])

  return (
    <>
      <div className="particles" />
      {children}
    </>
  )
}
