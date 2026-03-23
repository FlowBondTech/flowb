'use client'

import { type GetMyGigDashboardQuery, useApplyForGigMutation } from '@/src/generated/graphql'
import { useState } from 'react'
import { FiCalendar, FiChevronRight, FiClock, FiDollarSign, FiMapPin } from 'react-icons/fi'

type AvailableGig = NonNullable<
  NonNullable<GetMyGigDashboardQuery['myGigDashboard']>['availableGigs']
>[number]

interface AvailableGigsCardProps {
  gigs: AvailableGig[]
  onRefresh: () => void
}

export default function AvailableGigsCard({ gigs, onRefresh }: AvailableGigsCardProps) {
  const [applyingTo, setApplyingTo] = useState<string | null>(null)
  const [applyForGig] = useApplyForGigMutation()

  const handleApply = async (gigId: string) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusColor = (slotsFilled: number, slotsAvailable: number) => {
    const fillRate = slotsFilled / slotsAvailable
    if (fillRate >= 0.9) return 'text-red-400'
    if (fillRate >= 0.5) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <FiDollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Available Gigs</h3>
            <p className="text-sm text-text-muted">{gigs.length} opportunities</p>
          </div>
        </div>
      </div>

      {gigs.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
            <FiCalendar className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-muted mb-2">No available gigs</p>
          <p className="text-sm text-text-muted">
            Check back later or add more roles to see more opportunities
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {gigs.map(gig => (
            <div
              key={gig.id}
              className="p-4 bg-bg-tertiary rounded-xl hover:bg-bg-tertiary/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{gig.role?.icon || '💼'}</span>
                  <div>
                    <p className="font-medium text-text-primary">{gig.title}</p>
                    <p className="text-xs text-text-muted">{gig.role?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-400">{gig.danzReward} $DANZ</p>
                  {(gig.bonusDanz ?? 0) > 0 && (
                    <p className="text-xs text-yellow-400">+{gig.bonusDanz} bonus</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-text-muted mb-3 line-clamp-2">
                {gig.description || 'No description provided'}
              </p>

              <div className="flex flex-wrap gap-3 mb-3 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <FiCalendar size={12} />
                  <span>{formatDate(gig.event?.start_date_time)}</span>
                </div>
                {gig.event?.location_name && (
                  <div className="flex items-center gap-1">
                    <FiMapPin size={12} />
                    <span className="truncate max-w-[150px]">{gig.event.location_name}</span>
                  </div>
                )}
                {gig.timeCommitment && (
                  <div className="flex items-center gap-1">
                    <FiClock size={12} />
                    <span>{gig.timeCommitment}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs ${getStatusColor(gig.slotsFilled, gig.slotsAvailable)}`}
                  >
                    {gig.slotsAvailable - gig.slotsFilled} / {gig.slotsAvailable} spots left
                  </span>
                </div>

                {gig.myApplication ? (
                  <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg">
                    {gig.myApplication.status === 'PENDING' ? 'Applied' : gig.myApplication.status}
                  </span>
                ) : gig.canApply ? (
                  <button
                    onClick={() => handleApply(gig.id)}
                    disabled={applyingTo === gig.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-neon-purple hover:bg-neon-purple/80 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {applyingTo === gig.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        Apply <FiChevronRight size={12} />
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-xs text-text-muted">Not eligible</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
