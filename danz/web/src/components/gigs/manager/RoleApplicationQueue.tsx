'use client'

import {
  type GetGigManagerDashboardQuery,
  useReviewGigRoleApplicationMutation,
} from '@/src/generated/graphql'
import { useState } from 'react'
import { FiCheck, FiExternalLink, FiStar, FiUser, FiX } from 'react-icons/fi'

type RoleApplicationType = NonNullable<
  NonNullable<GetGigManagerDashboardQuery['gigManagerDashboard']>['pendingRoleApplications']
>[number]

interface RoleApplicationQueueProps {
  applications: RoleApplicationType[]
  onRefresh: () => void
}

export default function RoleApplicationQueue({
  applications,
  onRefresh,
}: RoleApplicationQueueProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [reviewApplication] = useReviewGigRoleApplicationMutation()

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id)
      await reviewApplication({
        variables: { id, approved: true },
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
        variables: { id, approved: false, reason: rejectReason || undefined },
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

  const getTierLabel = (tier: number) => {
    const labels = ['Beginner', 'Intermediate', 'Skilled', 'Expert']
    return labels[tier - 1] || 'Unknown'
  }

  const getTierColor = (tier: number) => {
    const colors = ['text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400']
    return colors[tier - 1] || colors[0]
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
          <FiUser className="w-8 h-8 text-text-muted" />
        </div>
        <p className="text-text-muted">No pending role applications</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {applications.map(app => (
        <div key={app.id} className="p-4 bg-bg-tertiary rounded-xl">
          {/* User Info */}
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
                <p className="text-sm text-text-muted">@{app.user?.username}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-xl">{app.role?.icon || '💼'}</span>
                <span className="font-medium text-text-primary">{app.role?.name}</span>
              </div>
              <span className={`text-xs ${getTierColor(app.role?.tier || 1)}`}>
                {getTierLabel(app.role?.tier || 1)}
              </span>
            </div>
          </div>

          {/* Application Details */}
          {app.experienceNotes && (
            <div className="mb-4 p-3 bg-bg-secondary rounded-lg">
              <p className="text-xs text-text-muted mb-1">Experience Notes</p>
              <p className="text-sm text-text-primary">{app.experienceNotes}</p>
            </div>
          )}

          {app.portfolioUrls && app.portfolioUrls.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-text-muted mb-2">Portfolio Links</p>
              <div className="flex flex-wrap gap-2">
                {app.portfolioUrls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1 bg-bg-secondary hover:bg-bg-secondary/80 text-text-primary text-sm rounded-lg transition-colors"
                  >
                    <FiExternalLink size={12} />
                    Link {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {app.certifications && app.certifications.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-text-muted mb-2">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {app.certifications.map((cert, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full"
                  >
                    <FiStar size={10} />
                    {cert}
                  </span>
                ))}
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
