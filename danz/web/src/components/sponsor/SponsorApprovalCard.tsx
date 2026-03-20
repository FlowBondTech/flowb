'use client'

import type { SponsorTier } from '@/src/generated/graphql'
import { useState } from 'react'
import {
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiExternalLink,
  FiMessageCircle,
  FiX,
} from 'react-icons/fi'
import SponsorBadge from './SponsorBadge'

interface SponsorData {
  id: string
  companyName: string
  logoUrl?: string | null
  tier: SponsorTier
  categories: string[]
  totalEventsSponsored: number
  isVerified?: boolean
}

interface SponsorshipRequest {
  id: string
  flowAmount: number
  visibility: 'VISIBLE' | 'ANONYMOUS' | 'FEATURED'
  sponsorMessage?: string | null
  allocationConfig?: {
    paidWorkersPercent: number
    volunteerRewardsPercent: number
    platformFeePercent: number
  } | null
}

interface ApprovalData {
  id: string
  sponsor: SponsorData
  sponsorship: SponsorshipRequest
  expiresAt: string
  createdAt: string
}

interface SponsorApprovalCardProps {
  approval: ApprovalData
  onApprove: (approvalId: string) => Promise<void>
  onReject: (approvalId: string, reason?: string) => Promise<void>
  onViewSponsor?: (sponsorId: string) => void
  variant?: 'default' | 'compact'
}

const VISIBILITY_LABELS: Record<string, string> = {
  VISIBLE: 'Visible',
  ANONYMOUS: 'Anonymous',
  FEATURED: 'Featured',
}

const CATEGORY_LABELS: Record<string, string> = {
  apparel: 'Dance Apparel',
  music: 'Music & Audio',
  wellness: 'Health & Wellness',
  tech: 'Technology',
  venues: 'Venues',
  local: 'Local Business',
  media: 'Media',
  education: 'Education',
  lifestyle: 'Lifestyle',
  corporate: 'Corporate',
}

export default function SponsorApprovalCard({
  approval,
  onApprove,
  onReject,
  onViewSponsor,
  variant = 'default',
}: SponsorApprovalCardProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { sponsor, sponsorship } = approval

  const createdAt = new Date(approval.createdAt)
  const expiresAt = new Date(approval.expiresAt)
  const now = new Date()
  const hoursRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
  )
  const isExpiringSoon = hoursRemaining <= 24

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await onApprove(approval.id)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await onReject(approval.id, rejectReason || undefined)
    } finally {
      setIsRejecting(false)
      setShowRejectForm(false)
      setRejectReason('')
    }
  }

  if (variant === 'compact') {
    return (
      <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          {sponsor.logoUrl ? (
            <img
              src={sponsor.logoUrl}
              alt={sponsor.companyName}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center">
              <span className="text-xl">🏢</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-text-primary truncate">{sponsor.companyName}</p>
              {sponsor.isVerified && <FiCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2">
              <SponsorBadge tier={sponsor.tier} size="sm" />
              <span className="text-green-400 font-medium">
                ${sponsorship.flowAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 transition-colors disabled:opacity-50"
            >
              <FiCheck className="w-5 h-5" />
            </button>
            <button
              onClick={() => onReject(approval.id)}
              disabled={isApproving || isRejecting}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors disabled:opacity-50"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expiry Warning */}
        {isExpiringSoon && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-yellow-400">
            <FiAlertCircle className="w-3.5 h-3.5" />
            <span>
              Expires in {hoursRemaining} hour{hoursRemaining !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-start gap-4">
          {/* Logo */}
          {sponsor.logoUrl ? (
            <img
              src={sponsor.logoUrl}
              alt={sponsor.companyName}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center">
              <span className="text-3xl">🏢</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-text-primary truncate">
                {sponsor.companyName}
              </h3>
              {sponsor.isVerified && (
                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                  <FiCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <SponsorBadge tier={sponsor.tier} size="sm" />
              <span className="text-sm text-text-muted">•</span>
              <span className="text-sm text-text-muted">
                {sponsor.totalEventsSponsored} events sponsored
              </span>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1">
              {sponsor.categories.slice(0, 3).map(cat => (
                <span
                  key={cat}
                  className="px-2 py-0.5 bg-white/10 text-text-muted text-xs rounded-full"
                >
                  {CATEGORY_LABELS[cat] || cat}
                </span>
              ))}
              {sponsor.categories.length > 3 && (
                <span className="px-2 py-0.5 bg-white/10 text-text-muted text-xs rounded-full">
                  +{sponsor.categories.length - 3} more
                </span>
              )}
            </div>
          </div>

          {onViewSponsor && (
            <button
              onClick={() => onViewSponsor(sponsor.id)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-text-muted hover:text-text-primary"
            >
              <FiExternalLink className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Sponsorship Details */}
      <div className="p-5 border-b border-white/10">
        <h4 className="text-sm font-medium text-text-muted mb-3">Sponsorship Offer</h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FiDollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-400">
                ${sponsorship.flowAmount.toLocaleString()}
              </p>
              <p className="text-xs text-text-muted">FLOW Amount</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FiClock className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-text-primary font-medium">
                {VISIBILITY_LABELS[sponsorship.visibility]}
              </p>
              <p className="text-xs text-text-muted">Visibility</p>
            </div>
          </div>
        </div>

        {/* Allocation */}
        {sponsorship.allocationConfig && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-text-muted mb-2">Proposed Allocation</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-blue-400">
                Workers: {sponsorship.allocationConfig.paidWorkersPercent}%
              </span>
              <span className="text-pink-400">
                Volunteers: {sponsorship.allocationConfig.volunteerRewardsPercent}%
              </span>
              <span className="text-gray-400">
                Platform: {sponsorship.allocationConfig.platformFeePercent}%
              </span>
            </div>
          </div>
        )}

        {/* Message */}
        {sponsorship.sponsorMessage && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <FiMessageCircle className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-muted">Message from Sponsor</span>
            </div>
            <p className="text-text-primary text-sm italic bg-white/5 p-3 rounded-lg">
              "{sponsorship.sponsorMessage}"
            </p>
          </div>
        )}
      </div>

      {/* Expiry Notice */}
      <div className={`px-5 py-3 ${isExpiringSoon ? 'bg-yellow-500/10' : 'bg-white/5'}`}>
        <div className="flex items-center gap-2 text-sm">
          {isExpiringSoon ? (
            <>
              <FiAlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium">
                Expires in {hoursRemaining} hour{hoursRemaining !== 1 ? 's' : ''}
              </span>
            </>
          ) : (
            <>
              <FiClock className="w-4 h-4 text-text-muted" />
              <span className="text-text-muted">
                Received {createdAt.toLocaleDateString()} • Expires {expiresAt.toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {!showRejectForm ? (
        <div className="p-5 flex gap-3">
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={isApproving}
            className="flex-1 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium transition-colors disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-400 hover:opacity-90 rounded-xl text-white font-medium transition-opacity disabled:opacity-50"
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </button>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-2">
              Reason for declining (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Let the sponsor know why you're declining..."
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:border-red-500/50 focus:outline-none resize-none text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowRejectForm(false)
                setRejectReason('')
              }}
              disabled={isRejecting}
              className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-text-primary font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isRejecting}
              className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 rounded-xl text-white font-medium transition-colors disabled:opacity-50"
            >
              {isRejecting ? 'Declining...' : 'Confirm Decline'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
