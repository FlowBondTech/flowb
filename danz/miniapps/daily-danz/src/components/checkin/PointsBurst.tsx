'use client'

import { useEffect, useState } from 'react'

interface PointsBurstProps {
  points: number
  streakBonus: number
  onComplete: () => void
}

export function PointsBurst({ points, streakBonus, onComplete }: PointsBurstProps) {
  const [stage, setStage] = useState<'burst' | 'count' | 'done'>('burst')
  const [displayPoints, setDisplayPoints] = useState(0)
  const totalPoints = points + streakBonus

  useEffect(() => {
    // Stage 1: Burst animation
    const burstTimer = setTimeout(() => {
      setStage('count')
    }, 600)

    return () => clearTimeout(burstTimer)
  }, [])

  useEffect(() => {
    if (stage === 'count') {
      // Count up animation
      const duration = 1200
      const steps = 25
      const increment = totalPoints / steps
      let current = 0

      const countInterval = setInterval(() => {
        current += increment
        if (current >= totalPoints) {
          setDisplayPoints(totalPoints)
          clearInterval(countInterval)
          setTimeout(() => {
            setStage('done')
            setTimeout(onComplete, 600)
          }, 1000)
        } else {
          setDisplayPoints(Math.floor(current))
        }
      }, duration / steps)

      return () => clearInterval(countInterval)
    }
  }, [stage, totalPoints, onComplete])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-danz-dark-950/95 z-50 backdrop-blur-sm">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-radial-glow opacity-50" />

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full particle-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              backgroundColor: i % 3 === 0 ? '#ff6ec7' : i % 3 === 1 ? '#b967ff' : '#06b6d4',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
              opacity: 0.4 + Math.random() * 0.4,
              boxShadow: `0 0 ${10 + Math.random() * 10}px currentColor`,
            }}
          />
        ))}
      </div>

      {/* Expanding rings */}
      {stage === 'burst' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-32 h-32 rounded-full border-2 border-danz-pink-500 burst-ring" style={{ animationDelay: '0s' }} />
          <div className="absolute w-32 h-32 rounded-full border-2 border-danz-purple-500 burst-ring" style={{ animationDelay: '0.15s' }} />
          <div className="absolute w-32 h-32 rounded-full border-2 border-danz-cyan-500 burst-ring" style={{ animationDelay: '0.3s' }} />
        </div>
      )}

      <div className="relative flex flex-col items-center">
        {/* Main celebration circle with rings */}
        <div className="relative">
          {/* Outer spinning ring */}
          <div className="absolute -inset-4 rounded-full dance-ring opacity-60" />

          {/* Pulsing ring */}
          <div className="absolute -inset-2 rounded-full dance-ring-pulse opacity-40" />

          {/* Main circle */}
          <div
            className={`
              relative w-44 h-44 rounded-full
              bg-gradient-to-br from-danz-pink-500 via-danz-purple-500 to-danz-cyan-500
              flex items-center justify-center
              shadow-neon-glow
              overflow-hidden
              ${stage === 'burst' ? 'animate-explode' : 'animate-pulse-subtle'}
            `}
          >
            {/* Inner shine */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/20 rounded-full" />

            {/* Emoji */}
            <span className="relative z-10 text-7xl animate-bounce-subtle">
              {stage === 'done' ? '🎉' : '✨'}
            </span>
          </div>
        </div>

        {/* Points display */}
        <div className="mt-10 text-center">
          <div className="points-burst-number text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-danz-pink-400 via-danz-purple-400 to-danz-cyan-400 animate-gradient">
            +{displayPoints}
          </div>
          <div className="text-2xl text-gray-200 mt-3 font-medium tracking-wide">
            XP Earned!
          </div>

          {/* Breakdown */}
          {stage !== 'burst' && (
            <div className="mt-6 flex items-center justify-center gap-4 text-sm animate-fade-in">
              <div className="px-4 py-2 rounded-full bg-danz-cyan-500/10 border border-danz-cyan-500/30">
                <span className="text-danz-cyan-400 font-semibold">+{points} base</span>
              </div>
              {streakBonus > 0 && (
                <div className="px-4 py-2 rounded-full bg-danz-pink-500/10 border border-danz-pink-500/30">
                  <span className="text-danz-pink-400 font-semibold">+{streakBonus} streak 🔥</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Celebration text */}
        {stage === 'done' && (
          <div className="mt-8 text-xl text-danz-pink-300 animate-bounce font-medium">
            Keep dancing! 💃🕺
          </div>
        )}
      </div>
    </div>
  )
}
