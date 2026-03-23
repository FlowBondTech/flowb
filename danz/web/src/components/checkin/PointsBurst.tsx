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
    <div className="fixed inset-0 flex items-center justify-center bg-bg-primary/95 z-50 backdrop-blur-sm">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-gradient-radial from-neon-purple/20 via-transparent to-transparent opacity-50" />

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              backgroundColor:
                i % 3 === 0
                  ? 'rgb(var(--color-neon-pink-rgb))'
                  : i % 3 === 1
                    ? 'rgb(var(--color-neon-purple-rgb))'
                    : 'rgb(var(--color-neon-blue-rgb))',
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
          <div
            className="absolute w-32 h-32 rounded-full border-2 border-neon-pink animate-ping"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="absolute w-32 h-32 rounded-full border-2 border-neon-purple animate-ping"
            style={{ animationDelay: '0.15s' }}
          />
          <div
            className="absolute w-32 h-32 rounded-full border-2 border-neon-blue animate-ping"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      )}

      <div className="relative flex flex-col items-center">
        {/* Main celebration circle */}
        <div className="relative">
          {/* Outer spinning ring */}
          <div
            className="absolute -inset-4 rounded-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue animate-spin opacity-60"
            style={{ animationDuration: '3s' }}
          />

          {/* Pulsing ring */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-neon-pink to-neon-purple animate-pulse opacity-40" />

          {/* Main circle */}
          <div
            className={`
              relative w-44 h-44 rounded-full
              bg-gradient-to-br from-neon-pink via-neon-purple to-neon-blue
              flex items-center justify-center
              shadow-glow-purple
              overflow-hidden
              ${stage === 'burst' ? 'animate-pulse' : 'animate-pulse-glow'}
            `}
          >
            {/* Inner shine */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/20 rounded-full" />

            {/* Emoji */}
            <span className="relative z-10 text-7xl animate-bounce">
              {stage === 'done' ? '🎉' : '✨'}
            </span>
          </div>
        </div>

        {/* Points display */}
        <div className="mt-10 text-center">
          <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue">
            +{displayPoints}
          </div>
          <div className="text-2xl text-text-primary mt-3 font-medium tracking-wide">
            XP Earned!
          </div>

          {/* Breakdown */}
          {stage !== 'burst' && (
            <div className="mt-6 flex items-center justify-center gap-4 text-sm animate-fade-in">
              <div className="px-4 py-2 rounded-full bg-neon-blue/10 border border-neon-blue/30">
                <span className="text-neon-blue font-semibold">+{points} base</span>
              </div>
              {streakBonus > 0 && (
                <div className="px-4 py-2 rounded-full bg-neon-pink/10 border border-neon-pink/30">
                  <span className="text-neon-pink font-semibold">+{streakBonus} streak 🔥</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Celebration text */}
        {stage === 'done' && (
          <div className="mt-8 text-xl text-neon-pink animate-bounce font-medium">
            Keep dancing! 💃🕺
          </div>
        )}
      </div>
    </div>
  )
}
