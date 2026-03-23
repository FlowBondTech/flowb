'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useGetMySponsorProfileQuery, useGetSponsorDashboardQuery } from '@/src/generated/graphql'
import { useAuth } from '@/src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FiActivity,
  FiAward,
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiDollarSign,
  FiMapPin,
  FiPieChart,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiStar,
  FiTarget,
  FiUsers,
} from 'react-icons/fi'

// Tier configuration
const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; min: number }> = {
  bronze: {
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    min: 50,
  },
  silver: { color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30', min: 500 },
  gold: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    min: 1000,
  },
  platinum: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
    min: 5000,
  },
  diamond: {
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
    min: 10000,
  },
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  apparel: '/icons/categories/apparel.svg',
  music: '/icons/categories/music.svg',
  wellness: '/icons/categories/wellness.svg',
  tech: '/icons/categories/tech.svg',
  venues: '/icons/categories/venues.svg',
  local: '/icons/categories/local.svg',
  media: '/icons/categories/media.svg',
  education: '/icons/categories/education.svg',
  lifestyle: '/icons/categories/lifestyle.svg',
  corporate: '/icons/categories/corporate.svg',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function SponsorDashboardContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'suggested' | 'browse' | 'active'>('suggested')

  const { data: profileData, loading: profileLoading } = useGetMySponsorProfileQuery({
    skip: !isAuthenticated || isLoading,
  })

  const {
    data: dashboardData,
    loading: dashboardLoading,
    refetch,
  } = useGetSponsorDashboardQuery({
    skip: !isAuthenticated || isLoading || !profileData?.mySponsorProfile,
  })


  // Check if user has a sponsor profile
  const hasSponsorProfile = profileData?.mySponsorProfile

  if (isLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-neon-purple/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-neon-purple rounded-full animate-spin" />
            </div>
            <p className="text-text-secondary animate-pulse">Loading sponsor dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // If no sponsor profile, show onboarding prompt
  if (!hasSponsorProfile) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-gradient-to-br from-bg-secondary via-bg-secondary to-bg-card rounded-3xl border border-neon-purple/20 p-8 sm:p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center">
              <FiAward className="text-neon-purple" size={40} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              Become a <span className="text-neon-purple">FlowBond</span> Sponsor
            </h1>
            <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto">
              Support the dance community, fund events, and connect with passionate dancers. Your
              sponsorship helps artists and creators thrive.
            </p>

            {/* Benefits */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-bg-primary/50 rounded-xl p-4">
                <FiTarget className="text-neon-purple mx-auto mb-2" size={24} />
                <h3 className="font-semibold text-text-primary mb-1">Targeted Reach</h3>
                <p className="text-text-secondary text-sm">
                  Connect with dancers in your preferred categories
                </p>
              </div>
              <div className="bg-bg-primary/50 rounded-xl p-4">
                <FiUsers className="text-neon-pink mx-auto mb-2" size={24} />
                <h3 className="font-semibold text-text-primary mb-1">Community Impact</h3>
                <p className="text-text-secondary text-sm">
                  Support workers and volunteers directly
                </p>
              </div>
              <div className="bg-bg-primary/50 rounded-xl p-4">
                <FiPieChart className="text-blue-400 mx-auto mb-2" size={24} />
                <h3 className="font-semibold text-text-primary mb-1">Transparent Tracking</h3>
                <p className="text-text-secondary text-sm">See exactly where your funds go</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard/sponsor/onboarding')}
              className="px-8 py-4 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl text-white font-semibold text-lg hover:shadow-lg hover:shadow-neon-purple/30 transition-all"
            >
              Start Sponsor Profile
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // sponsor is guaranteed to exist after the hasSponsorProfile check above
  const sponsor = profileData.mySponsorProfile!
  const dashboard = dashboardData?.sponsorDashboard
  const tierConfig = TIER_CONFIG[sponsor.tier.toLowerCase()] || TIER_CONFIG.bronze

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header Section */}
        <div className="relative mb-8">
          {/* Background Glow */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-neon-purple/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-neon-pink/15 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Hero Card */}
          <div className="relative bg-gradient-to-br from-bg-secondary/90 via-bg-secondary to-bg-card/90 backdrop-blur-xl rounded-3xl border border-neon-purple/20 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple via-neon-pink to-neon-purple" />

            {/* Settings Button */}
            <button
              onClick={() => router.push('/dashboard/sponsor/settings')}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 bg-bg-primary/50 hover:bg-bg-primary border border-white/10 hover:border-neon-purple/50 rounded-xl text-text-secondary hover:text-neon-purple transition-all z-10 backdrop-blur-sm"
              aria-label="Sponsor Settings"
            >
              <FiSettings size={20} />
            </button>

            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6 lg:gap-8">
                {/* Logo & Company Info */}
                <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                  <div className="relative shrink-0">
                    {sponsor.logoUrl ? (
                      <img
                        src={sponsor.logoUrl}
                        alt={sponsor.companyName}
                        className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-neon-purple/30"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white text-2xl sm:text-3xl font-bold border-2 border-neon-purple/30">
                        {sponsor.companyName.charAt(0)}
                      </div>
                    )}
                    {/* Tier Badge */}
                    <div
                      className={`absolute -bottom-2 -right-2 px-3 py-1 ${tierConfig.bg} ${tierConfig.border} border rounded-full ${tierConfig.color} text-xs font-bold uppercase`}
                    >
                      {sponsor.tier}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary truncate">
                        {sponsor.companyName}
                      </h1>
                      {sponsor.isVerified && (
                        <div className="p-1 bg-blue-500/20 rounded-full shrink-0">
                          <FiCheck className="text-blue-400" size={14} />
                        </div>
                      )}
                    </div>
                    <p className="text-text-secondary text-sm sm:text-base truncate">
                      {sponsor.categories.slice(0, 3).join(' • ')}
                      {sponsor.categories.length > 3 && ` +${sponsor.categories.length - 3}`}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 lg:ml-auto">
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-bg-primary/60 rounded-xl border border-neon-purple/10 min-w-0">
                    <FiDollarSign className="text-green-400 shrink-0" size={18} />
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-bold text-text-primary leading-none truncate">
                        {formatCurrency(sponsor.totalFlowContributed)}
                      </p>
                      <p className="text-xs text-text-muted">Total Invested</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-bg-primary/60 rounded-xl border border-neon-purple/10 min-w-0">
                    <FiCalendar className="text-neon-purple shrink-0" size={18} />
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-bold text-text-primary leading-none">
                        {sponsor.totalEventsSponsored}
                      </p>
                      <p className="text-xs text-text-muted">Events</p>
                    </div>
                  </div>
                  {sponsor.impactScore && (
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-bg-primary/60 rounded-xl border border-neon-purple/10 min-w-0">
                      <FiStar className="text-yellow-400 shrink-0" size={18} />
                      <div className="min-w-0">
                        <p className="text-base sm:text-lg font-bold text-text-primary leading-none">
                          {sponsor.impactScore.grade}
                        </p>
                        <p className="text-xs text-text-muted">Impact</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <button
            onClick={() => setActiveTab('suggested')}
            className="group bg-gradient-to-br from-neon-purple/20 to-neon-purple/5 hover:from-neon-purple/30 hover:to-neon-purple/10 rounded-2xl border border-neon-purple/30 hover:border-neon-purple/50 p-4 sm:p-5 transition-all text-left flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <FiTarget className="text-neon-purple" size={20} />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-text-primary mb-1">
              {dashboard?.suggestedEvents?.length || 0}
            </p>
            <p className="text-xs sm:text-sm text-text-secondary">Suggested Events</p>
            <div className="flex items-center gap-1 mt-auto pt-3 text-neon-purple text-sm font-medium group-hover:gap-2 transition-all">
              <span>View All</span>
              <FiChevronRight size={16} />
            </div>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className="group bg-gradient-to-br from-green-500/20 to-green-500/5 hover:from-green-500/30 hover:to-green-500/10 rounded-2xl border border-green-500/30 hover:border-green-500/50 p-4 sm:p-5 transition-all text-left flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <FiActivity className="text-green-400" size={20} />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-text-primary mb-1">
              {dashboard?.activeSponsorships?.length || 0}
            </p>
            <p className="text-xs sm:text-sm text-text-secondary">Active Sponsorships</p>
            <div className="flex items-center gap-1 mt-auto pt-3 text-green-400 text-sm font-medium group-hover:gap-2 transition-all">
              <span>Manage</span>
              <FiChevronRight size={16} />
            </div>
          </button>

          <button
            onClick={() => setActiveTab('browse')}
            className="group bg-gradient-to-br from-blue-500/20 to-blue-500/5 hover:from-blue-500/30 hover:to-blue-500/10 rounded-2xl border border-blue-500/30 hover:border-blue-500/50 p-4 sm:p-5 transition-all text-left flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <FiSearch className="text-blue-400" size={20} />
            </div>
            <p className="text-base sm:text-lg font-bold text-text-primary mb-1">Browse</p>
            <p className="text-xs sm:text-sm text-text-secondary">Find events to sponsor</p>
            <div className="flex items-center gap-1 mt-auto pt-3 text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
              <span>Explore</span>
              <FiChevronRight size={16} />
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard/sponsor/subscription')}
            className="group bg-gradient-to-br from-neon-pink/20 to-neon-pink/5 hover:from-neon-pink/30 hover:to-neon-pink/10 rounded-2xl border border-neon-pink/30 hover:border-neon-pink/50 p-4 sm:p-5 transition-all text-left flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-neon-pink/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <FiRefreshCw className="text-neon-pink" size={20} />
            </div>
            <p className="text-base sm:text-lg font-bold text-text-primary mb-1">Subscriptions</p>
            <p className="text-xs sm:text-sm text-text-secondary">Auto-sponsor events</p>
            <div className="flex items-center gap-1 mt-auto pt-3 text-neon-pink text-sm font-medium group-hover:gap-2 transition-all">
              <span>Setup</span>
              <FiChevronRight size={16} />
            </div>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mb-1 scrollbar-none">
          {[
            { key: 'suggested', label: 'Suggested', labelFull: 'Suggested Events', icon: FiTarget },
            { key: 'active', label: 'Active', labelFull: 'Active Sponsorships', icon: FiActivity },
            { key: 'browse', label: 'Browse', labelFull: 'Browse Events', icon: FiSearch },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab.key
                  ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-white/5'
              }`}
            >
              <tab.icon size={18} className="shrink-0" />
              <span className="sm:hidden">{tab.label}</span>
              <span className="hidden sm:inline">{tab.labelFull}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 p-4 sm:p-6">
          {activeTab === 'suggested' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text-primary">Suggested Events</h2>
                <button
                  onClick={() => refetch()}
                  className="flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-neon-purple transition-colors"
                >
                  <FiRefreshCw size={16} />
                  <span className="text-sm">Refresh</span>
                </button>
              </div>

              {dashboardLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-neon-purple/20 border-t-neon-purple rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-secondary">Loading suggestions...</p>
                </div>
              ) : dashboard?.suggestedEvents && dashboard.suggestedEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboard.suggestedEvents.map(suggestion => (
                    <SuggestedEventCard key={suggestion.event.id} suggestion={suggestion} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neon-purple/10 flex items-center justify-center">
                    <FiCalendar className="text-neon-purple" size={28} />
                  </div>
                  <p className="text-text-secondary mb-4">No suggested events right now</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-xl text-neon-purple font-medium transition-colors"
                  >
                    Browse All Events
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'active' && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-6">Active Sponsorships</h2>

              {dashboard?.activeSponsorships && dashboard.activeSponsorships.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.activeSponsorships.map(sponsorship => (
                    <ActiveSponsorshipCard key={sponsorship.id} sponsorship={sponsorship} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center">
                    <FiActivity className="text-green-400" size={28} />
                  </div>
                  <p className="text-text-secondary mb-4">No active sponsorships yet</p>
                  <button
                    onClick={() => setActiveTab('suggested')}
                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl text-green-400 font-medium transition-colors"
                  >
                    View Suggested Events
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'browse' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text-primary">Browse Events</h2>
                <button
                  onClick={() => router.push('/dashboard/sponsor/events')}
                  className="text-neon-purple hover:underline text-sm font-medium"
                >
                  Advanced Search
                </button>
              </div>

              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <FiSearch className="text-blue-400" size={28} />
                </div>
                <p className="text-text-secondary mb-4">Explore events looking for sponsors</p>
                <button
                  onClick={() => router.push('/dashboard/sponsor/events')}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 font-medium transition-colors"
                >
                  Open Event Browser
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats & Analytics Section */}
        {dashboard?.stats && (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 p-4 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="p-2 rounded-xl bg-green-500/10 shrink-0">
                  <FiDollarSign className="text-green-400" size={18} />
                </div>
                <span className="text-text-secondary text-xs sm:text-sm">Total Invested</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-text-primary truncate">
                {formatCurrency(dashboard.stats.totalInvested)}
              </p>
            </div>

            <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 p-4 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="p-2 rounded-xl bg-neon-purple/10 shrink-0">
                  <FiCalendar className="text-neon-purple" size={18} />
                </div>
                <span className="text-text-secondary text-xs sm:text-sm">Events Sponsored</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-text-primary">
                {dashboard.stats.totalEventsSponsored}
              </p>
            </div>

            <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 p-4 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="p-2 rounded-xl bg-blue-500/10 shrink-0">
                  <FiUsers className="text-blue-400" size={18} />
                </div>
                <span className="text-text-secondary text-xs sm:text-sm">Workers Supported</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-text-primary">
                {formatNumber(dashboard.stats.totalWorkersSupported)}
              </p>
            </div>

            <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 p-4 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="p-2 rounded-xl bg-yellow-500/10 shrink-0">
                  <FiStar className="text-yellow-400" size={18} />
                </div>
                <span className="text-text-secondary text-xs sm:text-sm">Avg Event Rating</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-text-primary">
                {dashboard.stats.averageEventRating?.toFixed(1) || '-'}
              </p>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {dashboard?.recentActivity && dashboard.recentActivity.length > 0 && (
          <div className="mt-8 bg-bg-secondary rounded-2xl border border-neon-purple/10 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {dashboard.recentActivity.slice(0, 5).map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 p-3 bg-bg-primary/50 rounded-xl"
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      transaction.transactionType === 'sponsor_deposit'
                        ? 'bg-green-500/10'
                        : transaction.transactionType === 'gig_payment'
                          ? 'bg-blue-500/10'
                          : 'bg-neon-purple/10'
                    }`}
                  >
                    <FiDollarSign
                      className={
                        transaction.transactionType === 'sponsor_deposit'
                          ? 'text-green-400'
                          : transaction.transactionType === 'gig_payment'
                            ? 'text-blue-400'
                            : 'text-neon-purple'
                      }
                      size={16}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary font-medium text-sm truncate">
                      {transaction.description || transaction.transactionType.replace('_', ' ')}
                    </p>
                    <p className="text-text-muted text-xs">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p
                    className={`font-bold text-sm sm:text-base shrink-0 ${
                      transaction.transactionType === 'sponsor_deposit'
                        ? 'text-green-400'
                        : 'text-text-primary'
                    }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// Suggested Event Card Component
function SuggestedEventCard({ suggestion }: { suggestion: any }) {
  const router = useRouter()
  const event = suggestion.event

  return (
    <div className="bg-bg-primary/50 rounded-xl border border-white/5 hover:border-neon-purple/30 transition-all overflow-hidden group">
      {/* Image */}
      <div className="relative h-28 sm:h-32 overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center">
            <FiCalendar className="text-neon-purple" size={32} />
          </div>
        )}
        {/* Match Score Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/90 rounded-lg text-white text-xs font-bold">
          {Math.round(suggestion.matchScore * 100)}% Match
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-text-primary mb-1 truncate">{event.title}</h3>
        <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
          <FiMapPin size={14} />
          <span className="truncate">{event.location_name}</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary text-sm mb-3">
          <FiCalendar size={14} />
          <span>{new Date(event.start_date_time).toLocaleDateString()}</span>
        </div>

        {/* Match Reasons */}
        {suggestion.matchReasons && suggestion.matchReasons.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {suggestion.matchReasons.slice(0, 2).map((reason: string, i: number) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-neon-purple/10 text-neon-purple text-xs rounded-full"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={() => router.push(`/dashboard/sponsor/event/${event.id}`)}
          className="w-full py-2.5 sm:py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-lg text-neon-purple font-medium text-sm transition-colors"
        >
          View & Sponsor
        </button>
      </div>
    </div>
  )
}

// Active Sponsorship Card Component
function ActiveSponsorshipCard({ sponsorship }: { sponsorship: any }) {
  const router = useRouter()
  const event = sponsorship.event
  const progress = (sponsorship.flowDistributed / sponsorship.flowAmount) * 100

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-bg-primary/50 rounded-xl border border-white/5">
      {/* Event Image */}
      <div className="hidden sm:block w-16 sm:w-20 h-16 sm:h-20 rounded-lg overflow-hidden shrink-0">
        {event?.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center">
            <FiCalendar className="text-neon-purple" size={24} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 sm:justify-start">
          <h3 className="font-semibold text-text-primary truncate">
            {event?.title || 'Unknown Event'}
          </h3>
          {/* Amount & Status — inline on mobile */}
          <div className="flex items-center gap-2 sm:hidden shrink-0">
            <p className="text-sm font-bold text-text-primary">
              {formatCurrency(sponsorship.flowAmount)}
            </p>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                sponsorship.status === 'active'
                  ? 'bg-green-500/20 text-green-400'
                  : sponsorship.status === 'completed'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {sponsorship.status}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-secondary text-sm mt-1">
          <span className="flex items-center gap-1">
            <FiMapPin size={14} className="shrink-0" />
            <span className="truncate">{event?.location_name}</span>
          </span>
          <span className="flex items-center gap-1">
            <FiCalendar size={14} className="shrink-0" />
            {event?.start_date_time ? new Date(event.start_date_time).toLocaleDateString() : '-'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-text-muted">Distribution Progress</span>
            <span className="text-neon-purple font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Amount & Status — side column on desktop */}
      <div className="hidden sm:flex sm:flex-col items-end gap-1 shrink-0">
        <p className="text-lg font-bold text-text-primary">
          {formatCurrency(sponsorship.flowAmount)}
        </p>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            sponsorship.status === 'active'
              ? 'bg-green-500/20 text-green-400'
              : sponsorship.status === 'completed'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-yellow-500/20 text-yellow-400'
          }`}
        >
          {sponsorship.status}
        </span>
      </div>
    </div>
  )
}

export default function SponsorDashboardPage() {
  return <SponsorDashboardContent />
}
