'use client'

import { GetEventsDocument, RecurrenceType, useCreateEventMutation } from '@/src/generated/graphql'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import {
  FiAward,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
  FiEye,
  FiGlobe,
  FiHeart,
  FiLock,
  FiMapPin,
  FiMusic,
  FiRepeat,
  FiShare2,
  FiStar,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi'
import DatePicker from './DatePicker'
import DateTimePicker from './DateTimePicker'

interface EventCreationWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface EventFormData {
  title: string
  description: string
  category: string
  location_name: string
  location_address: string
  location_city: string
  start_date_time: string
  end_date_time: string
  max_capacity: number | null
  price_usd: number
  skill_level: string
  dance_styles: string[]
  tags: string[]
  is_virtual: boolean
  virtual_link: string
  requirements: string
  is_recurring: boolean
  recurrence_type: RecurrenceType
  recurrence_end_date: string
  recurrence_days: string[]
  is_public: boolean
  allow_sponsors: boolean
}

const STEPS = [
  { id: 1, title: 'Basics', icon: FiMusic, description: 'Name your event' },
  { id: 2, title: 'When & Where', icon: FiMapPin, description: 'Set time & location' },
  { id: 3, title: 'Details', icon: FiUsers, description: 'Capacity & pricing' },
  { id: 4, title: 'Extras', icon: FiStar, description: 'Make it special' },
  { id: 5, title: 'Launch', icon: FiZap, description: 'Preview & publish' },
]

const CATEGORIES = [
  { value: 'class', label: 'Dance Class', emoji: '💃' },
  { value: 'social', label: 'Social Dance', emoji: '🎉' },
  { value: 'workshop', label: 'Workshop', emoji: '📚' },
  { value: 'competition', label: 'Competition', emoji: '🏆' },
  { value: 'performance', label: 'Performance', emoji: '🎭' },
  { value: 'fitness', label: 'Dance Fitness', emoji: '💪' },
]

const SKILL_LEVELS = [
  { value: 'all', label: 'All Levels', description: 'Everyone welcome' },
  { value: 'beginner', label: 'Beginner', description: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced dancers' },
]

const WEEKDAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
]

const XP_REWARDS = {
  createEvent: 100,
  firstEvent: 250,
  recurringEvent: 50,
}

export default function EventCreationWizard({
  isOpen,
  onClose,
  onSuccess,
}: EventCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [earnedXP, setEarnedXP] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    category: 'class',
    location_name: '',
    location_address: '',
    location_city: '',
    start_date_time: '',
    end_date_time: '',
    max_capacity: null,
    price_usd: 0,
    skill_level: 'all',
    dance_styles: [],
    tags: [],
    is_virtual: false,
    virtual_link: '',
    requirements: '',
    is_recurring: false,
    recurrence_type: RecurrenceType.Weekly,
    recurrence_end_date: '',
    recurrence_days: [],
    is_public: true,
    allow_sponsors: false,
  })

  const [createEvent] = useCreateEventMutation({
    refetchQueries: [{ query: GetEventsDocument }],
    awaitRefetchQueries: true,
  })

  const updateFormData = (updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const triggerCelebration = () => {
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#ec4899', '#3b82f6', '#10b981'],
    })

    // Calculate XP earned
    let xp = XP_REWARDS.createEvent
    if (formData.is_recurring) xp += XP_REWARDS.recurringEvent
    setEarnedXP(xp)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createEvent({
        variables: {
          input: {
            title: formData.title,
            description: formData.description,
            category: formData.category as any,
            location_name: formData.is_virtual
              ? formData.location_name || 'Virtual Event'
              : formData.location_name,
            location_address: formData.location_address || null,
            location_city: formData.location_city || null,
            start_date_time: new Date(formData.start_date_time).toISOString(),
            end_date_time: new Date(formData.end_date_time).toISOString(),
            max_capacity: formData.max_capacity,
            price_usd: formData.price_usd,
            skill_level: formData.skill_level as any,
            dance_styles: formData.dance_styles.length > 0 ? formData.dance_styles : null,
            tags: formData.tags.length > 0 ? formData.tags : null,
            is_virtual: formData.is_virtual,
            virtual_link: formData.virtual_link || null,
            requirements: formData.requirements || null,
            is_recurring: formData.is_recurring,
            recurrence_type: formData.is_recurring ? formData.recurrence_type : RecurrenceType.None,
            recurrence_end_date:
              formData.is_recurring && formData.recurrence_end_date
                ? new Date(formData.recurrence_end_date).toISOString()
                : null,
            recurrence_days: formData.is_recurring ? formData.recurrence_days : null,
            is_public: formData.is_public,
            allow_sponsors: formData.allow_sponsors,
          },
        },
      })

      // Check if the mutation returned data successfully
      if (result.errors && result.errors.length > 0) {
        const message = result.errors[0]?.message || 'Failed to create event'
        setError(message)
        return
      }

      if (!result.data?.createEvent) {
        setError('Event creation failed - no data returned')
        return
      }

      console.log('Event created successfully:', result.data.createEvent)

      setShowSuccess(true)
      triggerCelebration()

      // Auto-close after celebration
      setTimeout(() => {
        onSuccess()
        onClose()
        resetForm()
      }, 3000)
    } catch (err: any) {
      console.error('Failed to create event:', err)
      const message =
        err?.graphQLErrors?.[0]?.message ||
        err?.message ||
        'Failed to create event. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setShowSuccess(false)
    setError(null)
    setEarnedXP(0)
    setFormData({
      title: '',
      description: '',
      category: 'class',
      location_name: '',
      location_address: '',
      location_city: '',
      start_date_time: '',
      end_date_time: '',
      max_capacity: null,
      price_usd: 0,
      skill_level: 'all',
      dance_styles: [],
      tags: [],
      is_virtual: false,
      virtual_link: '',
      requirements: '',
      is_recurring: false,
      recurrence_type: RecurrenceType.Weekly,
      recurrence_end_date: '',
      recurrence_days: [],
      is_public: true,
      allow_sponsors: false,
    })
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim().length > 0 && formData.category
      case 2:
        // Virtual events don't require location_name
        const hasLocation = formData.is_virtual || formData.location_name.trim().length > 0
        return hasLocation && formData.start_date_time && formData.end_date_time
      case 3:
        return true // All optional
      case 4:
        return true // All optional
      case 5:
        return true
      default:
        return false
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepBasics formData={formData} updateFormData={updateFormData} />
      case 2:
        return <StepWhenWhere formData={formData} updateFormData={updateFormData} />
      case 3:
        return <StepDetails formData={formData} updateFormData={updateFormData} />
      case 4:
        return <StepExtras formData={formData} updateFormData={updateFormData} />
      case 5:
        return <StepPreview formData={formData} />
      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-gradient-to-br from-bg-secondary to-bg-primary rounded-2xl border border-neon-purple/30 w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl shadow-neon-purple/20"
          onClick={e => e.stopPropagation()}
        >
          {showSuccess ? (
            <SuccessScreen earnedXP={earnedXP} eventTitle={formData.title} />
          ) : (
            <>
              {/* Header with Progress */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
                      <FiZap className="w-5 h-5 text-text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">Create Event</h2>
                      <p className="text-sm text-text-secondary">
                        +{XP_REWARDS.createEvent} XP on completion
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-text-secondary hover:text-text-primary"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Step Progress */}
                <div className="flex items-center justify-between overflow-x-auto pb-2 -mb-2">
                  {STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center flex-shrink-0">
                      <motion.div
                        className={`flex flex-col items-center ${
                          currentStep >= step.id ? 'opacity-100' : 'opacity-40'
                        }`}
                        animate={{
                          scale: currentStep === step.id ? 1.05 : 1,
                        }}
                      >
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                            currentStep > step.id
                              ? 'bg-green-500 text-text-primary'
                              : currentStep === step.id
                                ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white'
                                : 'bg-white/10 text-text-secondary'
                          }`}
                        >
                          {currentStep > step.id ? (
                            <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </div>
                        <span className="text-xs text-text-secondary hidden sm:block">
                          {step.title}
                        </span>
                      </motion.div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`w-4 sm:w-8 lg:w-16 h-0.5 mx-1 sm:mx-2 transition-colors ${
                            currentStep > step.id ? 'bg-green-500' : 'bg-white/10'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStepContent()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mx-6 mb-0 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Footer Navigation */}
              <div className="p-6 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <FiChevronLeft className="w-5 h-5" />
                  Back
                </button>

                <div className="flex items-center gap-2">
                  {currentStep < 5 ? (
                    <button
                      onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                      disabled={!canProceed()}
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                    >
                      Continue
                      <FiChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all font-bold text-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-5 h-5" />
                          Launch Event
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Step 1: Basics
function StepBasics({
  formData,
  updateFormData,
}: {
  formData: EventFormData
  updateFormData: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Event Name *</label>
        <input
          type="text"
          value={formData.title}
          onChange={e => updateFormData({ title: e.target.value })}
          className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 text-lg"
          placeholder="Give your event an exciting name..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">Category *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => updateFormData({ category: cat.value })}
              className={`p-4 rounded-xl border transition-all text-left ${
                formData.category === cat.value
                  ? 'border-neon-purple bg-neon-purple/20 text-text-primary'
                  : 'border-white/10 hover:border-white/30 text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="text-2xl mb-1 block">{cat.emoji}</span>
              <span className="font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={e => updateFormData({ description: e.target.value })}
          rows={3}
          className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none focus:ring-2 focus:ring-neon-purple/20"
          placeholder="What makes this event special?"
        />
      </div>
    </div>
  )
}

// Step 2: When & Where
function StepWhenWhere({
  formData,
  updateFormData,
}: {
  formData: EventFormData
  updateFormData: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-6">
      {/* Date & Time Pickers */}
      <div className="grid grid-cols-1 gap-4">
        <DateTimePicker
          value={formData.start_date_time}
          onChange={value => updateFormData({ start_date_time: value })}
          label="Start Date & Time"
          placeholder="When does it start?"
          minDate={new Date()}
          required
        />
        <DateTimePicker
          value={formData.end_date_time}
          onChange={value => updateFormData({ end_date_time: value })}
          label="End Date & Time"
          placeholder="When does it end?"
          minDate={formData.start_date_time ? new Date(formData.start_date_time) : new Date()}
          required
        />
      </div>

      <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
        <input
          type="checkbox"
          id="is_virtual"
          checked={formData.is_virtual}
          onChange={e => updateFormData({ is_virtual: e.target.checked })}
          className="w-5 h-5 rounded text-neon-purple bg-white/10 border-white/30"
        />
        <label htmlFor="is_virtual" className="flex items-center gap-2 text-text-primary">
          <FiGlobe className="w-5 h-5 text-neon-purple" />
          This is a virtual event
        </label>
      </div>

      {formData.is_virtual ? (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Virtual Link</label>
          <input
            type="url"
            value={formData.virtual_link}
            onChange={e => updateFormData({ virtual_link: e.target.value })}
            className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
            placeholder="https://zoom.us/..."
          />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              <FiMapPin className="inline w-4 h-4 mr-1" /> Venue Name *
            </label>
            <input
              type="text"
              value={formData.location_name}
              onChange={e => updateFormData({ location_name: e.target.value })}
              className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
              placeholder="Dance Studio Name"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Address</label>
              <input
                type="text"
                value={formData.location_address}
                onChange={e => updateFormData({ location_address: e.target.value })}
                className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">City</label>
              <input
                type="text"
                value={formData.location_city}
                onChange={e => updateFormData({ location_city: e.target.value })}
                className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
                placeholder="New York"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Step 3: Details
function StepDetails({
  formData,
  updateFormData,
}: {
  formData: EventFormData
  updateFormData: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            <FiUsers className="inline w-4 h-4 mr-1" /> Max Capacity
          </label>
          <input
            type="number"
            value={formData.max_capacity || ''}
            onChange={e =>
              updateFormData({
                max_capacity: e.target.value ? Number.parseInt(e.target.value) : null,
              })
            }
            className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
            placeholder="Leave empty for unlimited"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            <FiDollarSign className="inline w-4 h-4 mr-1" /> Price (USD)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price_usd || ''}
            onChange={e => updateFormData({ price_usd: Number.parseFloat(e.target.value) || 0 })}
            className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
            placeholder="0 for free"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">Skill Level</label>
        <div className="grid grid-cols-2 gap-3">
          {SKILL_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => updateFormData({ skill_level: level.value })}
              className={`p-3 rounded-xl border transition-all text-left ${
                formData.skill_level === level.value
                  ? 'border-neon-purple bg-neon-purple/20 text-text-primary'
                  : 'border-white/10 hover:border-white/30 text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="font-medium block">{level.label}</span>
              <span className="text-xs opacity-60">{level.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Dance Styles (comma separated)
        </label>
        <input
          type="text"
          value={formData.dance_styles.join(', ')}
          onChange={e =>
            updateFormData({
              dance_styles: e.target.value
                .split(',')
                .map(s => s.trim())
                .filter(Boolean),
            })
          }
          className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
          placeholder="Salsa, Bachata, Hip Hop..."
        />
      </div>
    </div>
  )
}

// Step 4: Extras
function StepExtras({
  formData,
  updateFormData,
}: {
  formData: EventFormData
  updateFormData: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-6">
      {/* Recurring Event */}
      <div className="p-4 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-xl border border-neon-purple/30">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="is_recurring"
            checked={formData.is_recurring}
            onChange={e => updateFormData({ is_recurring: e.target.checked })}
            className="w-5 h-5 rounded text-neon-purple bg-white/10 border-white/30"
          />
          <label
            htmlFor="is_recurring"
            className="flex items-center gap-2 text-text-primary font-medium"
          >
            <FiRepeat className="w-5 h-5 text-neon-purple" />
            Make this a recurring event
            <span className="text-xs px-2 py-0.5 bg-neon-purple/30 rounded-full text-neon-purple">
              +{XP_REWARDS.recurringEvent} XP
            </span>
          </label>
        </div>

        {formData.is_recurring && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-4 border-t border-white/10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Repeat</label>
                <select
                  value={formData.recurrence_type}
                  onChange={e =>
                    updateFormData({ recurrence_type: e.target.value as RecurrenceType })
                  }
                  className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
                >
                  <option value={RecurrenceType.Daily}>Daily</option>
                  <option value={RecurrenceType.Weekly}>Weekly</option>
                  <option value={RecurrenceType.Biweekly}>Bi-weekly</option>
                  <option value={RecurrenceType.Monthly}>Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Until</label>
                <DatePicker
                  value={formData.recurrence_end_date}
                  onChange={value => updateFormData({ recurrence_end_date: value })}
                  placeholder="Series end date"
                  minDate={new Date()}
                />
              </div>
            </div>

            {formData.recurrence_type === RecurrenceType.Weekly && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  On days
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.value}
                      onClick={() => {
                        const newDays = formData.recurrence_days.includes(day.value)
                          ? formData.recurrence_days.filter(d => d !== day.value)
                          : [...formData.recurrence_days, day.value]
                        updateFormData({ recurrence_days: newDays })
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.recurrence_days.includes(day.value)
                          ? 'bg-neon-purple text-text-primary'
                          : 'bg-white/10 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Tags (comma separated)
        </label>
        <input
          type="text"
          value={formData.tags.join(', ')}
          onChange={e =>
            updateFormData({
              tags: e.target.value
                .split(',')
                .map(s => s.trim())
                .filter(Boolean),
            })
          }
          className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
          placeholder="beginner-friendly, social, workshop..."
        />
      </div>

      {/* Requirements */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Requirements</label>
        <textarea
          value={formData.requirements}
          onChange={e => updateFormData({ requirements: e.target.value })}
          rows={2}
          className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none"
          placeholder="What should participants bring or know?"
        />
      </div>

      {/* Public Event Toggle */}
      <div className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl border border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${formData.is_public ? 'bg-green-500/20' : 'bg-gray-500/20'}`}
            >
              {formData.is_public ? (
                <FiEye className="w-5 h-5 text-green-400" />
              ) : (
                <FiLock className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <label htmlFor="is_public" className="text-text-primary font-medium cursor-pointer">
                {formData.is_public ? 'Public Event' : 'Private Event'}
              </label>
              <p className="text-sm text-text-secondary">
                {formData.is_public
                  ? 'Anyone can discover and join via shareable link'
                  : 'Only visible to people you invite directly'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateFormData({ is_public: !formData.is_public })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.is_public ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.is_public ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {formData.is_public && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-sm text-green-400">
            <FiShare2 className="w-4 h-4" />
            <span>Your event will have a public page you can share</span>
          </div>
        )}
      </div>

      {/* Allow Sponsors Toggle */}
      <div className="p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl border border-pink-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${formData.allow_sponsors ? 'bg-pink-500/20' : 'bg-gray-500/20'}`}
            >
              <FiHeart
                className={`w-5 h-5 ${formData.allow_sponsors ? 'text-pink-400' : 'text-gray-400'}`}
              />
            </div>
            <div>
              <label
                htmlFor="allow_sponsors"
                className="text-text-primary font-medium cursor-pointer"
              >
                {formData.allow_sponsors ? 'Sponsors Welcome' : 'No Sponsors'}
              </label>
              <p className="text-sm text-text-secondary">
                {formData.allow_sponsors
                  ? 'Accept sponsors to help fund your event'
                  : 'This event is not accepting sponsors'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateFormData({ allow_sponsors: !formData.allow_sponsors })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.allow_sponsors ? 'bg-pink-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.allow_sponsors ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {formData.allow_sponsors && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-sm text-pink-400">
              <FiHeart className="w-4 h-4" />
              <span>Sponsors can apply to support your event</span>
            </div>
            <p className="text-xs text-text-muted">
              You can configure sponsorship tiers and manage applications after the event is created
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Step 5: Preview
function StepPreview({ formData }: { formData: EventFormData }) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'TBD'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const category = CATEGORIES.find(c => c.value === formData.category)

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-text-primary mb-2">Ready to launch? 🚀</h3>
        <p className="text-text-secondary">Review your event details below</p>
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        {/* Preview Header */}
        <div className="p-6 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-3xl">
              {category?.emoji || '🎉'}
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-text-primary">
                {formData.title || 'Untitled Event'}
              </h4>
              <p className="text-text-secondary">{category?.label || 'Event'}</p>
            </div>
            {formData.price_usd > 0 ? (
              <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full font-bold">
                ${formData.price_usd}
              </div>
            ) : (
              <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full font-bold">
                Free
              </div>
            )}
          </div>
        </div>

        {/* Preview Details */}
        <div className="p-6 space-y-4">
          {formData.description && <p className="text-text-secondary">{formData.description}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <FiCalendar className="w-4 h-4 text-neon-purple" />
              <span>{formatDate(formData.start_date_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <FiMapPin className="w-4 h-4 text-neon-purple" />
              <span>{formData.is_virtual ? 'Virtual Event' : formData.location_name || 'TBD'}</span>
            </div>
            {formData.max_capacity && (
              <div className="flex items-center gap-2 text-text-secondary">
                <FiUsers className="w-4 h-4 text-neon-purple" />
                <span>Max {formData.max_capacity} attendees</span>
              </div>
            )}
            {formData.is_recurring && (
              <div className="flex items-center gap-2 text-neon-purple">
                <FiRepeat className="w-4 h-4" />
                <span>Recurring Event</span>
              </div>
            )}
            {formData.allow_sponsors && (
              <div className="flex items-center gap-2 text-pink-400">
                <FiHeart className="w-4 h-4" />
                <span>Sponsors Welcome</span>
              </div>
            )}
          </div>

          {formData.dance_styles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.dance_styles.map(style => (
                <span
                  key={style}
                  className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-sm rounded-full"
                >
                  {style}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* XP Preview */}
      <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/30">
        <FiAward className="w-8 h-8 text-yellow-500" />
        <div>
          <p className="text-text-primary font-bold">
            You&apos;ll earn +{100 + (formData.is_recurring ? 50 : 0)} XP
          </p>
          <p className="text-sm text-text-secondary">
            {formData.is_recurring ? 'Includes +50 XP recurring bonus!' : 'Create event bonus'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Success Screen
function SuccessScreen({ earnedXP, eventTitle }: { earnedXP: number; eventTitle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-12 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center"
      >
        <FiCheck className="w-12 h-12 text-text-primary" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-text-primary mb-2"
      >
        Event Created! 🎉
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-text-secondary mb-6"
      >
        {eventTitle} is now live
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30"
      >
        <FiZap className="w-6 h-6 text-yellow-500" />
        <span className="text-2xl font-bold text-yellow-500">+{earnedXP} XP</span>
      </motion.div>
    </motion.div>
  )
}
