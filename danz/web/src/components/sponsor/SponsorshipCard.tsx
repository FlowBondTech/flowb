'use client'

import { SponsorshipStatus, SponsorshipVisibility } from '@/src/generated/graphql'
import {
  FiCalendar,
  FiDollarSign,
  FiEye,
  FiEyeOff,
  FiMapPin,
  FiMoreVertical,
  FiStar,
} from 'react-icons/fi'

interface SponsorshipData {
  id: string
  flowAmount: number
  flowAllocated?: number
  flowDistributed?: number
  status: SponsorshipStatus
  visibility: SponsorshipVisibility
  sponsorMessage?: string | null
  createdAt: string
  event: {
    id: string
    title: string
    imageUrl?: string | null
    location?: string | null
    startDateTime: string
  }
  allocationConfig?: {
    paidWorkersPercent: number
    volunteerRewardsPercent: number
    platformFeePercent: number
  } | null
}

interface SponsorshipCardProps {
  sponsorship: SponsorshipData
  variant?: 'default' | 'compact' | 'detailed'
  onViewEvent?: () => void
  onManage?: () => void
}

const STATUS_CONFIG: Record<SponsorshipStatus, { label: string; color: string; bgColor: string }> =
  {
    [SponsorshipStatus.Pending]: {
      label: 'Pending',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    [SponsorshipStatus.Active]: {
      label: 'Active',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    [SponsorshipStatus.Completed]: {
      label: 'Completed',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    [SponsorshipStatus.Cancelled]: {
      label: 'Cancelled',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
    },
    [SponsorshipStatus.Refunded]: {
      label: 'Refunded',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
  }

const VISIBILITY_CONFIG: Record<SponsorshipVisibility, { label: string; icon: typeof FiEye }> = {
  [SponsorshipVisibility.Visible]: { label: 'Visible', icon: FiEye },
  [SponsorshipVisibility.Anonymous]: { label: 'Anonymous', icon: FiEyeOff },
  [SponsorshipVisibility.Featured]: { label: 'Featured', icon: FiStar },
}

export default function SponsorshipCard({
  sponsorship,
  variant = 'default',
  onViewEvent,
  onManage,
}: SponsorshipCardProps) {
  const statusConfig = STATUS_CONFIG[sponsorship.status]
  const visibilityConfig = VISIBILITY_CONFIG[sponsorship.visibility]
  const VisibilityIcon = visibilityConfig.icon

  const formattedDate = new Date(sponsorship.event.startDateTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const distributionPercent =
    sponsorship.flowAmount > 0
      ? ((sponsorship.flowDistributed || 0) / sponsorship.flowAmount) * 100
      : 0

  if (variant === 'compact') {
    return (
      <div
        className="flex items-center gap-4 p-4 bg-bg-tertiary rounded-xl hover:bg-bg-tertiary/80 transition-colors cursor-pointer"
        onClick={onViewEvent}
      >
        {/* Event Image */}
        {sponsorship.event.imageUrl ? (
          <img
            src={sponsorship.event.imageUrl}
            alt={sponsorship.event.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center">
            <span className="text-lg">🎭</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary truncate">{sponsorship.event.title}</p>
          <p className="text-sm text-text-muted">{formattedDate}</p>
        </div>

        {/* Amount & Status */}
        <div className="text-right">
          <p className="font-bold text-green-400">${sponsorship.flowAmount.toLocaleString()}</p>
          <span className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</span>
        </div>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
        {/* Header with Event Image */}
        <div className="relative h-32 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20">
          {sponsorship.event.imageUrl && (
            <img
              src={sponsorship.event.imageUrl}
              alt={sponsorship.event.title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Status Badge */}
          <div
            className={`absolute top-3 right-3 px-2.5 py-1 rounded-full ${statusConfig.bgColor}`}
          >
            <span className={`text-xs font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Event Title */}
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-semibold text-white truncate">{sponsorship.event.title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Event Details */}
          <div className="flex items-center gap-4 mb-4 text-sm text-text-muted">
            <div className="flex items-center gap-1">
              <FiCalendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            {sponsorship.event.location && (
              <div className="flex items-center gap-1">
                <FiMapPin className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{sponsorship.event.location}</span>
              </div>
            )}
          </div>

          {/* Sponsorship Amount */}
          <div className="p-4 bg-bg-tertiary rounded-xl mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiDollarSign className="w-5 h-5 text-green-400" />
                <span className="text-sm text-text-muted">Your Contribution</span>
              </div>
              <span className="text-xl font-bold text-green-400">
                ${sponsorship.flowAmount.toLocaleString()}
              </span>
            </div>

            {/* Distribution Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-text-muted">Distributed</span>
                <span className="text-text-primary">
                  ${(sponsorship.flowDistributed || 0).toLocaleString()} / $
                  {sponsorship.flowAmount.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${distributionPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Allocation Breakdown */}
          {sponsorship.allocationConfig && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-center">
                <p className="text-lg font-bold text-blue-400">
                  {sponsorship.allocationConfig.paidWorkersPercent}%
                </p>
                <p className="text-xs text-text-muted">Workers</p>
              </div>
              <div className="p-2 bg-pink-500/10 rounded-lg text-center">
                <p className="text-lg font-bold text-pink-400">
                  {sponsorship.allocationConfig.volunteerRewardsPercent}%
                </p>
                <p className="text-xs text-text-muted">Volunteers</p>
              </div>
              <div className="p-2 bg-gray-500/10 rounded-lg text-center">
                <p className="text-lg font-bold text-gray-400">
                  {sponsorship.allocationConfig.platformFeePercent}%
                </p>
                <p className="text-xs text-text-muted">Platform</p>
              </div>
            </div>
          )}

          {/* Visibility */}
          <div className="flex items-center gap-2 mb-4 text-sm text-text-muted">
            <VisibilityIcon className="w-4 h-4" />
            <span>{visibilityConfig.label} sponsorship</span>
          </div>

          {/* Message */}
          {sponsorship.sponsorMessage && (
            <div className="p-3 bg-white/5 rounded-lg mb-4">
              <p className="text-sm text-text-muted italic">"{sponsorship.sponsorMessage}"</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onViewEvent}
              className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-text-primary font-medium text-sm transition-colors"
            >
              View Event
            </button>
            {onManage && (
              <button
                onClick={onManage}
                className="py-2.5 px-4 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-lg text-neon-purple transition-colors"
              >
                <FiMoreVertical className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
      <div className="flex">
        {/* Event Image */}
        <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20">
          {sponsorship.event.imageUrl ? (
            <img
              src={sponsorship.event.imageUrl}
              alt={sponsorship.event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl">🎭</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h3 className="font-medium text-text-primary truncate">{sponsorship.event.title}</h3>
              <p className="text-sm text-text-muted">{formattedDate}</p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-green-400">
              ${sponsorship.flowAmount.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 text-text-muted text-xs">
              <VisibilityIcon className="w-3.5 h-3.5" />
              <span>{visibilityConfig.label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
