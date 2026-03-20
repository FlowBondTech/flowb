'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { AllocationSlider, DEFAULT_ALLOCATION } from '@/src/components/sponsor'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiInfo,
  FiShield,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi'

// Subscription plan types
type PlanType = 'monthly' | 'yearly'
type SponsorshipMode = 'category_subscription' | 'verified_only' | 'hybrid'

interface SubscriptionFormData {
  planType: PlanType
  sponsorshipMode: SponsorshipMode
  budgetAmount: number
  targetCategories: string[]
  verifiedEventsOnly: boolean
  autoApprove: boolean
  maxPerEvent: number
  allocationConfig: {
    paidWorkersPercent: number
    volunteerRewardsPercent: number
    platformFeePercent: number
  }
}

const SPONSOR_CATEGORIES = [
  { slug: 'apparel', name: 'Dance Apparel & Footwear', icon: '👟' },
  { slug: 'music', name: 'Music & Audio', icon: '🎵' },
  { slug: 'wellness', name: 'Health & Wellness', icon: '💪' },
  { slug: 'tech', name: 'Technology & Wearables', icon: '⌚' },
  { slug: 'venues', name: 'Entertainment Venues', icon: '🏟️' },
  { slug: 'local', name: 'Local Business', icon: '🏪' },
  { slug: 'media', name: 'Media & Influencer', icon: '📱' },
  { slug: 'education', name: 'Education & Training', icon: '📚' },
  { slug: 'lifestyle', name: 'Lifestyle & Fashion', icon: '👗' },
  { slug: 'corporate', name: 'Corporate', icon: '🏢' },
]

const PLAN_OPTIONS = [
  {
    type: 'monthly' as PlanType,
    label: 'Monthly',
    discount: 5,
    description: 'Cancel anytime, auto-renew',
    features: ['Flexible commitment', 'Cancel anytime', '5% discount on sponsorships'],
  },
  {
    type: 'yearly' as PlanType,
    label: 'Yearly',
    discount: 20,
    description: 'Best value, locked rate',
    features: ['Best value', 'Locked-in rate for 12 months', '20% discount on sponsorships'],
    recommended: true,
  },
]

const MODE_OPTIONS = [
  {
    mode: 'category_subscription' as SponsorshipMode,
    label: 'Category Subscription',
    description: 'Auto-sponsor all events in selected categories',
    icon: FiZap,
  },
  {
    mode: 'verified_only' as SponsorshipMode,
    label: 'Verified Events Only',
    description: 'Only sponsor events from verified creators',
    icon: FiShield,
  },
  {
    mode: 'hybrid' as SponsorshipMode,
    label: 'Hybrid',
    description: 'Categories + verified creators only',
    icon: FiTrendingUp,
    recommended: true,
  },
]

const BUDGET_PRESETS = [500, 1000, 2500, 5000, 10000]

export default function SubscriptionSetupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAllocation, setShowAllocation] = useState(false)

  const [formData, setFormData] = useState<SubscriptionFormData>({
    planType: 'monthly',
    sponsorshipMode: 'hybrid',
    budgetAmount: 1000,
    targetCategories: [],
    verifiedEventsOnly: true,
    autoApprove: false,
    maxPerEvent: 100,
    allocationConfig: DEFAULT_ALLOCATION,
  })
  const [customBudget, setCustomBudget] = useState('')

  const selectedPlan = PLAN_OPTIONS.find(p => p.type === formData.planType)!
  const discountAmount =
    formData.planType === 'yearly'
      ? (formData.budgetAmount * 12 * selectedPlan.discount) / 100
      : (formData.budgetAmount * selectedPlan.discount) / 100
  const effectiveAmount =
    formData.planType === 'yearly'
      ? formData.budgetAmount * 12 - discountAmount
      : formData.budgetAmount - discountAmount

  const handleCategoryToggle = (slug: string) => {
    setFormData(prev => ({
      ...prev,
      targetCategories: prev.targetCategories.includes(slug)
        ? prev.targetCategories.filter(c => c !== slug)
        : [...prev.targetCategories, slug],
    }))
  }

  const handleBudgetPresetClick = (amount: number) => {
    setFormData(prev => ({ ...prev, budgetAmount: amount }))
    setCustomBudget('')
  }

  const handleCustomBudgetChange = (value: string) => {
    setCustomBudget(value)
    const num = Number.parseFloat(value)
    if (!isNaN(num) && num > 0) {
      setFormData(prev => ({ ...prev, budgetAmount: num }))
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // TODO: Implement createSponsorSubscription mutation
      console.log('Creating subscription:', formData)
      await new Promise(resolve => setTimeout(resolve, 1500))
      router.push('/dashboard/sponsor')
    } catch (error) {
      console.error('Failed to create subscription:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.planType
      case 2:
        return !!formData.sponsorshipMode && formData.budgetAmount >= 100
      case 3:
        return formData.targetCategories.length > 0 || formData.sponsorshipMode === 'verified_only'
      case 4:
        return true
      default:
        return false
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map(step => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === currentStep
                ? 'bg-neon-purple text-white'
                : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-text-muted'
            }`}
          >
            {step < currentStep ? <FiCheck className="w-4 h-4" /> : step}
          </div>
          {step < 4 && (
            <div
              className={`w-12 h-0.5 mx-1 ${step < currentStep ? 'bg-green-500' : 'bg-white/10'}`}
            />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Choose Your Plan</h2>
        <p className="text-text-muted">Select a billing cycle for your recurring sponsorship</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLAN_OPTIONS.map(plan => (
          <button
            key={plan.type}
            onClick={() => setFormData(prev => ({ ...prev, planType: plan.type }))}
            className={`relative p-6 rounded-xl border text-left transition-all ${
              formData.planType === plan.type
                ? 'bg-neon-purple/10 border-neon-purple/50'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            {plan.recommended && (
              <span className="absolute -top-2 left-4 px-2 py-0.5 bg-neon-purple text-white text-xs rounded-full">
                Recommended
              </span>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FiCalendar
                  className={`w-5 h-5 ${formData.planType === plan.type ? 'text-neon-purple' : 'text-text-muted'}`}
                />
                <span className="text-lg font-semibold text-text-primary">{plan.label}</span>
              </div>
              <div
                className={`px-2 py-1 rounded-lg ${formData.planType === plan.type ? 'bg-neon-purple/20' : 'bg-white/10'}`}
              >
                <span
                  className={`text-sm font-medium ${formData.planType === plan.type ? 'text-neon-purple' : 'text-text-muted'}`}
                >
                  {plan.discount}% off
                </span>
              </div>
            </div>

            <p className="text-sm text-text-muted mb-4">{plan.description}</p>

            <ul className="space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-text-primary">
                  <FiCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <div
              className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                formData.planType === plan.type ? 'border-neon-purple' : 'border-white/20'
              }`}
            >
              {formData.planType === plan.type && (
                <div className="w-2.5 h-2.5 rounded-full bg-neon-purple" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Set Your Budget & Mode</h2>
        <p className="text-text-muted">Configure how you want to sponsor events</p>
      </div>

      {/* Budget Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Monthly Budget ($FLOW)
        </label>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {BUDGET_PRESETS.map(amount => (
            <button
              key={amount}
              onClick={() => handleBudgetPresetClick(amount)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                formData.budgetAmount === amount && !customBudget
                  ? 'bg-neon-purple text-white'
                  : 'bg-white/10 text-text-primary hover:bg-white/15'
              }`}
            >
              ${amount.toLocaleString()}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={customBudget}
          onChange={e => handleCustomBudgetChange(e.target.value)}
          placeholder="Custom amount"
          min={100}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
        />
        {formData.budgetAmount < 100 && (
          <p className="mt-2 text-xs text-red-400">Minimum budget is $100/month</p>
        )}
      </div>

      {/* Sponsorship Mode */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">Sponsorship Mode</label>
        <div className="space-y-2">
          {MODE_OPTIONS.map(option => {
            const Icon = option.icon
            return (
              <button
                key={option.mode}
                onClick={() =>
                  setFormData(prev => ({
                    ...prev,
                    sponsorshipMode: option.mode,
                    verifiedEventsOnly: option.mode !== 'category_subscription',
                  }))
                }
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                  formData.sponsorshipMode === option.mode
                    ? 'bg-neon-purple/10 border-neon-purple/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    formData.sponsorshipMode === option.mode ? 'bg-neon-purple/20' : 'bg-white/10'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${formData.sponsorshipMode === option.mode ? 'text-neon-purple' : 'text-text-muted'}`}
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
                    formData.sponsorshipMode === option.mode
                      ? 'border-neon-purple'
                      : 'border-white/20'
                  }`}
                >
                  {formData.sponsorshipMode === option.mode && (
                    <div className="w-2.5 h-2.5 rounded-full bg-neon-purple" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Max Per Event */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Maximum Per Event ($FLOW)
        </label>
        <input
          type="number"
          value={formData.maxPerEvent}
          onChange={e =>
            setFormData(prev => ({ ...prev, maxPerEvent: Number.parseFloat(e.target.value) || 0 }))
          }
          min={50}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary focus:border-neon-purple/50 focus:outline-none"
        />
        <p className="mt-1 text-xs text-text-muted">Cap for individual event sponsorships</p>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Select Categories</h2>
        <p className="text-text-muted">Choose which event categories to auto-sponsor</p>
      </div>

      {formData.sponsorshipMode === 'verified_only' ? (
        <div className="p-6 bg-white/5 rounded-xl border border-white/10 text-center">
          <FiShield className="w-12 h-12 text-neon-purple mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Verified Events Only</h3>
          <p className="text-text-muted">
            You'll automatically sponsor all events from verified creators, regardless of category.
            This ensures quality and trust in every sponsorship.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SPONSOR_CATEGORIES.map(category => {
            const isSelected = formData.targetCategories.includes(category.slug)
            return (
              <button
                key={category.slug}
                onClick={() => handleCategoryToggle(category.slug)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-neon-purple/10 border-neon-purple/50'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">
                      {category.name}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-neon-purple border-neon-purple' : 'border-white/20'
                    }`}
                  >
                    {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {formData.sponsorshipMode !== 'verified_only' && formData.targetCategories.length === 0 && (
        <p className="text-center text-sm text-yellow-400">
          Please select at least one category to continue
        </p>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Review & Confirm</h2>
        <p className="text-text-muted">Review your subscription details before confirming</p>
      </div>

      {/* Summary Card */}
      <div className="p-6 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-xl border border-neon-purple/20">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Subscription Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Plan</span>
            <span className="text-text-primary font-medium capitalize">{formData.planType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Sponsorship Mode</span>
            <span className="text-text-primary font-medium">
              {MODE_OPTIONS.find(m => m.mode === formData.sponsorshipMode)?.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Monthly Budget</span>
            <span className="text-text-primary font-medium">
              ${formData.budgetAmount.toLocaleString()} FLOW
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Max Per Event</span>
            <span className="text-text-primary font-medium">
              ${formData.maxPerEvent.toLocaleString()} FLOW
            </span>
          </div>
          {formData.targetCategories.length > 0 && (
            <div className="flex justify-between">
              <span className="text-text-muted">Categories</span>
              <span className="text-text-primary font-medium">
                {formData.targetCategories.length} selected
              </span>
            </div>
          )}

          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="flex justify-between text-base">
              <span className="text-text-muted">
                {formData.planType === 'yearly' ? 'Annual Total' : 'Monthly Total'}
              </span>
              <div className="text-right">
                <span className="text-text-primary font-bold">
                  ${effectiveAmount.toLocaleString()} FLOW
                </span>
                {discountAmount > 0 && (
                  <p className="text-xs text-green-400">
                    You save ${discountAmount.toLocaleString()} ({selectedPlan.discount}% off)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Config */}
      <div>
        <button
          onClick={() => setShowAllocation(!showAllocation)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <FiInfo className="w-4 h-4" />
          <span>{showAllocation ? 'Hide' : 'Customize'} default allocation</span>
        </button>

        {showAllocation && (
          <div className="mt-4 p-4 bg-white/5 rounded-xl">
            <AllocationSlider
              value={formData.allocationConfig}
              onChange={config => setFormData(prev => ({ ...prev, allocationConfig: config }))}
              totalAmount={formData.maxPerEvent}
            />
          </div>
        )}
      </div>

      {/* Auto-Approve Toggle */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
        <div>
          <p className="font-medium text-text-primary">Auto-approve sponsorships</p>
          <p className="text-xs text-text-muted">Skip confirmation for matching events</p>
        </div>
        <button
          onClick={() => setFormData(prev => ({ ...prev, autoApprove: !prev.autoApprove }))}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            formData.autoApprove ? 'bg-neon-purple' : 'bg-white/20'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              formData.autoApprove ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Terms */}
      <p className="text-xs text-text-muted text-center">
        By confirming, you agree to our subscription terms. Your subscription will automatically
        renew
        {formData.planType === 'monthly' ? ' monthly' : ' annually'} until cancelled.
      </p>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => (currentStep > 1 ? setCurrentStep(currentStep - 1) : router.back())}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 text-text-muted" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Set Up Subscription</h1>
            <p className="text-text-muted">Create a recurring sponsorship plan</p>
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="bg-bg-secondary border border-white/10 rounded-2xl p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-text-primary font-medium transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (currentStep < 4) {
                setCurrentStep(currentStep + 1)
              } else {
                handleSubmit()
              }
            }}
            disabled={!isStepValid(currentStep) || (currentStep === 4 && isSubmitting)}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-opacity"
          >
            {currentStep === 4
              ? isSubmitting
                ? 'Creating...'
                : 'Confirm Subscription'
              : 'Continue'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
