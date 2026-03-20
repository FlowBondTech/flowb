'use client'

import {
  AcceptanceMode,
  useGetEventSponsorshipSettingsQuery,
  useUpdateEventSponsorshipSettingsMutation,
} from '@/src/generated/graphql'
import { useEffect, useState } from 'react'
import {
  FiAlertCircle,
  FiBell,
  FiCheck,
  FiDollarSign,
  FiMessageSquare,
  FiSettings,
  FiTarget,
  FiX,
} from 'react-icons/fi'

// Sponsor Categories (same as onboarding)
const SPONSOR_CATEGORIES = [
  { slug: 'apparel', name: 'Dance Apparel & Footwear' },
  { slug: 'music', name: 'Music & Audio' },
  { slug: 'wellness', name: 'Health & Wellness' },
  { slug: 'tech', name: 'Technology & Wearables' },
  { slug: 'venues', name: 'Entertainment Venues' },
  { slug: 'local', name: 'Local Business' },
  { slug: 'media', name: 'Media & Influencer' },
  { slug: 'education', name: 'Education & Training' },
  { slug: 'lifestyle', name: 'Lifestyle & Fashion' },
  { slug: 'corporate', name: 'Corporate' },
]

interface EventSponsorshipSettingsProps {
  eventId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function EventSponsorshipSettings({
  eventId,
  isOpen,
  onClose,
  onSuccess,
}: EventSponsorshipSettingsProps) {
  // Form state
  const [seekingSponsorship, setSeekingSponsorship] = useState(true)
  const [sponsorshipGoal, setSponsorshipGoal] = useState('')
  const [acceptanceMode, setAcceptanceMode] = useState<AcceptanceMode>(AcceptanceMode.Manual)
  const [preferredCategories, setPreferredCategories] = useState<string[]>([])
  const [blockedCategories, setBlockedCategories] = useState<string[]>([])
  const [minAutoAcceptAmount, setMinAutoAcceptAmount] = useState('')
  const [pitchMessage, setPitchMessage] = useState('')
  const [notifyOnNewSponsor, setNotifyOnNewSponsor] = useState(true)
  const [notifyOnGoalReached, setNotifyOnGoalReached] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Query existing settings
  const { data, loading } = useGetEventSponsorshipSettingsQuery({
    variables: { eventId },
    skip: !isOpen || !eventId,
  })

  const [updateSettings] = useUpdateEventSponsorshipSettingsMutation()

  // Populate form with existing data
  useEffect(() => {
    if (data?.eventSponsorshipSettings) {
      const settings = data.eventSponsorshipSettings
      setSeekingSponsorship(settings.seekingSponsorship ?? true)
      setSponsorshipGoal(settings.sponsorshipGoal?.toString() || '')
      setAcceptanceMode(settings.acceptanceMode || AcceptanceMode.Manual)
      setPreferredCategories(
        settings.preferredCategories?.filter((c): c is string => c !== null) || [],
      )
      setBlockedCategories(settings.blockedCategories?.filter((c): c is string => c !== null) || [])
      setMinAutoAcceptAmount(settings.minAutoAcceptAmount?.toString() || '')
      setPitchMessage(settings.pitchMessage || '')
      setNotifyOnNewSponsor(settings.notifyOnNewSponsor ?? true)
      setNotifyOnGoalReached(settings.notifyOnGoalReached ?? true)
    }
  }, [data])

  const handleCategoryToggle = (slug: string, type: 'preferred' | 'blocked') => {
    if (type === 'preferred') {
      setPreferredCategories(prev =>
        prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug],
      )
      // Remove from blocked if adding to preferred
      if (!preferredCategories.includes(slug)) {
        setBlockedCategories(prev => prev.filter(c => c !== slug))
      }
    } else {
      setBlockedCategories(prev =>
        prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug],
      )
      // Remove from preferred if adding to blocked
      if (!blockedCategories.includes(slug)) {
        setPreferredCategories(prev => prev.filter(c => c !== slug))
      }
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await updateSettings({
        variables: {
          eventId,
          input: {
            seekingSponsorship,
            sponsorshipGoal: sponsorshipGoal ? Number.parseFloat(sponsorshipGoal) : null,
            acceptanceMode,
            preferredCategories: preferredCategories.length > 0 ? preferredCategories : null,
            blockedCategories: blockedCategories.length > 0 ? blockedCategories : null,
            minAutoAcceptAmount: minAutoAcceptAmount
              ? Number.parseFloat(minAutoAcceptAmount)
              : null,
            pitchMessage: pitchMessage || null,
            notifyOnNewSponsor,
            notifyOnGoalReached,
          },
        },
      })
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to update sponsorship settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  // Current sponsorship stats from settings
  const currentTotal = data?.eventSponsorshipSettings?.currentTotal || 0
  const goalProgress = data?.eventSponsorshipSettings?.goalProgress || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] m-4 bg-bg-secondary border border-neon-purple/20 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center">
              <FiDollarSign className="w-5 h-5 text-neon-purple" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Sponsorship Settings</h2>
              <p className="text-sm text-text-muted">Configure how you receive sponsorships</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <FiX className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Seeking Sponsorship Toggle */}
              <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-xl">
                <div>
                  <p className="font-medium text-text-primary">Seeking Sponsorship</p>
                  <p className="text-sm text-text-muted">Allow sponsors to fund your event</p>
                </div>
                <button
                  onClick={() => setSeekingSponsorship(!seekingSponsorship)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    seekingSponsorship ? 'bg-green-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      seekingSponsorship ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {seekingSponsorship && (
                <>
                  {/* Current Progress (if any) */}
                  {currentTotal > 0 && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-text-muted">Current Sponsorship</span>
                        <span className="text-green-400 font-semibold">
                          ${currentTotal.toLocaleString()} FLOW
                        </span>
                      </div>
                      {sponsorshipGoal && (
                        <>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${Math.min(goalProgress, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-text-muted mt-1">
                            {goalProgress.toFixed(0)}% of goal
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Sponsorship Goal */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
                      <FiTarget className="w-4 h-4" />
                      Sponsorship Goal (optional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                        $
                      </span>
                      <input
                        type="number"
                        value={sponsorshipGoal}
                        onChange={e => setSponsorshipGoal(e.target.value)}
                        placeholder="0"
                        className="w-full pl-8 pr-16 py-3 bg-bg-tertiary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/50"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                        FLOW
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Set a target amount to show progress to potential sponsors
                    </p>
                  </div>

                  {/* Acceptance Mode */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-3">
                      <FiSettings className="w-4 h-4" />
                      Acceptance Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => setAcceptanceMode(AcceptanceMode.AutoAccept)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          acceptanceMode === AcceptanceMode.AutoAccept
                            ? 'border-neon-purple bg-neon-purple/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FiCheck
                            className={
                              acceptanceMode === AcceptanceMode.AutoAccept
                                ? 'text-neon-purple'
                                : 'text-text-muted'
                            }
                          />
                          <span className="font-medium text-text-primary">Auto-Accept</span>
                        </div>
                        <p className="text-xs text-text-muted">
                          Accept all sponsorships automatically
                        </p>
                      </button>

                      <button
                        onClick={() => setAcceptanceMode(AcceptanceMode.Manual)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          acceptanceMode === AcceptanceMode.Manual
                            ? 'border-neon-purple bg-neon-purple/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FiAlertCircle
                            className={
                              acceptanceMode === AcceptanceMode.Manual
                                ? 'text-neon-purple'
                                : 'text-text-muted'
                            }
                          />
                          <span className="font-medium text-text-primary">Manual</span>
                        </div>
                        <p className="text-xs text-text-muted">Review each sponsorship request</p>
                      </button>

                      <button
                        onClick={() => setAcceptanceMode(AcceptanceMode.CategoryFilter)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          acceptanceMode === AcceptanceMode.CategoryFilter
                            ? 'border-neon-purple bg-neon-purple/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FiSettings
                            className={
                              acceptanceMode === AcceptanceMode.CategoryFilter
                                ? 'text-neon-purple'
                                : 'text-text-muted'
                            }
                          />
                          <span className="font-medium text-text-primary">Category Filter</span>
                        </div>
                        <p className="text-xs text-text-muted">
                          Auto-accept from preferred categories
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Minimum Auto-Accept Amount */}
                  {(acceptanceMode === AcceptanceMode.AutoAccept ||
                    acceptanceMode === AcceptanceMode.CategoryFilter) && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Minimum Amount to Auto-Accept
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                          $
                        </span>
                        <input
                          type="number"
                          value={minAutoAcceptAmount}
                          onChange={e => setMinAutoAcceptAmount(e.target.value)}
                          placeholder="50"
                          className="w-full pl-8 pr-16 py-3 bg-bg-tertiary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/50"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                          FLOW
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Category Preferences */}
                  {acceptanceMode === AcceptanceMode.CategoryFilter && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-3">
                        Category Preferences
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {SPONSOR_CATEGORIES.map(category => {
                          const isPreferred = preferredCategories.includes(category.slug)
                          const isBlocked = blockedCategories.includes(category.slug)

                          return (
                            <div
                              key={category.slug}
                              className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg"
                            >
                              <span className="text-text-primary text-sm">{category.name}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCategoryToggle(category.slug, 'preferred')}
                                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                    isPreferred
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                      : 'bg-white/5 text-text-muted hover:bg-white/10'
                                  }`}
                                >
                                  Preferred
                                </button>
                                <button
                                  onClick={() => handleCategoryToggle(category.slug, 'blocked')}
                                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                    isBlocked
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : 'bg-white/5 text-text-muted hover:bg-white/10'
                                  }`}
                                >
                                  Blocked
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pitch Message */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
                      <FiMessageSquare className="w-4 h-4" />
                      Pitch Message (optional)
                    </label>
                    <textarea
                      value={pitchMessage}
                      onChange={e => setPitchMessage(e.target.value)}
                      placeholder="Tell potential sponsors why they should support your event..."
                      className="w-full h-24 px-4 py-3 bg-bg-tertiary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/50 resize-none"
                    />
                    <p className="text-xs text-text-muted mt-1">
                      This message will be shown to sponsors browsing events
                    </p>
                  </div>

                  {/* Notification Preferences */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-3">
                      <FiBell className="w-4 h-4" />
                      Notifications
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                        <span className="text-sm text-text-primary">New sponsorship requests</span>
                        <button
                          onClick={() => setNotifyOnNewSponsor(!notifyOnNewSponsor)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            notifyOnNewSponsor ? 'bg-green-500' : 'bg-white/20'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              notifyOnNewSponsor ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                        <span className="text-sm text-text-primary">Goal reached</span>
                        <button
                          onClick={() => setNotifyOnGoalReached(!notifyOnGoalReached)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            notifyOnGoalReached ? 'bg-green-500' : 'bg-white/20'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              notifyOnGoalReached ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2 text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="flex items-center gap-2 px-6 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FiCheck size={16} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
