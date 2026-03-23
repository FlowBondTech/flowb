'use client'

import { SponsorshipVisibility } from '@/src/generated/graphql'
import { useState } from 'react'
import { FiDollarSign, FiEye, FiEyeOff, FiInfo, FiMessageCircle, FiStar, FiX } from 'react-icons/fi'
import AllocationSlider, { DEFAULT_ALLOCATION } from './AllocationSlider'

interface EventData {
  id: string
  title: string
  imageUrl?: string | null
  location?: string | null
  startDateTime: string
  sponsorshipSettings?: {
    sponsorshipGoal?: number | null
    currentSponsorshipTotal?: number
  } | null
}

interface CreateSponsorshipModalProps {
  isOpen: boolean
  onClose: () => void
  event: EventData
  onSubmit: (data: SponsorshipFormData) => Promise<void>
  isSubmitting?: boolean
}

export interface SponsorshipFormData {
  eventId: string
  flowAmount: number
  visibility: SponsorshipVisibility
  sponsorMessage: string
  allocationConfig: {
    paidWorkersPercent: number
    volunteerRewardsPercent: number
    platformFeePercent: number
  }
}

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500]

const VISIBILITY_OPTIONS = [
  {
    value: SponsorshipVisibility.Featured,
    label: 'Featured',
    description: 'Your logo prominently displayed',
    icon: FiStar,
    recommended: true,
  },
  {
    value: SponsorshipVisibility.Visible,
    label: 'Visible',
    description: 'Logo in sponsors list',
    icon: FiEye,
    recommended: false,
  },
  {
    value: SponsorshipVisibility.Anonymous,
    label: 'Anonymous',
    description: 'No public attribution',
    icon: FiEyeOff,
    recommended: false,
  },
]

export default function CreateSponsorshipModal({
  isOpen,
  onClose,
  event,
  onSubmit,
  isSubmitting = false,
}: CreateSponsorshipModalProps) {
  const [flowAmount, setFlowAmount] = useState<number | ''>(500)
  const [customAmount, setCustomAmount] = useState('')
  const [visibility, setVisibility] = useState<SponsorshipVisibility>(
    SponsorshipVisibility.Featured,
  )
  const [sponsorMessage, setSponsorMessage] = useState('')
  const [allocationConfig, setAllocationConfig] = useState(DEFAULT_ALLOCATION)
  const [showAllocation, setShowAllocation] = useState(false)

  if (!isOpen) return null

  const formattedDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const currentTotal = event.sponsorshipSettings?.currentSponsorshipTotal || 0
  const goal = event.sponsorshipSettings?.sponsorshipGoal
  const remaining = goal ? goal - currentTotal : null

  const handlePresetClick = (amount: number) => {
    setFlowAmount(amount)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    const num = Number.parseFloat(value)
    if (!isNaN(num) && num > 0) {
      setFlowAmount(num)
    } else {
      setFlowAmount('')
    }
  }

  const handleSubmit = async () => {
    if (!flowAmount || flowAmount <= 0) return

    await onSubmit({
      eventId: event.id,
      flowAmount,
      visibility,
      sponsorMessage,
      allocationConfig,
    })
  }

  const isValidAmount = typeof flowAmount === 'number' && flowAmount >= 50

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-text-primary">Sponsor Event</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <FiX className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Event Preview */}
        <div className="p-5 border-b border-white/10">
          <div className="flex gap-4">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center">
                <span className="text-3xl">🎭</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary mb-1">{event.title}</h3>
              <p className="text-sm text-text-muted mb-2">{formattedDate}</p>
              {goal && (
                <div className="text-sm">
                  <span className="text-green-400">${currentTotal.toLocaleString()}</span>
                  <span className="text-text-muted"> / ${goal.toLocaleString()} goal</span>
                  {remaining && remaining > 0 && (
                    <span className="text-text-muted ml-2">
                      (${remaining.toLocaleString()} needed)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Amount Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Contribution Amount ($FLOW)
            </label>

            {/* Preset Amounts */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {PRESET_AMOUNTS.map(amount => (
                <button
                  key={amount}
                  onClick={() => handlePresetClick(amount)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    flowAmount === amount && !customAmount
                      ? 'bg-neon-purple text-white'
                      : 'bg-white/10 text-text-primary hover:bg-white/15'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="relative">
              <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="number"
                value={customAmount}
                onChange={e => handleCustomAmountChange(e.target.value)}
                placeholder="Custom amount"
                min={50}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
              />
            </div>

            {flowAmount !== '' && flowAmount < 50 && (
              <p className="mt-2 text-xs text-red-400">Minimum sponsorship amount is $50</p>
            )}
          </div>

          {/* Visibility Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">Visibility</label>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map(option => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setVisibility(option.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      visibility === option.value
                        ? 'bg-neon-purple/10 border-neon-purple/30'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        visibility === option.value ? 'bg-neon-purple/20' : 'bg-white/10'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${visibility === option.value ? 'text-neon-purple' : 'text-text-muted'}`}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{option.label}</span>
                        {option.recommended && (
                          <span className="px-1.5 py-0.5 bg-neon-purple/20 text-neon-purple text-xs rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{option.description}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        visibility === option.value ? 'border-neon-purple' : 'border-white/20'
                      }`}
                    >
                      {visibility === option.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-neon-purple" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Allocation Config (Collapsible) */}
          <div>
            <button
              onClick={() => setShowAllocation(!showAllocation)}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <FiInfo className="w-4 h-4" />
              <span>{showAllocation ? 'Hide' : 'Customize'} allocation breakdown</span>
            </button>

            {showAllocation && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl">
                <AllocationSlider
                  value={allocationConfig}
                  onChange={setAllocationConfig}
                  totalAmount={typeof flowAmount === 'number' ? flowAmount : 0}
                />
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
              <FiMessageCircle className="w-4 h-4" />
              Message to Organizer (Optional)
            </label>
            <textarea
              value={sponsorMessage}
              onChange={e => setSponsorMessage(e.target.value)}
              placeholder="Share why you're supporting this event..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none resize-none"
            />
            <p className="mt-1 text-xs text-text-muted text-right">{sponsorMessage.length}/500</p>
          </div>

          {/* Summary */}
          {isValidAmount && (
            <div className="p-4 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-xl border border-neon-purple/20">
              <h4 className="text-sm font-medium text-text-primary mb-2">Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Contribution</span>
                  <span className="text-text-primary font-medium">
                    ${flowAmount.toLocaleString()} FLOW
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">
                    To Workers ({allocationConfig.paidWorkersPercent}%)
                  </span>
                  <span className="text-blue-400">
                    ${((flowAmount * allocationConfig.paidWorkersPercent) / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">
                    To Volunteers ({allocationConfig.volunteerRewardsPercent}%)
                  </span>
                  <span className="text-pink-400">
                    $
                    {(
                      (flowAmount * allocationConfig.volunteerRewardsPercent) /
                      100
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">
                    Platform Fee ({allocationConfig.platformFeePercent}%)
                  </span>
                  <span className="text-gray-400">
                    ${((flowAmount * allocationConfig.platformFeePercent) / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-text-primary font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValidAmount || isSubmitting}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-opacity"
          >
            {isSubmitting ? 'Processing...' : 'Confirm Sponsorship'}
          </button>
        </div>
      </div>
    </div>
  )
}
