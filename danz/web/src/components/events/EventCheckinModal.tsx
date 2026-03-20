'use client'

import { useMutation } from '@apollo/client'
import { gql } from 'graphql-tag'
import { useEffect, useRef, useState } from 'react'
import {
  FiAlertCircle,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiLoader,
  FiMapPin,
  FiType,
  FiX,
} from 'react-icons/fi'

const CHECK_IN_WITH_CODE = gql`
  mutation CheckInWithCode($code: String!) {
    checkInWithCode(code: $code) {
      success
      message
      event {
        id
        title
        location_name
        start_date_time
        end_date_time
        facilitator {
          display_name
          username
        }
      }
      registration {
        id
        checked_in
        check_in_time
      }
    }
  }
`

const GET_EVENT_BY_CODE = gql`
  query GetEventByCheckinCode($code: String!) {
    eventByCheckinCode(code: $code) {
      id
      title
      location_name
      start_date_time
      end_date_time
      is_registered
      facilitator {
        display_name
        username
      }
    }
  }
`

interface EventCheckinModalProps {
  isOpen: boolean
  onClose: () => void
  initialCode?: string
  onCheckinSuccess?: () => void
}

export default function EventCheckinModal({
  isOpen,
  onClose,
  initialCode = '',
  onCheckinSuccess,
}: EventCheckinModalProps) {
  const [code, setCode] = useState(initialCode)
  const [mode, setMode] = useState<'input' | 'scan'>('input')
  const [checkinResult, setCheckinResult] = useState<{
    success: boolean
    message: string
    event?: any
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && mode === 'input') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, mode])

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCode(initialCode)
      setCheckinResult(null)
    }
  }, [isOpen, initialCode])

  const [checkIn, { loading: checkingIn }] = useMutation(CHECK_IN_WITH_CODE, {
    onCompleted: data => {
      setCheckinResult({
        success: data.checkInWithCode.success,
        message: data.checkInWithCode.message,
        event: data.checkInWithCode.event,
      })
      if (data.checkInWithCode.success) {
        onCheckinSuccess?.()
      }
    },
    onError: error => {
      setCheckinResult({
        success: false,
        message: error.message || 'Failed to check in. Please try again.',
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (normalizedCode.length !== 6) {
      setCheckinResult({
        success: false,
        message: 'Please enter a valid 6-character code.',
      })
      return
    }
    setCheckinResult(null)
    await checkIn({ variables: { code: normalizedCode } })
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)
    setCode(value)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-neon-purple/30 rounded-2xl w-full max-w-md mx-4 shadow-xl shadow-neon-purple/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <FiCheck className="text-neon-purple" />
            Event Check-In
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <FiX className="text-text-secondary" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {checkinResult?.success ? (
            /* Success State */
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <FiCheck className="text-green-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-text-primary">You're Checked In!</h3>
                <p className="text-text-secondary mt-2">{checkinResult.message}</p>
              </div>

              {checkinResult.event && (
                <div className="p-4 bg-white/5 rounded-xl space-y-3">
                  <h4 className="font-semibold text-text-primary text-lg">
                    {checkinResult.event.title}
                  </h4>
                  <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <FiMapPin size={14} />
                    <span>{checkinResult.event.location_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <FiCalendar size={14} />
                    <span>
                      {new Date(checkinResult.event.start_date_time).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 bg-neon-purple hover:bg-neon-purple/80 rounded-xl text-white font-medium transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* Input State */
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => setMode('input')}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    mode === 'input'
                      ? 'bg-neon-purple text-white'
                      : 'text-text-secondary hover:bg-white/5'
                  }`}
                >
                  <FiType size={16} />
                  Enter Code
                </button>
                <button
                  onClick={() => setMode('scan')}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    mode === 'scan'
                      ? 'bg-neon-purple text-white'
                      : 'text-text-secondary hover:bg-white/5'
                  }`}
                >
                  <FiCamera size={16} />
                  Scan QR
                </button>
              </div>

              {mode === 'input' ? (
                /* Code Input */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-text-secondary text-sm mb-2">
                      Enter 6-digit check-in code
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={code}
                      onChange={handleCodeChange}
                      className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-text-primary text-center text-3xl font-mono tracking-[0.5em] uppercase focus:outline-none focus:border-neon-purple transition-colors"
                      placeholder="______"
                      maxLength={6}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                    />
                  </div>

                  {checkinResult && !checkinResult.success && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                      <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
                      <p className="text-red-400 text-sm">{checkinResult.message}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={checkingIn || code.length !== 6}
                    className="w-full py-3 bg-neon-purple hover:bg-neon-purple/80 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {checkingIn ? (
                      <>
                        <FiLoader className="animate-spin" size={18} />
                        Checking In...
                      </>
                    ) : (
                      <>
                        <FiCheck size={18} />
                        Check In
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* QR Scanner Placeholder */
                <div className="space-y-4">
                  <div className="aspect-square bg-white/5 border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center">
                    <FiCamera className="text-text-secondary mb-3" size={48} />
                    <p className="text-text-secondary text-center px-4">
                      QR scanning is available in the mobile app.
                      <br />
                      Please use the code input instead.
                    </p>
                  </div>
                  <button
                    onClick={() => setMode('input')}
                    className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-xl text-text-primary font-medium transition-colors"
                  >
                    Switch to Code Input
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
