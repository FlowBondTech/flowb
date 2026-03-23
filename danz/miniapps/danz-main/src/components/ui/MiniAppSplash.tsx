'use client'

import { useEffect, useState } from 'react'

// Optimized splash screen - minimal bundle, fast render
export function MiniAppSplash() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 5, 100))
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-danz-dark">
      {/* Logo - use inline SVG for instant render, no network request */}
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-danz-primary to-danz-secondary rounded-full opacity-20 animate-pulse" />
        <div className="absolute inset-2 bg-danz-dark rounded-full flex items-center justify-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            className="animate-float"
          >
            <circle cx="32" cy="32" r="28" stroke="url(#gradient)" strokeWidth="3" fill="none" />
            <path
              d="M24 20 L32 44 L40 20"
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6ec7" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Brand */}
      <h1 className="text-3xl font-bold bg-gradient-to-r from-danz-primary to-danz-secondary bg-clip-text text-transparent mb-2">
        DANZ
      </h1>
      <p className="text-gray-400 text-sm mb-8">Move. Connect. Earn.</p>

      {/* Progress bar - lightweight animation */}
      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-danz-primary to-danz-secondary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Loading dots */}
      <div className="flex gap-1 mt-4">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-danz-primary/50"
            style={{
              animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
