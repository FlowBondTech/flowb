'use client'

import { useState } from 'react'

interface CheckInScreenProps {
  streak: number
  onCheckIn: (didDance: boolean) => void
}

export function CheckInScreen({ streak, onCheckIn }: CheckInScreenProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleYes = () => {
    setIsAnimating(true)
    // Let animation play before transitioning
    setTimeout(() => {
      onCheckIn(true)
    }, 800)
  }

  const handleNo = () => {
    onCheckIn(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-6 text-center">
      {/* Streak display */}
      {streak > 0 && (
        <div className="mb-5 px-4 py-2 rounded-full bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 border border-neon-pink/40 animate-float">
          <span className="text-sm font-medium text-neon-pink">🔥 {streak} day streak</span>
        </div>
      )}

      {/* Main question */}
      <h1 className="text-2xl font-bold text-text-primary mb-2 animate-fade-in">
        Did you dance today?
      </h1>

      <p className="text-text-secondary text-sm mb-8 max-w-[260px] animate-fade-in">
        Check in daily to build your streak and earn rewards
      </p>

      {/* Yes button - with animated ring */}
      <div className="relative">
        {/* Outer spinning ring */}
        <div
          className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-pink animate-spin-slow opacity-80"
          style={{ animationDuration: '3s' }}
        />

        {/* Middle pulsing ring */}
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-neon-pink to-neon-purple animate-pulse opacity-60" />

        {/* Button */}
        <button
          onClick={handleYes}
          disabled={isAnimating}
          className={`
            relative w-40 h-40 rounded-full
            bg-gradient-to-br from-neon-pink via-neon-purple to-neon-pink
            shadow-glow-pink
            transition-all duration-300
            hover:scale-105 hover:shadow-glow-purple
            active:scale-95
            disabled:opacity-70
            overflow-hidden
            ${isAnimating ? 'scale-110' : ''}
          `}
        >
          {/* Inner gradient shine */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 rounded-full" />

          {/* Content */}
          <div className="relative flex flex-col items-center justify-center z-10">
            <span className="text-4xl mb-1.5 animate-bounce">💃</span>
            <span className="text-lg font-bold text-white drop-shadow-lg">Yes I Danz&apos;d!</span>
          </div>

          {/* Burst animation on click */}
          {isAnimating && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-full h-full rounded-full bg-neon-pink animate-ping opacity-40" />
                <div
                  className="absolute w-[130%] h-[130%] rounded-full bg-neon-purple animate-ping opacity-30"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="absolute w-[160%] h-[160%] rounded-full bg-neon-pink animate-ping opacity-20"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </>
          )}
        </button>
      </div>

      {/* Points preview */}
      <div className="mt-6 text-sm text-text-muted animate-fade-in">
        <span className="text-neon-blue font-semibold">+50 XP</span>
        {streak > 0 && (
          <span className="text-neon-pink font-semibold">
            {' '}
            + {Math.min((streak + 1) * 5, 50)} streak bonus
          </span>
        )}
      </div>

      {/* No option */}
      <div className="relative mt-5 group">
        <button
          onClick={handleNo}
          className="relative px-5 py-2.5 rounded-full border border-text-muted/50 text-text-muted text-sm hover:text-text-secondary hover:border-text-secondary/50 transition-all duration-300 hover:bg-bg-hover/30 backdrop-blur-sm"
        >
          Not today
        </button>
      </div>
    </div>
  )
}
