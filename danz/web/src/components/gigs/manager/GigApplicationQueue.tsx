'use client'

import {
  type GetGigManagerDashboardQuery,
  useReviewGigApplicationMutation,
} from '@/src/generated/graphql'
import { useState } from 'react'
import { FiCalendar, FiCheck, FiDollarSign, FiMapPin, FiStar, FiX } from 'react-icons/fi'

type GigApplicationType = NonNullable<
  NonNullable<GetGigManagerDashboardQuery['gigManagerDashboard']>['pendingGigApplications']
>[number]

interface GigApplicationQueueProps {
  applications: GigApplicationType[]
  onRefresh: () => void
}

export default function GigApplicationQueue({ applications, onRefresh }: GigApplicationQueueProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [reviewApplication] = useReviewGigApplicationMutation()

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id)
      await reviewApplication({
        variables: {
          applicationId: id,
          input: { approved: true },
        },
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to approve:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id)
      await reviewApplication({
        variables: {
          applicationId: id,
          input: { approved: false, reason: rejectReason || undefined },
        },
      })
      setRejectingId(null)
      setRejectReason('')
      onRefresh()
    } catch (error) {
      console.error('Failed to reject:', error)
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

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
          <FiCalendar className="w-8 h-8 text-text-muted" />
        </div>
        <p className="text-text-muted">No pending gig applications</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {applications.map(app => (
        <div key={app.id} className="p-4 bg-bg-tertiary rounded-xl">
          {/* User & Gig Info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={app.user?.avatar_url || '/default-avatar.png'}
                alt={app.user?.display_name || 'User'}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-medium text-text-primary">
                  {app.user?.display_name || app.user?.username}
                </p>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span>@{app.user?.username}</span>
                  {app.userRole?.rating > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <FiStar size={12} />
                      {app.userRole.rating.toFixed(1)}
                    </span>
                  )}
                  {app.userRole?.totalGigsCompleted > 0 && (
                    <span className="text-green-400">{app.userRole.totalGigsCompleted} gigs</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Gig Details */}
          <div className="p-3 bg-bg-secondary rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{app.gig?.role?.icon || '💼'}</span>
              <span className="font-medium text-text-primary">{app.gig?.title}</span>
            </div>
            <p className="text-sm text-text-muted mb-2">{app.gig?.event?.title}</p>
            <div className="flex flex-wrap gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <FiCalendar size={12} />
                {app.gig?.event && formatDate(app.gig.event.start_date_time)}
              </span>
              {app.gig?.event?.location_name && (
                <span className="flex items-center gap-1">
                  <FiMapPin size={12} />
                  {app.gig.event.location_name}
                </span>
              )}
              <span className="flex items-center gap-1 text-green-400">
                <FiDollarSign size={12} />
                {app.gig?.danzReward} $DANZ
              </span>
            </div>
          </div>

          {/* Application Note */}
          {app.applicationNote && (
            <div className="mb-4 p-3 bg-bg-secondary rounded-lg">
              <p className="text-xs text-text-muted mb-1">Application Note</p>
              <p className="text-sm text-text-primary">{app.applicationNote}</p>
            </div>
          )}

          {/* AI Review (if available) */}
          {app.aiReviewScore !== null && app.aiReviewScore !== undefined && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400 mb-1">AI Assessment</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${app.aiReviewScore * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-blue-400">
                  {Math.round(app.aiReviewScore * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Reject Reason Input */}
          {rejectingId === app.id && (
            <div className="mb-4">
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Optional: Reason for rejection..."
                className="w-full h-20 px-3 py-2 bg-bg-secondary border border-red-500/30 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            {rejectingId === app.id ? (
              <>
                <button
                  onClick={() => {
                    setRejectingId(null)
                    setRejectReason('')
                  }}
                  className="px-4 py-2 text-text-muted hover:text-text-primary text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(app.id)}
                  disabled={processingId === app.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-500/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {processingId === app.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiX size={16} />
                  )}
                  Confirm Reject
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setRejectingId(app.id)}
                  disabled={processingId === app.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <FiX size={16} />
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(app.id)}
                  disabled={processingId === app.id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-500/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {processingId === app.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiCheck size={16} />
                  )}
                  Approve
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
