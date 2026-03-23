'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { DANCE_STYLES, EVENT_TYPES } from '@/src/constants/eventConstants'
import {
  useGetMySponsorProfileQuery,
  useGetSponsorCategoriesQuery,
  useUpdateSponsorProfileMutation,
} from '@/src/generated/graphql'
import { useAuth } from '@/src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FiArrowLeft,
  FiCamera,
  FiCheck,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSave,
  FiX,
} from 'react-icons/fi'

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; min: number }> = {
  BRONZE: {
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    min: 50,
  },
  SILVER: { color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30', min: 500 },
  GOLD: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    min: 1000,
  },
  PLATINUM: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
    min: 5000,
  },
  DIAMOND: {
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
    min: 10000,
  },
}

export default function SponsorSettingsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const {
    data: profileData,
    loading: profileLoading,
    refetch,
  } = useGetMySponsorProfileQuery({
    skip: !isAuthenticated || isLoading,
  })

  const { data: categoriesData } = useGetSponsorCategoriesQuery()

  const [updateProfile, { loading: updating }] = useUpdateSponsorProfileMutation()

  // Form state
  const [companyName, setCompanyName] = useState('')
  const [companyDescription, setCompanyDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [preferredRegions, setPreferredRegions] = useState<string[]>([])
  const [preferredEventTypes, setPreferredEventTypes] = useState<string[]>([])
  const [preferredDanceStyles, setPreferredDanceStyles] = useState<string[]>([])
  const [newRegion, setNewRegion] = useState('')

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Load existing profile data
  useEffect(() => {
    if (profileData?.mySponsorProfile) {
      const sponsor = profileData.mySponsorProfile
      setCompanyName(sponsor.companyName || '')
      setCompanyDescription(sponsor.companyDescription || '')
      setLogoUrl(sponsor.logoUrl || '')
      setWebsiteUrl(sponsor.websiteUrl || '')
      setContactEmail(sponsor.contactEmail || '')
      setContactPhone(sponsor.contactPhone || '')
      setSelectedCategories((sponsor.categories || []).filter((c): c is string => c !== null))
      setPreferredRegions((sponsor.preferredRegions || []).filter((r): r is string => r !== null))
      setPreferredEventTypes(
        (sponsor.preferredEventTypes || []).filter((t): t is string => t !== null),
      )
      setPreferredDanceStyles(
        (sponsor.preferredDanceStyles || []).filter((s): s is string => s !== null),
      )
    }
  }, [profileData])


  const toggleCategory = (slug: string) => {
    setSelectedCategories(prev =>
      prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug],
    )
  }

  const toggleEventType = (type: string) => {
    setPreferredEventTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    )
  }

  const toggleDanceStyle = (style: string) => {
    setPreferredDanceStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style],
    )
  }

  const addRegion = () => {
    if (newRegion.trim() && !preferredRegions.includes(newRegion.trim())) {
      setPreferredRegions([...preferredRegions, newRegion.trim()])
      setNewRegion('')
    }
  }

  const removeRegion = (region: string) => {
    setPreferredRegions(prev => prev.filter(r => r !== region))
  }

  const handleSave = async () => {
    setSaveError('')
    setSaveSuccess(false)

    try {
      await updateProfile({
        variables: {
          input: {
            companyName,
            companyDescription,
            logoUrl: logoUrl || null,
            websiteUrl: websiteUrl || null,
            contactEmail,
            contactPhone: contactPhone || null,
            categories: selectedCategories,
            preferredRegions,
            preferredEventTypes,
            preferredDanceStyles,
          },
        },
      })
      setSaveSuccess(true)
      refetch()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save profile')
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
            <p className="text-text-secondary animate-pulse">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!profileData?.mySponsorProfile) {
    router.push('/dashboard/sponsor')
    return null
  }

  const sponsor = profileData.mySponsorProfile
  const tierConfig = TIER_CONFIG[sponsor.tier] || TIER_CONFIG.BRONZE
  const categories = categoriesData?.sponsorCategories || []

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard/sponsor')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 text-text-muted" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Sponsor Settings</h1>
            <p className="text-text-muted">Manage your sponsor profile and preferences</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
            <FiCheck className="w-5 h-5 text-green-400" />
            <span className="text-green-400">Profile saved successfully!</span>
          </div>
        )}
        {saveError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <FiX className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{saveError}</span>
          </div>
        )}

        {/* Tier Status */}
        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Sponsor Tier</h2>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 ${tierConfig.bg} ${tierConfig.border} border rounded-xl`}>
              <span className={`font-bold ${tierConfig.color}`}>{sponsor.tier}</span>
            </div>
            <div className="text-text-muted text-sm">
              Total contributed:{' '}
              <span className="text-green-400 font-medium">
                ${sponsor.totalFlowContributed.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm text-text-muted">
            Tier is automatically calculated based on your total contributions.
          </p>
        </div>

        {/* Company Information */}
        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Company Information</h2>

          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Logo URL</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                    <FiCamera className="w-6 h-6 text-neon-purple" />
                  </div>
                )}
                <input
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Description
              </label>
              <textarea
                value={companyDescription}
                onChange={e => setCompanyDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none resize-none"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                <FiGlobe className="inline w-4 h-4 mr-1" />
                Website
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
              />
            </div>

            {/* Contact Info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  <FiMail className="inline w-4 h-4 mr-1" />
                  Contact Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  <FiPhone className="inline w-4 h-4 mr-1" />
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Sponsorship Categories</h2>
          <p className="text-sm text-text-muted mb-4">
            Select the categories that best represent your brand (at least one required)
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {categories.map(category => (
              <button
                key={category.slug}
                onClick={() => toggleCategory(category.slug)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedCategories.includes(category.slug)
                    ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple'
                    : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                }`}
              >
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Regions */}
        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Preferred Regions</h2>
          <p className="text-sm text-text-muted mb-4">
            Add regions where you'd like to sponsor events
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newRegion}
              onChange={e => setNewRegion(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addRegion()}
              placeholder="e.g., New York, Los Angeles"
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
            />
            <button
              onClick={addRegion}
              className="px-4 py-2.5 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-xl text-neon-purple font-medium transition-colors"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {preferredRegions.map(region => (
              <span
                key={region}
                className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/30 rounded-full text-neon-purple text-sm"
              >
                <FiMapPin className="w-3 h-3" />
                {region}
                <button
                  onClick={() => removeRegion(region)}
                  className="hover:text-red-400 transition-colors"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))}
            {preferredRegions.length === 0 && (
              <span className="text-text-muted text-sm">No regions added yet</span>
            )}
          </div>
        </div>

        {/* Event Type Preferences */}
        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Preferred Event Types</h2>
          <p className="text-sm text-text-muted mb-4">
            Select the types of events you prefer to sponsor
          </p>

          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => toggleEventType(type.value)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  preferredEventTypes.includes(type.value)
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dance Style Preferences */}
        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Preferred Dance Styles</h2>
          <p className="text-sm text-text-muted mb-4">
            Select the dance styles that align with your brand
          </p>

          <div className="flex flex-wrap gap-2">
            {DANCE_STYLES.map(style => (
              <button
                key={style.value}
                onClick={() => toggleDanceStyle(style.value)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  preferredDanceStyles.includes(style.value)
                    ? 'bg-neon-pink/20 border-neon-pink/50 text-neon-pink'
                    : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={updating || !companyName || !contactEmail || selectedCategories.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-opacity"
          >
            <FiSave className="w-5 h-5" />
            {updating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
