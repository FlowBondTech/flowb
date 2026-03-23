'use client'

import { type EventGig, useApplyForGigMutation } from '@/src/generated/graphql'
import { useState } from 'react'
import { FiCheck, FiChevronRight, FiClock, FiDollarSign, FiUsers } from 'react-icons/fi'
import GigApplicationForm from '../GigApplicationForm'

interface EventGigsListProps {
  gigs: EventGig[]
  onRefresh: () => void
}

export default function EventGigsList({ gigs, onRefresh }: EventGigsListProps) {
  const [selectedGig, setSelectedGig] = useState<EventGig | null>(null)
  const [applyingTo, setApplyingTo] = useState<string | null>(null)

  const [applyForGig] = useApplyForGigMutation()

  const handleQuickApply = async (gigId: string) => {
    try {
      setApplyingTo(gigId)
      await applyForGig({
        variables: { gigId },
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to apply for gig:', error)
    } finally {
      setApplyingTo(null)
    }
  }

  const getTierBadge = (tier: number) => {
    const config: Record<number, { label: string; color: string }> = {
      1: { label: 'Beginner', color: 'bg-gray-500/20 text-gray-400' },
      2: { label: 'Intermediate', color: 'bg-blue-500/20 text-blue-400' },
      3: { label: 'Skilled', color: 'bg-purple-500/20 text-purple-400' },
      4: { label: 'Expert', color: 'bg-yellow-500/20 text-yellow-400' },
    }
    const { label, color } = config[tier] || config[1]
    return <span className={`px-2 py-0.5 text-xs rounded-full ${color}`}>{label}</span>
  }

  if (gigs.length === 0) {
    return (
      <div className="text-center py-12 bg-bg-secondary rounded-2xl">
        <p className="text-text-muted">No gig opportunities for this event</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {gigs.map(gig => {
          const spotsLeft = gig.slotsAvailable - gig.slotsFilled
          const isFull = spotsLeft <= 0
          const hasApplied = !!gig.myApplication

          return (
            <div
              key={gig.id}
              className={`p-6 rounded-2xl border transition-all ${
                gig.canApply && !hasApplied
                  ? 'bg-bg-secondary border-neon-purple/20 hover:border-neon-purple/40'
                  : 'bg-bg-secondary border-white/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{gig.role?.icon || '💼'}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text-primary">{gig.title}</h3>
                    {getTierBadge(gig.role?.tier || 1)}
                  </div>

                  <p className="text-sm text-text-muted mb-3">
                    {gig.description || gig.role?.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1 text-green-400">
                      <FiDollarSign size={14} />
                      <span className="font-medium">{gig.danzReward} $DANZ</span>
                      {(gig.bonusDanz ?? 0) > 0 && (
                        <span className="text-yellow-400">+{gig.bonusDanz}</span>
                      )}
                    </div>

                    {gig.timeCommitment && (
                      <div className="flex items-center gap-1 text-text-muted">
                        <FiClock size={14} />
                        <span>{gig.timeCommitment}</span>
                      </div>
                    )}

                    <div
                      className={`flex items-center gap-1 ${
                        isFull
                          ? 'text-red-400'
                          : spotsLeft <= 2
                            ? 'text-yellow-400'
                            : 'text-text-muted'
                      }`}
                    >
                      <FiUsers size={14} />
                      <span>
                        {spotsLeft} / {gig.slotsAvailable} spots
                      </span>
                    </div>
                  </div>

                  {gig.specificRequirements && (
                    <p className="mt-3 text-xs text-text-muted bg-bg-tertiary p-2 rounded-lg">
                      <strong>Requirements:</strong> {gig.specificRequirements}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {hasApplied ? (
                    <span
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${
                        gig.myApplication?.status === 'APPROVED'
                          ? 'bg-green-500/20 text-green-400'
                          : gig.myApplication?.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {gig.myApplication?.status === 'APPROVED' ? (
                        <>
                          <FiCheck size={14} /> Approved
                        </>
                      ) : gig.myApplication?.status === 'REJECTED' ? (
                        'Rejected'
                      ) : (
                        'Applied'
                      )}
                    </span>
                  ) : gig.canApply && !isFull ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQuickApply(gig.id)}
                        disabled={applyingTo === gig.id}
                        className="flex items-center gap-1 px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {applyingTo === gig.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            Apply <FiChevronRight size={14} />
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedGig(gig)}
                        className="px-3 py-2 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-muted rounded-lg text-sm transition-colors"
                      >
                        + Note
                      </button>
                    </div>
                  ) : isFull ? (
                    <span className="text-sm text-red-400">Full</span>
                  ) : (
                    <span className="text-sm text-text-muted">Not eligible</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedGig && (
        <GigApplicationForm
          gig={selectedGig}
          isOpen={!!selectedGig}
          onClose={() => setSelectedGig(null)}
          onSuccess={() => {
            setSelectedGig(null)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
