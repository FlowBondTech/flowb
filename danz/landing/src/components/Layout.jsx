import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useParticles, useScrollIndicator, useMagneticButtons, useGlowEffects, useRevealAnimations } from '../hooks/useNeonEffects'

function Layout({ children }) {
  const location = useLocation()
  
  // Initialize effects
  useParticles()
  useScrollIndicator()
  useMagneticButtons()
  useGlowEffects()
  useRevealAnimations()
  
  // Re-run animations on route change
  useEffect(() => {
    // Reset opacity first
    document.body.style.opacity = '0'
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      document.body.style.opacity = '1'
      
      // Re-trigger animations for elements
      const animatedElements = document.querySelectorAll('.animate')
      animatedElements.forEach(el => {
        el.classList.remove('fade-in')
        // Force reflow
        void el.offsetWidth
        // Re-add the class
        setTimeout(() => {
          el.classList.add('fade-in')
        }, 50)
      })
    }, 100)
    
    return () => clearTimeout(timer)
  }, [location.pathname])
  
  return (
    <>
      <div className="particles"></div>
      {children}
    </>
  )
}

export default Layout