'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type SessionState = 'idle' | 'countdown' | 'active' | 'paused' | 'complete'

interface DanceStats {
  duration: number
  moves: number
  intensity: number
  calories: number
}

// Core dance tracking component
export function DanceTracker() {
  const [state, setState] = useState<SessionState>('idle')
  const [countdown, setCountdown] = useState(3)
  const [stats, setStats] = useState<DanceStats>({
    duration: 0,
    moves: 0,
    intensity: 0,
    calories: 0,
  })
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Start countdown then session
  const startSession = useCallback(() => {
    setState('countdown')
    setCountdown(3)

    const countdownInterval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownInterval)
          setState('active')
          startTimeRef.current = Date.now()
          return 0
        }
        return c - 1
      })
    }, 1000)
  }, [])

  // Update stats while active
  useEffect(() => {
    if (state !== 'active') return

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setStats({
        duration: elapsed,
        moves: Math.floor(elapsed * 2.5), // Simulated move detection
        intensity: 50 + Math.random() * 30,
        calories: Math.floor(elapsed * 0.15),
      })
    }, 500)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state])

  // Stop session
  const stopSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setState('complete')
  }, [])

  // Reset session
  const resetSession = useCallback(() => {
    setState('idle')
    setStats({ duration: 0, moves: 0, intensity: 0, calories: 0 })
  }, [])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* Session State Display */}
      {state === 'idle' && (
        <IdleView onStart={startSession} />
      )}

      {state === 'countdown' && (
        <CountdownView count={countdown} />
      )}

      {state === 'active' && (
        <ActiveView
          stats={stats}
          formatTime={formatTime}
          onStop={stopSession}
        />
      )}

      {state === 'complete' && (
        <CompleteView
          stats={stats}
          formatTime={formatTime}
          onReset={resetSession}
        />
      )}
    </div>
  )
}

// Idle state view
function IdleView({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-32 h-32 rounded-full bg-gradient-to-r from-danz-primary to-danz-secondary p-1 mb-8">
        <div className="w-full h-full rounded-full bg-danz-dark flex items-center justify-center">
          <svg className="w-16 h-16 text-danz-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2">Ready to Dance?</h2>
      <p className="text-gray-400 mb-8">
        Start a session to track your moves
      </p>

      <button onClick={onStart} className="btn-primary text-lg px-12 py-4 glow-pink">
        Start Session
      </button>
    </div>
  )
}

// Countdown view
function CountdownView({ count }: { count: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="text-8xl font-bold bg-gradient-to-r from-danz-primary to-danz-secondary bg-clip-text text-transparent animate-pulse">
        {count}
      </div>
      <p className="text-gray-400 mt-4">Get ready...</p>
    </div>
  )
}

// Active session view
function ActiveView({
  stats,
  formatTime,
  onStop,
}: {
  stats: DanceStats
  formatTime: (s: number) => string
  onStop: () => void
}) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Timer */}
      <div className="text-center py-8">
        <div className="text-6xl font-bold font-mono text-white mb-2">
          {formatTime(stats.duration)}
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-sm uppercase tracking-wide">Recording</span>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Moves" value={stats.moves.toString()} icon="💃" />
        <StatCard label="Intensity" value={`${Math.round(stats.intensity)}%`} icon="🔥" />
        <StatCard label="Calories" value={stats.calories.toString()} icon="⚡" />
        <StatCard label="DANZ Est." value={(stats.moves * 0.1).toFixed(1)} icon="🪙" />
      </div>

      {/* Intensity Bar */}
      <div className="card mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Intensity</span>
          <span>{Math.round(stats.intensity)}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
            style={{ width: `${stats.intensity}%` }}
          />
        </div>
      </div>

      {/* Stop Button */}
      <button
        onClick={onStop}
        className="btn-secondary border-red-500 text-red-500 hover:bg-red-500/10 mt-auto"
      >
        Stop Session
      </button>
    </div>
  )
}

// Complete view
function CompleteView({
  stats,
  formatTime,
  onReset,
}: {
  stats: DanceStats
  formatTime: (s: number) => string
  onReset: () => void
}) {
  const earnedDanz = (stats.moves * 0.1).toFixed(1)

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold mb-2">Great Session!</h2>

      {/* Summary Card */}
      <div className="card w-full mb-6">
        <div className="grid grid-cols-2 gap-4 text-left">
          <div>
            <p className="text-gray-400 text-sm">Duration</p>
            <p className="text-xl font-bold">{formatTime(stats.duration)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Moves</p>
            <p className="text-xl font-bold">{stats.moves}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Calories</p>
            <p className="text-xl font-bold">{stats.calories}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Avg Intensity</p>
            <p className="text-xl font-bold">{Math.round(stats.intensity)}%</p>
          </div>
        </div>
      </div>

      {/* Earnings */}
      <div className="card w-full glow-pink mb-6">
        <p className="text-gray-400 text-sm mb-1">You Earned</p>
        <p className="text-4xl font-bold text-danz-gold">
          {earnedDanz} <span className="text-lg">DANZ</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 w-full">
        <button onClick={onReset} className="btn-secondary flex-1">
          New Session
        </button>
        <button className="btn-primary flex-1">
          Share
        </button>
      </div>
    </div>
  )
}

// Stat card component
function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card text-center py-4">
      <span className="text-2xl mb-1">{icon}</span>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
