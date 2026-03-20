'use client'

import {
  type GetGigManagerDashboardQuery,
  useCompleteGigAndAwardMutation,
  useReviewGigSubmissionMutation,
} from '@/src/generated/graphql'
import { useState } from 'react'
import {
  FiCheck,
  FiDollarSign,
  FiExternalLink,
  FiFileText,
  FiImage,
  FiLink,
  FiX,
} from 'react-icons/fi'

type SubmissionType = NonNullable<
  NonNullable<GetGigManagerDashboardQuery['gigManagerDashboard']>['pendingSubmissions']
>[number]

interface SubmissionQueueProps {
  submissions: SubmissionType[]
  onRefresh: () => void
}

export default function SubmissionQueue({ submissions, onRefresh }: SubmissionQueueProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [bonusAmount, setBonusAmount] = useState<Record<string, string>>({})

  const [reviewSubmission] = useReviewGigSubmissionMutation()
  const [completeAndAward] = useCompleteGigAndAwardMutation()

  const handleApprove = async (submission: SubmissionType) => {
    try {
      setProcessingId(submission.id)

      // First approve the submission
      await reviewSubmission({
        variables: {
          submissionId: submission.id,
          input: { approved: true },
        },
      })

      // Then complete and award
      const bonus = bonusAmount[submission.id]
      await completeAndAward({
        variables: {
          applicationId: submission.application?.id,
          bonusDanz: bonus ? Number.parseFloat(bonus) : undefined,
        },
      })

      onRefresh()
    } catch (error) {
      console.error('Failed to approve:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (submissionId: string) => {
    try {
      setProcessingId(submissionId)
      await reviewSubmission({
        variables: {
          submissionId,
          input: { approved: false, notes: rejectNotes || undefined },
        },
      })
      setRejectingId(null)
      setRejectNotes('')
      onRefresh()
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const getSubmissionIcon = (type: string) => {
    switch (type) {
      case 'PHOTO':
        return <FiImage className="w-5 h-5" />
      case 'VIDEO':
        return <FiImage className="w-5 h-5" />
      case 'LINK':
        return <FiLink className="w-5 h-5" />
      default:
        return <FiFileText className="w-5 h-5" />
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
          <FiFileText className="w-8 h-8 text-text-muted" />
        </div>
        <p className="text-text-muted">No pending submissions to review</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {submissions.map(submission => (
        <div key={submission.id} className="p-4 bg-bg-tertiary rounded-xl">
          {/* User & Gig Info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={submission.application?.user?.avatar_url || '/default-avatar.png'}
                alt={submission.application?.user?.display_name || 'User'}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-medium text-text-primary">
                  {submission.application?.user?.display_name ||
                    submission.application?.user?.username}
                </p>
                <p className="text-sm text-text-muted">{submission.application?.gig?.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-text-muted">
              {getSubmissionIcon(submission.submissionType)}
              <span className="text-sm">{submission.submissionType}</span>
            </div>
          </div>

          {/* Submission Content */}
          <div className="mb-4 p-3 bg-bg-secondary rounded-lg">
            {submission.contentUrl && (
              <a
                href={submission.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-neon-purple hover:underline mb-2"
              >
                <FiExternalLink size={14} />
                View Submission
              </a>
            )}
            {submission.contentText && (
              <p className="text-sm text-text-primary whitespace-pre-wrap">
                {submission.contentText}
              </p>
            )}
          </div>

          {/* AI Review (if available) */}
          {submission.aiReviewScore !== null && submission.aiReviewScore !== undefined && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-blue-400">AI Assessment</p>
                <span
                  className={`text-sm font-medium ${
                    submission.aiReviewStatus === 'APPROVED'
                      ? 'text-green-400'
                      : submission.aiReviewStatus === 'REJECTED'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                  }`}
                >
                  {submission.aiReviewStatus}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      submission.aiReviewScore >= 0.8
                        ? 'bg-green-500'
                        : submission.aiReviewScore >= 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${submission.aiReviewScore * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {Math.round(submission.aiReviewScore * 100)}%
                </span>
              </div>
              {submission.aiReviewNotes && (
                <p className="text-xs text-text-muted mt-2">
                  {typeof submission.aiReviewNotes === 'string'
                    ? submission.aiReviewNotes
                    : JSON.stringify(submission.aiReviewNotes)}
                </p>
              )}
            </div>
          )}

          {/* Bonus Input */}
          {!rejectingId && (
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-text-muted">Bonus $DANZ:</label>
              <input
                type="number"
                min="0"
                value={bonusAmount[submission.id] || ''}
                onChange={e =>
                  setBonusAmount(prev => ({
                    ...prev,
                    [submission.id]: e.target.value,
                  }))
                }
                placeholder="0"
                className="w-24 px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-neon-purple/50"
              />
            </div>
          )}

          {/* Reject Reason Input */}
          {rejectingId === submission.id && (
            <div className="mb-4">
              <textarea
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                placeholder="Required: Explain what needs to be improved..."
                className="w-full h-20 px-3 py-2 bg-bg-secondary border border-red-500/30 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
              />
            </div>
          )}

          {/* Reward Preview */}
          {!rejectingId && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              <FiDollarSign className="text-green-400" />
              <span className="text-text-muted">Total reward:</span>
              <span className="font-medium text-green-400">
                {(submission.application?.gig?.danzReward || 0) +
                  (bonusAmount[submission.id]
                    ? Number.parseFloat(bonusAmount[submission.id])
                    : 0)}{' '}
                $DANZ
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            {rejectingId === submission.id ? (
              <>
                <button
                  onClick={() => {
                    setRejectingId(null)
                    setRejectNotes('')
                  }}
                  className="px-4 py-2 text-text-muted hover:text-text-primary text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(submission.id)}
                  disabled={processingId === submission.id || !rejectNotes.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-500/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {processingId === submission.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiX size={16} />
                  )}
                  Request Revision
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setRejectingId(submission.id)}
                  disabled={processingId === submission.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <FiX size={16} />
                  Request Revision
                </button>
                <button
                  onClick={() => handleApprove(submission)}
                  disabled={processingId === submission.id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-500/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {processingId === submission.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiCheck size={16} />
                  )}
                  Approve & Award
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
