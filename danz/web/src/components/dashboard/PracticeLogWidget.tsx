'use client'

import { useState } from 'react'
import { FiCheck, FiClock, FiMusic, FiPlus } from 'react-icons/fi'

interface PracticeSession {
  id: string
  danceStyle: string
  duration: number
  date: string
  notes?: string
}

const DANCE_STYLES = ['Hip Hop', 'Contemporary', 'Ballet', 'Jazz', 'Breaking', 'Salsa']

export default function PracticeLogWidget() {
  const [showForm, setShowForm] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('')
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [logging, setLogging] = useState(false)

  // Mock recent sessions
  const recentSessions: PracticeSession[] = [
    { id: '1', danceStyle: 'Hip Hop', duration: 45, date: '2025-01-17' },
    { id: '2', danceStyle: 'Contemporary', duration: 60, date: '2025-01-16' },
    { id: '3', danceStyle: 'Breaking', duration: 30, date: '2025-01-15' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLogging(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Reset form
    setSelectedStyle('')
    setDuration(30)
    setNotes('')
    setShowForm(false)
    setLogging(false)
  }

  const totalMinutes = recentSessions.reduce((sum, s) => sum + s.duration, 0)

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <FiClock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Practice Log</h2>
            <p className="text-sm text-text-secondary">{totalMinutes} min this week</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="p-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-lg text-neon-purple transition-all"
            aria-label="Log practice"
          >
            <FiPlus size={20} />
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dance Style Select */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Dance Style
            </label>
            <select
              value={selectedStyle}
              onChange={e => setSelectedStyle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
            >
              <option value="">Select style...</option>
              {DANCE_STYLES.map(style => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Slider */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Duration: {duration} minutes
            </label>
            <input
              type="range"
              min="15"
              max="180"
              step="15"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full h-2 bg-bg-primary rounded-lg appearance-none cursor-pointer slider-thumb"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>15m</span>
              <span>3h</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How was your practice?"
              className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors resize-none"
              rows={2}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={logging}
              className="flex-1 py-2.5 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-lg font-medium hover:shadow-lg hover:shadow-neon-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {logging ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiCheck size={18} />
                  Log Practice
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-bg-primary border border-white/10 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Recent Sessions */}
          {recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.slice(0, 3).map(session => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-3 bg-bg-primary/30 border border-white/5 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FiMusic className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-text-primary">{session.danceStyle}</h4>
                    <p className="text-xs text-text-muted">
                      {new Date(session.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-text-secondary">
                    <FiClock size={14} />
                    <span>{session.duration}m</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/10 flex items-center justify-center">
                <FiClock className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-sm text-text-secondary mb-3">No practice logged yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-sm text-neon-purple hover:text-neon-pink font-medium transition-colors"
              >
                Log your first session
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
