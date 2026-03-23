'use client'

import { type EventGig, useApplyForGigMutation } from '@/src/generated/graphql'
import { useState } from 'react'
import { FiClock, FiDollarSign, FiMapPin, FiSend, FiX } from 'react-icons/fi'

interface GigApplicationFormProps {
  gig: EventGig
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function GigApplicationForm({
  gig,
  isOpen,
  onClose,
  onSuccess,
}: GigApplicationFormProps) {
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [applyForGig] = useApplyForGigMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      await applyForGig({
        variables: {
          gigId: gig.id,
          note: note || undefined,
        },
      })
      setNote('')
      onSuccess()
    } catch (error) {
      console.error('Failed to apply for gig:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg m-4 bg-bg-secondary border border-neon-purple/20 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-text-primary">Apply for Gig</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <FiX className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Gig Details */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{gig.role?.icon || '💼'}</span>
            <div>
              <h3 className="font-semibold text-text-primary">{gig.title}</h3>
              <p className="text-sm text-text-muted">{gig.role?.name}</p>
            </div>
          </div>

          <p className="text-sm text-text-muted mb-4">{gig.description}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <FiDollarSign className="w-4 h-4 text-green-400" />
              <span>
                {gig.danzReward} $DANZ
                {(gig.bonusDanz ?? 0) > 0 && (
                  <span className="text-yellow-400"> +{gig.bonusDanz} bonus</span>
                )}
              </span>
            </div>
            {gig.timeCommitment && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <FiClock className="w-4 h-4" />
                <span>{gig.timeCommitment}</span>
              </div>
            )}
            {gig.event?.location_name && (
              <div className="flex items-center gap-2 text-sm text-text-muted col-span-2">
                <FiMapPin className="w-4 h-4" />
                <span>{gig.event.location_name}</span>
              </div>
            )}
          </div>

          {gig.event && (
            <div className="mt-4 p-3 bg-bg-tertiary rounded-lg">
              <p className="text-sm font-medium text-text-primary">{gig.event.title}</p>
              <p className="text-xs text-text-muted mt-1">
                {formatDate(gig.event.start_date_time)}
              </p>
            </div>
          )}

          {gig.specificRequirements && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-400">Requirements</p>
              <p className="text-sm text-text-muted mt-1">{gig.specificRequirements}</p>
            </div>
          )}
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Application Note (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Tell the organizer why you're a great fit for this gig..."
              className="w-full h-24 px-4 py-3 bg-bg-tertiary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {gig.slotsAvailable - gig.slotsFilled} spots remaining
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <FiSend size={16} />
                  Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
