'use client'

import { FiCalendar, FiPause, FiPlay, FiSettings, FiTrendingUp, FiZap } from 'react-icons/fi'

type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired'
type PlanType = 'monthly' | 'yearly'
type SponsorshipMode = 'category_subscription' | 'verified_only' | 'hybrid'

interface SubscriptionData {
  id: string
  planType: PlanType
  sponsorshipMode: SponsorshipMode
  budgetAmount: number
  budgetSpent: number
  budgetRemaining: number
  targetCategories: string[]
  verifiedEventsOnly: boolean
  autoApprove: boolean
  maxPerEvent: number
  status: SubscriptionStatus
  nextBillingDate: string
  discountPercent: number
  eventsSponsored: number
  createdAt: string
}

interface SubscriptionSummaryProps {
  subscription: SubscriptionData
  variant?: 'default' | 'compact' | 'detailed'
  onPause?: () => void
  onResume?: () => void
  onManage?: () => void
}

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bgColor: string }> =
  {
    active: { label: 'Active', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    paused: { label: 'Paused', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    cancelled: { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/10' },
    expired: { label: 'Expired', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  }

const MODE_LABELS: Record<SponsorshipMode, string> = {
  category_subscription: 'Category Subscription',
  verified_only: 'Verified Events Only',
  hybrid: 'Hybrid',
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

export default function SubscriptionSummary({
  subscription,
  variant = 'default',
  onPause,
  onResume,
  onManage,
}: SubscriptionSummaryProps) {
  const statusConfig = STATUS_CONFIG[subscription.status]
  const budgetUsedPercent =
    subscription.budgetAmount > 0 ? (subscription.budgetSpent / subscription.budgetAmount) * 100 : 0

  const formattedNextBilling = new Date(subscription.nextBillingDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (variant === 'compact') {
    return (
      <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiZap className="w-5 h-5 text-neon-purple" />
            <span className="font-semibold text-text-primary capitalize">
              {subscription.planType} Subscription
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Budget Used</span>
          <span className="text-text-primary font-medium">
            ${subscription.budgetSpent.toLocaleString()} / $
            {subscription.budgetAmount.toLocaleString()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-purple to-neon-pink transition-all duration-500"
            style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
          />
        </div>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center">
                <FiZap className="w-6 h-6 text-neon-purple" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary capitalize">
                  {subscription.planType} Subscription
                </h3>
                <p className="text-sm text-text-muted">
                  {MODE_LABELS[subscription.sponsorshipMode]}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Budget Section */}
        <div className="p-5 border-b border-white/10">
          <h4 className="text-sm font-medium text-text-muted mb-3">Budget Overview</h4>

          <div className="flex items-center justify-between mb-2">
            <span className="text-text-primary">
              ${subscription.budgetSpent.toLocaleString()} spent
            </span>
            <span className="text-text-muted">
              ${subscription.budgetRemaining.toLocaleString()} remaining
            </span>
          </div>

          <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                budgetUsedPercent >= 90
                  ? 'bg-red-500'
                  : budgetUsedPercent >= 70
                    ? 'bg-yellow-500'
                    : 'bg-gradient-to-r from-neon-purple to-neon-pink'
              }`}
              style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-white/5 rounded-lg">
              <p className="text-lg font-bold text-neon-purple">
                ${subscription.budgetAmount.toLocaleString()}
              </p>
              <p className="text-xs text-text-muted">Total Budget</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg">
              <p className="text-lg font-bold text-text-primary">${subscription.maxPerEvent}</p>
              <p className="text-xs text-text-muted">Max/Event</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg">
              <p className="text-lg font-bold text-green-400">{subscription.discountPercent}%</p>
              <p className="text-xs text-text-muted">Discount</p>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-5 border-b border-white/10">
          <h4 className="text-sm font-medium text-text-muted mb-3">Subscription Details</h4>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Events Sponsored</span>
              <span className="text-text-primary font-medium">{subscription.eventsSponsored}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Verified Only</span>
              <span className="text-text-primary font-medium">
                {subscription.verifiedEventsOnly ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Auto-Approve</span>
              <span className="text-text-primary font-medium">
                {subscription.autoApprove ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Next Billing</span>
              <span className="text-text-primary font-medium">{formattedNextBilling}</span>
            </div>
          </div>

          {/* Categories */}
          {subscription.targetCategories.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-text-muted mb-2">Target Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {subscription.targetCategories.map(cat => (
                  <span
                    key={cat}
                    className="px-2 py-1 bg-white/10 text-text-primary text-xs rounded-full"
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 flex gap-3">
          {subscription.status === 'active' && onPause && (
            <button
              onClick={onPause}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-text-primary font-medium text-sm transition-colors"
            >
              <FiPause className="w-4 h-4" />
              Pause
            </button>
          )}
          {subscription.status === 'paused' && onResume && (
            <button
              onClick={onResume}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 font-medium text-sm transition-colors"
            >
              <FiPlay className="w-4 h-4" />
              Resume
            </button>
          )}
          {onManage && (
            <button
              onClick={onManage}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-lg text-neon-purple font-medium text-sm transition-colors"
            >
              <FiSettings className="w-4 h-4" />
              Manage
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className="bg-bg-secondary border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center">
            <FiZap className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary capitalize">
              {subscription.planType} Subscription
            </h3>
            <p className="text-xs text-text-muted">{MODE_LABELS[subscription.sponsorshipMode]}</p>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Budget Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-text-muted">Budget</span>
          <span className="text-text-primary">
            ${subscription.budgetSpent.toLocaleString()} / $
            {subscription.budgetAmount.toLocaleString()}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-purple to-neon-pink transition-all duration-500"
            style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <FiTrendingUp className="w-4 h-4 text-text-muted" />
          <span className="text-text-muted">Events:</span>
          <span className="text-text-primary font-medium">{subscription.eventsSponsored}</span>
        </div>
        <div className="flex items-center gap-2">
          <FiCalendar className="w-4 h-4 text-text-muted" />
          <span className="text-text-muted">Next:</span>
          <span className="text-text-primary font-medium">{formattedNextBilling}</span>
        </div>
      </div>

      {/* Actions */}
      {(onManage || onPause || onResume) && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
          {subscription.status === 'active' && onPause && (
            <button
              onClick={onPause}
              className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/15 rounded-lg text-text-primary text-sm transition-colors"
            >
              Pause
            </button>
          )}
          {subscription.status === 'paused' && onResume && (
            <button
              onClick={onResume}
              className="flex-1 py-2 px-3 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 text-sm transition-colors"
            >
              Resume
            </button>
          )}
          {onManage && (
            <button
              onClick={onManage}
              className="flex-1 py-2 px-3 bg-neon-purple/20 hover:bg-neon-purple/30 rounded-lg text-neon-purple text-sm transition-colors"
            >
              Manage
            </button>
          )}
        </div>
      )}
    </div>
  )
}
