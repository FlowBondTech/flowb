'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import {
  GetMySponsorProfileDocument,
  useCreateSponsorProfileMutation,
  useGetMySponsorProfileQuery,
} from '@/src/generated/graphql'
import { useAuth } from '@/src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCheck,
  FiGlobe,
  FiImage,
  FiMail,
  FiMapPin,
  FiMusic,
  FiPhone,
  FiTarget,
  FiX,
} from 'react-icons/fi'

// Sponsor Categories
const SPONSOR_CATEGORIES = [
  {
    slug: 'apparel',
    name: 'Dance Apparel & Footwear',
    icon: '/icons/categories/apparel.svg',
    description: 'Dance shoes, athletic wear, costumes',
  },
  {
    slug: 'music',
    name: 'Music & Audio',
    icon: '/icons/categories/music.svg',
    description: 'Streaming, DJ equipment, labels',
  },
  {
    slug: 'wellness',
    name: 'Health & Wellness',
    icon: '/icons/categories/wellness.svg',
    description: 'Sports drinks, supplements, fitness',
  },
  {
    slug: 'tech',
    name: 'Technology & Wearables',
    icon: '/icons/categories/tech.svg',
    description: 'Fitness trackers, AR/VR, apps',
  },
  {
    slug: 'venues',
    name: 'Entertainment Venues',
    icon: '/icons/categories/venues.svg',
    description: 'Studios, venues, ticketing',
  },
  {
    slug: 'local',
    name: 'Local Business',
    icon: '/icons/categories/local.svg',
    description: 'Restaurants, cafes near events',
  },
  {
    slug: 'media',
    name: 'Media & Influencer',
    icon: '/icons/categories/media.svg',
    description: 'Content creators, media outlets',
  },
  {
    slug: 'education',
    name: 'Education & Training',
    icon: '/icons/categories/education.svg',
    description: 'Dance schools, online courses',
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle & Fashion',
    icon: '/icons/categories/lifestyle.svg',
    description: 'Fashion, beauty, accessories',
  },
  {
    slug: 'corporate',
    name: 'Corporate',
    icon: '/icons/categories/corporate.svg',
    description: 'Team building, enterprise events',
  },
]

// Dance Styles
const DANCE_STYLES = [
  'Hip Hop',
  'Breaking',
  'House',
  'Locking',
  'Popping',
  'Salsa',
  'Bachata',
  'Kizomba',
  'Zouk',
  'Tango',
  'Contemporary',
  'Ballet',
  'Jazz',
  'Lyrical',
  'Modern',
  'Afrobeat',
  'Dancehall',
  'Amapiano',
  'Kuduro',
  'Ballroom',
  'Latin',
  'Swing',
  'Lindy Hop',
  'Heels',
  'Voguing',
  'Waacking',
  'Krump',
  'K-Pop',
  'J-Pop',
  'Street Dance',
  'Freestyle',
]

// Event Types (matching backend schema)
const EVENT_TYPES = [
  'workshop',
  'class',
  'battle',
  'social',
  'performance',
  'showcase',
  'competition',
  'jam',
  'festival',
  'party',
]

interface FormData {
  companyName: string
  companyDescription: string
  logoUrl: string
  websiteUrl: string
  contactEmail: string
  contactPhone: string
  categories: string[]
  preferredRegions: string[]
  preferredEventTypes: string[]
  preferredDanceStyles: string[]
}

const STEPS = [
  { id: 1, title: 'Company Info', icon: FiBriefcase },
  { id: 2, title: 'Categories', icon: FiTarget },
  { id: 3, title: 'Preferences', icon: FiMusic },
  { id: 4, title: 'Review', icon: FiCheck },
]

export default function SponsorOnboardingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: existingProfile, loading: profileLoading } = useGetMySponsorProfileQuery({
    skip: !isAuthenticated || isLoading,
  })

  const [createSponsorProfile] = useCreateSponsorProfileMutation()

  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    companyDescription: '',
    logoUrl: '',
    websiteUrl: '',
    contactEmail: '',
    contactPhone: '',
    categories: [],
    preferredRegions: [],
    preferredEventTypes: [],
    preferredDanceStyles: [],
  })


  useEffect(() => {
    // Redirect if already has profile
    if (existingProfile?.mySponsorProfile) {
      router.push('/dashboard/sponsor')
    }
  }, [existingProfile, router])

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const toggleArrayItem = (field: keyof FormData, item: string) => {
    setFormData(prev => {
      const array = prev[field] as string[]
      if (array.includes(item)) {
        return { ...prev, [field]: array.filter(i => i !== item) }
      }
      return { ...prev, [field]: [...array, item] }
    })
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.companyName.trim()) {
          setError('Company name is required')
          return false
        }
        if (!formData.contactEmail.trim() || !formData.contactEmail.includes('@')) {
          setError('Valid email is required')
          return false
        }
        return true
      case 2:
        if (formData.categories.length === 0) {
          setError('Please select at least one category')
          return false
        }
        return true
      case 3:
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
      setError(null)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError(null)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createSponsorProfile({
        variables: {
          input: {
            companyName: formData.companyName.trim(),
            companyDescription: formData.companyDescription.trim() || null,
            logoUrl: formData.logoUrl.trim() || null,
            websiteUrl: formData.websiteUrl.trim() || null,
            contactEmail: formData.contactEmail.trim(),
            contactPhone: formData.contactPhone.trim() || null,
            categories: formData.categories,
            preferredRegions:
              formData.preferredRegions.length > 0 ? formData.preferredRegions : null,
            preferredEventTypes:
              formData.preferredEventTypes.length > 0 ? formData.preferredEventTypes : null,
            preferredDanceStyles:
              formData.preferredDanceStyles.length > 0 ? formData.preferredDanceStyles : null,
          },
        },
        refetchQueries: [{ query: GetMySponsorProfileDocument }],
        awaitRefetchQueries: true,
      })

      if (result.data?.createSponsorProfile) {
        router.push('/dashboard/sponsor')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create sponsor profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-neon-purple/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-neon-purple rounded-full animate-spin" />
            </div>
            <p className="text-text-secondary animate-pulse">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/sponsor')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
          >
            <FiArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create Sponsor Profile</h1>
          <p className="text-text-secondary">
            Join FlowBond as a sponsor and support the dance community.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      currentStep >= step.id
                        ? 'bg-neon-purple text-white'
                        : 'bg-bg-secondary text-text-secondary'
                    }`}
                  >
                    {currentStep > step.id ? <FiCheck size={20} /> : <step.icon size={20} />}
                  </div>
                  <span
                    className={`mt-2 text-sm ${
                      currentStep >= step.id
                        ? 'text-neon-purple font-medium'
                        : 'text-text-secondary'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 mt-[-1.5rem] ${
                      currentStep > step.id ? 'bg-neon-purple' : 'bg-bg-secondary'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 p-6 sm:p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <FiX className="text-red-400 shrink-0" size={20} />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Company Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary mb-6">Company Information</h2>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => updateFormData('companyName', e.target.value)}
                  placeholder="Your company or brand name"
                  className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Company Description
                </label>
                <textarea
                  value={formData.companyDescription}
                  onChange={e => updateFormData('companyDescription', e.target.value)}
                  placeholder="Tell dancers about your company and why you want to support the community..."
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Logo URL
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <FiImage
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                      size={18}
                    />
                    <input
                      type="url"
                      value={formData.logoUrl}
                      onChange={e => updateFormData('logoUrl', e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full pl-11 pr-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none transition-colors"
                    />
                  </div>
                  {formData.logoUrl && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={formData.logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                        onError={e => (e.currentTarget.src = '')}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Website
                </label>
                <div className="relative">
                  <FiGlobe
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                    size={18}
                  />
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={e => updateFormData('websiteUrl', e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full pl-11 pr-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Contact Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FiMail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                    size={18}
                  />
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={e => updateFormData('contactEmail', e.target.value)}
                    placeholder="sponsorship@yourcompany.com"
                    className="w-full pl-11 pr-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Contact Phone
                </label>
                <div className="relative">
                  <FiPhone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                    size={18}
                  />
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={e => updateFormData('contactPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full pl-11 pr-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Categories */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Sponsorship Categories
              </h2>
              <p className="text-text-secondary text-sm mb-6">
                Select the categories that best describe your business. This helps us match you with
                relevant events.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {SPONSOR_CATEGORIES.map(category => (
                  <button
                    key={category.slug}
                    onClick={() => toggleArrayItem('categories', category.slug)}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                      formData.categories.includes(category.slug)
                        ? 'bg-neon-purple/10 border-neon-purple/50'
                        : 'bg-bg-primary/50 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.categories.includes(category.slug)
                          ? 'bg-neon-purple/20'
                          : 'bg-bg-primary'
                      }`}
                    >
                      {formData.categories.includes(category.slug) ? (
                        <FiCheck className="text-neon-purple" size={20} />
                      ) : (
                        <FiTarget className="text-text-muted" size={20} />
                      )}
                    </div>
                    <div>
                      <h3
                        className={`font-medium ${
                          formData.categories.includes(category.slug)
                            ? 'text-neon-purple'
                            : 'text-text-primary'
                        }`}
                      >
                        {category.name}
                      </h3>
                      <p className="text-text-muted text-sm mt-1">{category.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-text-muted text-sm mt-4">
                Selected: {formData.categories.length} categor
                {formData.categories.length === 1 ? 'y' : 'ies'}
              </p>
            </div>
          )}

          {/* Step 3: Preferences */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  Sponsorship Preferences
                </h2>
                <p className="text-text-secondary text-sm mb-6">
                  Optional: Set your preferences to help us suggest the best events for you.
                </p>
              </div>

              {/* Preferred Dance Styles */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Preferred Dance Styles
                </label>
                <div className="flex flex-wrap gap-2">
                  {DANCE_STYLES.map(style => (
                    <button
                      key={style}
                      onClick={() => toggleArrayItem('preferredDanceStyles', style)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        formData.preferredDanceStyles.includes(style)
                          ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                          : 'bg-bg-primary text-text-secondary border border-white/5 hover:border-white/20'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Event Types */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Preferred Event Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleArrayItem('preferredEventTypes', type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                        formData.preferredEventTypes.includes(type)
                          ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/30'
                          : 'bg-bg-primary text-text-secondary border border-white/5 hover:border-white/20'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Regions */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Preferred Regions
                </label>
                <p className="text-text-muted text-xs mb-3">
                  Enter cities or regions separated by commas
                </p>
                <div className="relative">
                  <FiMapPin className="absolute left-4 top-3 text-text-muted" size={18} />
                  <input
                    type="text"
                    value={formData.preferredRegions.join(', ')}
                    onChange={e =>
                      updateFormData(
                        'preferredRegions',
                        e.target.value
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="New York, Los Angeles, Chicago..."
                    className="w-full pl-11 pr-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-6">Review Your Profile</h2>

              <div className="space-y-6">
                {/* Company Card Preview */}
                <div className="bg-bg-primary/50 rounded-xl p-6 border border-white/5">
                  <div className="flex items-start gap-4">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt={formData.companyName}
                        className="w-16 h-16 rounded-xl object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white text-2xl font-bold">
                        {formData.companyName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        {formData.companyName}
                      </h3>
                      {formData.websiteUrl && (
                        <p className="text-text-secondary text-sm">{formData.websiteUrl}</p>
                      )}
                    </div>
                  </div>

                  {formData.companyDescription && (
                    <p className="text-text-secondary mt-4 text-sm">
                      {formData.companyDescription}
                    </p>
                  )}
                </div>

                {/* Details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-bg-primary/50 rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm font-medium text-text-muted mb-2">Contact Email</h4>
                    <p className="text-text-primary">{formData.contactEmail}</p>
                  </div>
                  {formData.contactPhone && (
                    <div className="bg-bg-primary/50 rounded-xl p-4 border border-white/5">
                      <h4 className="text-sm font-medium text-text-muted mb-2">Contact Phone</h4>
                      <p className="text-text-primary">{formData.contactPhone}</p>
                    </div>
                  )}
                </div>

                {/* Categories */}
                <div className="bg-bg-primary/50 rounded-xl p-4 border border-white/5">
                  <h4 className="text-sm font-medium text-text-muted mb-3">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.categories.map(cat => (
                      <span
                        key={cat}
                        className="px-3 py-1 bg-neon-purple/10 text-neon-purple rounded-full text-sm capitalize"
                      >
                        {SPONSOR_CATEGORIES.find(c => c.slug === cat)?.name || cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preferences */}
                {(formData.preferredDanceStyles.length > 0 ||
                  formData.preferredEventTypes.length > 0 ||
                  formData.preferredRegions.length > 0) && (
                  <div className="bg-bg-primary/50 rounded-xl p-4 border border-white/5">
                    <h4 className="text-sm font-medium text-text-muted mb-3">Preferences</h4>
                    <div className="space-y-3">
                      {formData.preferredDanceStyles.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">Dance Styles</p>
                          <p className="text-text-primary text-sm">
                            {formData.preferredDanceStyles.join(', ')}
                          </p>
                        </div>
                      )}
                      {formData.preferredEventTypes.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">Event Types</p>
                          <p className="text-text-primary text-sm capitalize">
                            {formData.preferredEventTypes.join(', ')}
                          </p>
                        </div>
                      )}
                      {formData.preferredRegions.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">Regions</p>
                          <p className="text-text-primary text-sm">
                            {formData.preferredRegions.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Terms */}
                <div className="bg-neon-purple/5 border border-neon-purple/20 rounded-xl p-4">
                  <p className="text-text-secondary text-sm">
                    By creating a sponsor profile, you agree to FlowBond's terms of service and
                    commit to supporting the dance community through transparent, fair sponsorship
                    practices.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-5 py-2.5 text-text-secondary hover:text-text-primary transition-colors"
              >
                <FiArrowLeft size={18} />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-neon-purple hover:bg-neon-purple/90 text-white font-medium rounded-xl transition-colors"
              >
                <span>Continue</span>
                <FiArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <FiCheck size={18} />
                    <span>Create Sponsor Profile</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
