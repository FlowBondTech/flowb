'use client'

import type { GetMyGigDashboardQuery } from '@/src/generated/graphql'
import { FiCheckCircle, FiClock, FiDollarSign, FiStar, FiXCircle } from 'react-icons/fi'

type HistoryGigApplication = NonNullable<
  NonNullable<GetMyGigDashboardQuery['myGigDashboard']>['recentHistory']
>[number]

interface GigHistoryCardProps {
  applications: HistoryGigApplication[]
}

export default function GigHistoryCard({ applications }: GigHistoryCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
            <FiCheckCircle size={10} /> Completed
          </span>
        )
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
            <FiXCircle size={10} /> Rejected
          </span>
        )
      case 'WITHDRAWN':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">
            <FiXCircle size={10} /> Withdrawn
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
            <FiClock size={10} /> {status}
          </span>
        )
    }
  }

  const completedApps = applications.filter(a => a.status === 'COMPLETED')
  const totalEarned = completedApps.reduce((sum, app) => sum + (app.danzAwarded || 0), 0)

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <FiClock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Recent History</h3>
            <p className="text-sm text-text-muted">
              {completedApps.length} completed • {totalEarned.toLocaleString()} $DANZ earned
            </p>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
            <FiClock className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-muted">No gig history yet</p>
          <p className="text-sm text-text-muted mt-1">Your completed gigs will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {applications.map(app => {
            const gig = app.gig
            const event = gig?.event

            return (
              <div key={app.id} className="p-4 bg-bg-tertiary rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{gig?.role?.icon || '💼'}</span>
                    <div>
                      <p className="font-medium text-text-primary">{gig?.title}</p>
                      <p className="text-xs text-text-muted">{event?.title}</p>
                    </div>
                  </div>
                  {getStatusBadge(app.status)}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{event && formatDate(event.start_date_time)}</span>
                    {app.organizerRating && app.organizerRating > 0 && (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <FiStar size={12} />
                        {app.organizerRating}/5
                      </span>
                    )}
                  </div>

                  {app.status === 'COMPLETED' && (app.danzAwarded ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-green-400 font-medium">
                      <FiDollarSign size={14} />
                      <span>{app.danzAwarded} $DANZ</span>
                    </div>
                  )}
                </div>

                {app.organizerFeedback && (
                  <div className="mt-2 p-2 bg-bg-secondary rounded-lg">
                    <p className="text-xs text-text-muted italic">"{app.organizerFeedback}"</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
