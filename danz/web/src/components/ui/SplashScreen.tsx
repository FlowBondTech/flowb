'use client'

import { useEffect, useState } from 'react'

interface SplashScreenProps {
  title?: string
  subtitle?: string
  onComplete?: () => void
  duration?: number
}

export function SplashScreen({
  title = 'DANZ',
  subtitle = 'Move. Connect. Earn.',
  onComplete,
  duration = 1500,
}: SplashScreenProps) {
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    // Fade in on mount
    requestAnimationFrame(() => setFadeIn(true))

    // Call onComplete after duration
    const timer = setTimeout(() => {
      onComplete?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-bg-primary to-[#0f0f1e]">
      {/* Logo Container */}
      <div
        className={`relative w-[150px] h-[150px] mb-10 transition-all duration-500 ${
          fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Glow effect */}
        <div className="absolute inset-[-15px] bg-neon-pink rounded-full opacity-10 blur-xl animate-pulse-slow" />

        {/* Outer spinning ring */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="w-full h-full rounded-full p-[3px] bg-gradient-to-br from-neon-pink to-neon-purple">
            <div className="w-full h-full rounded-full bg-transparent border-[3px] border-transparent" />
          </div>
        </div>

        {/* Inner circle with $DANZ */}
        <div className="absolute inset-[15px] rounded-full bg-bg-secondary flex flex-col items-center justify-center border-2 border-neon-pink">
          <span className="text-neon-pink text-2xl font-bold -mb-1">$</span>
          <span className="text-text-primary text-[28px] font-bold tracking-[2px]">DANZ</span>
        </div>
      </div>

      {/* Tagline */}
      <p
        className={`text-text-secondary text-lg tracking-[1px] mb-10 transition-opacity duration-500 ${
          fadeIn ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {subtitle}
      </p>

      {/* Loading dots */}
      <div
        className={`flex gap-2 transition-opacity duration-500 ${
          fadeIn ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-neon-pink animate-bounce-dot"
            style={{
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </div>

      {/* Add custom animations via style tag */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.1); }
        }
        @keyframes bounce-dot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        .animate-bounce-dot {
          animation: bounce-dot 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
