'use client'

import {
  type GetMyGigDashboardQuery,
  useCheckInToGigMutation,
  useCheckOutFromGigMutation,
} from '@/src/generated/graphql'
import { useState } from 'react'
import { FiCalendar, FiCheckCircle, FiClock, FiMapPin, FiPlay } from 'react-icons/fi'

type ActiveGigApplication = NonNullable<
  NonNullable<GetMyGigDashboardQuery['myGigDashboard']>['activeGigs']
>[number]

interface ActiveGigsCardProps {
  applications: ActiveGigApplication[]
  onRefresh: () => void
}

export default function ActiveGigsCard({ applications, onRefresh }: ActiveGigsCardProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [checkInToGig] = useCheckInToGigMutation()
  const [checkOutFromGig] = useCheckOutFromGigMutation()

  const handleCheckIn = async (applicationId: string) => {
    try {
      setProcessingId(applicationId)
      await checkInToGig({
        variables: { applicationId },
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to check in:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleCheckOut = async (applicationId: string) => {
    try {
      setProcessingId(applicationId)
      await checkOutFromGig({
        variables: { applicationId },
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to check out:', error)
    } finally {
      setProcessingId(null)
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const isEventStartingSoon = (startDate: string) => {
    const start = new Date(startDate)
    const now = new Date()
    const hoursDiff = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursDiff <= 2 && hoursDiff >= -4 // 2 hours before to 4 hours after
  }

  const isEventActive = (startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)
    return now >= start && now <= end
  }

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
          <FiPlay className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Active Gigs</h3>
          <p className="text-sm text-text-muted">{applications.length} approved gigs</p>
        </div>
      </div>

      <div className="space-y-3">
        {applications.map(app => {
          const gig = app.gig
          const event = gig?.event
          const canCheckIn = !app.checkInTime && event && isEventStartingSoon(event.start_date_time)
          const canCheckOut =
            app.checkInTime &&
            !app.checkOutTime &&
            event &&
            isEventActive(event.start_date_time, event.end_date_time)
          const isCheckedIn = !!app.checkInTime && !app.checkOutTime

          return (
            <div
              key={app.id}
              className={`p-4 rounded-xl ${
                isCheckedIn ? 'bg-green-500/10 border border-green-500/20' : 'bg-bg-tertiary'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{gig?.role?.icon || '💼'}</span>
                  <div>
                    <p className="font-medium text-text-primary">{gig?.title}</p>
                    <p className="text-xs text-text-muted">{event?.title}</p>
                  </div>
                </div>
                {isCheckedIn && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                    <FiCheckCircle size={10} /> Checked In
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mb-3 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <FiCalendar size={12} />
                  <span>{event && formatDate(event.start_date_time)}</span>
                </div>
                {event?.location_name && (
                  <div className="flex items-center gap-1">
                    <FiMapPin size={12} />
                    <span className="truncate max-w-[150px]">{event.location_name}</span>
                  </div>
                )}
                {app.checkInTime && (
                  <div className="flex items-center gap-1 text-green-400">
                    <FiClock size={12} />
                    <span>In: {formatTime(app.checkInTime)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-400">{gig?.danzReward} $DANZ</p>
                </div>

                <div className="flex gap-2">
                  {canCheckIn && (
                    <button
                      onClick={() => handleCheckIn(app.id)}
                      disabled={processingId === app.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-500/80 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {processingId === app.id ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiCheckCircle size={12} />
                      )}
                      Check In
                    </button>
                  )}
                  {canCheckOut && (
                    <button
                      onClick={() => handleCheckOut(app.id)}
                      disabled={processingId === app.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-500/80 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {processingId === app.id ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiClock size={12} />
                      )}
                      Check Out
                    </button>
                  )}
                  {!canCheckIn && !canCheckOut && !app.checkOutTime && (
                    <span className="text-xs text-text-muted">
                      {event && new Date(event.start_date_time) > new Date()
                        ? 'Upcoming'
                        : 'Awaiting event'}
                    </span>
                  )}
                  {app.checkOutTime && (
                    <span className="text-xs text-text-muted">Completed - Awaiting Review</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
