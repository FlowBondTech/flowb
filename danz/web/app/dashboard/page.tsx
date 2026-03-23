'use client'

import AchievementsWidget from '@/src/components/dashboard/AchievementsWidget'
import ActivityStatsWidget from '@/src/components/dashboard/ActivityStatsWidget'
import DanceBondsWidget from '@/src/components/dashboard/DanceBondsWidget'
import DanceStyleProgressWidget from '@/src/components/dashboard/DanceStyleProgressWidget'
import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import LeaderboardWidget from '@/src/components/dashboard/LeaderboardWidget'
import NotificationsCenterWidget from '@/src/components/dashboard/NotificationsCenterWidget'
import PracticeLogWidget from '@/src/components/dashboard/PracticeLogWidget'
import RecentActivityFeed from '@/src/components/dashboard/RecentActivityFeed'
import UpcomingEventsWidget from '@/src/components/dashboard/UpcomingEventsWidget'
import UserStatsCard from '@/src/components/dashboard/UserStatsCard'
import WeeklyChallengesWidget from '@/src/components/dashboard/WeeklyChallengesWidget'
import { useAuth } from '@/src/contexts/AuthContext'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { FaTiktok } from 'react-icons/fa'
import {
  FiActivity,
  FiCalendar,
  FiChevronRight,
  FiEdit3,
  FiHeart,
  FiInstagram,
  FiMapPin,
  FiMusic,
  FiPlus,
  FiSettings,
  FiStar,
  FiTwitter,
  FiUser,
  FiUsers,
  FiX,
  FiYoutube,
  FiZap,
} from 'react-icons/fi'

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  mover: 'Mover',
  regular: 'Regular',
  star: 'Star Dancer',
}

function OnboardingBanner() {
  const { needsOnboarding, profileCompleteness, onboardingSnoozed, onboardingRetired, snoozeOnboarding } = useAuth()
  const router = useRouter()

  // Don't show if profile is complete, snoozed, or retired (3 dismissals)
  if (!needsOnboarding || onboardingSnoozed || onboardingRetired) return null

  const { percentage, steps, tier } = profileCompleteness
  const incompleteSteps = steps.filter(s => !s.completed)
  // Show up to 2 missing items as hints
  const hints = incompleteSteps.slice(0, 2)

  return (
    <div className="mb-6 bg-gradient-to-br from-bg-secondary/90 to-bg-card/90 border border-neon-purple/20 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
      {/* Subtle accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-purple via-neon-pink to-neon-purple" />

      <button
        onClick={snoozeOnboarding}
        className="absolute top-3 right-3 p-1.5 text-text-muted hover:text-text-primary transition-colors z-10"
        aria-label="Dismiss for 3 days"
        title="Remind me later"
      >
        <FiX size={18} />
      </button>

      <div className="flex flex-col gap-4 pr-6">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
            <FiUser className="text-neon-purple" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-text-primary font-medium text-sm sm:text-base">
                Complete your profile
              </p>
              <span className="px-2 py-0.5 bg-neon-purple/15 border border-neon-purple/20 rounded-full text-neon-purple text-xs font-medium">
                {TIER_LABELS[tier]}
              </span>
            </div>
            <p className="text-text-muted text-xs mt-0.5">
              Dancers with complete profiles get 3x more connections
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-secondary">{percentage}% complete</span>
            <span className="text-xs text-text-muted">
              {steps.filter(s => s.completed).length}/{steps.length} steps
            </span>
          </div>
          <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full transition-all duration-700"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Missing steps hints + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {hints.length > 0 && (
            <div className="flex-1 flex flex-wrap gap-2">
              {hints.map(step => (
                <span
                  key={step.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-primary/60 border border-white/5 rounded-lg text-xs text-text-secondary"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-pink/60" />
                  {step.label}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={snoozeOnboarding}
              className="px-3 py-1.5 text-text-muted hover:text-text-secondary text-xs transition-colors whitespace-nowrap"
            >
              Not now
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Complete Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const { isAuthenticated, isLoading, user, email } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const { data, loading, error, refetch } = useGetMyProfileQuery({
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  })

  useEffect(() => {
    if (
      searchParams.get('session_id') ||
      searchParams.get('success') ||
      searchParams.get('session')
    ) {
      refetch()
    }
  }, [searchParams, refetch])

  const [showAvatarModal, setShowAvatarModal] = useState(false)

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-neon-purple/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-neon-purple rounded-full animate-spin" />
            </div>
            <p className="text-text-secondary animate-pulse">Loading your dance journey...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-gradient-to-br from-red-500/10 to-red-900/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <FiZap className="text-red-400" size={28} />
            </div>
            <p className="text-red-400 font-semibold text-lg mb-2">Connection Error</p>
            <p className="text-text-secondary text-sm mb-4">
              We couldn't load your profile. Please try again.
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 font-medium transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const profile = data?.me

  // Calculate level title based on level
  const getLevelTitle = (level: number) => {
    if (level >= 50) return 'Dance Legend'
    if (level >= 30) return 'Dance Master'
    if (level >= 20) return 'Groove Expert'
    if (level >= 10) return 'Rhythm Rider'
    if (level >= 5) return 'Beat Seeker'
    return 'Fresh Mover'
  }

  // Calculate XP progress percentage
  const xpProgress = Math.min(((profile?.xp || 0) % 1000) / 10, 100)
  const xpToNext = 1000 - ((profile?.xp || 0) % 1000)

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Onboarding Banner */}
        <OnboardingBanner />

        {/* ═══════════════════════════════════════════════════════════════════
            HERO SECTION - Identity & Level
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative mb-8">
          {/* Background Glow Effects */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-neon-purple/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-neon-pink/15 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Hero Card */}
          <div className="relative bg-gradient-to-br from-bg-secondary/90 via-bg-secondary to-bg-card/90 backdrop-blur-xl rounded-3xl border border-neon-purple/20 overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple via-neon-pink to-neon-purple" />

            {/* Settings Icon */}
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 bg-bg-primary/50 hover:bg-bg-primary border border-white/10 hover:border-neon-purple/50 rounded-xl text-text-secondary hover:text-neon-purple transition-all z-10 backdrop-blur-sm"
              aria-label="Edit Profile"
            >
              <FiSettings size={20} />
            </button>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
                {/* Avatar with Level Ring */}
                <div className="flex items-center gap-5">
                  <div className="relative group">
                    {/* Rotating Level Ring */}
                    <div className="absolute -inset-2">
                      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-neon-purple/20"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="url(#levelGradient)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${xpProgress * 2.83} 283`}
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#b967ff" />
                            <stop offset="100%" stopColor="#ff6ec7" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    {/* Avatar */}
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name || 'Avatar'}
                        onClick={() => setShowAvatarModal(true)}
                        className="w-24 h-24 rounded-full object-cover border-2 border-bg-secondary relative z-10 cursor-pointer hover:border-neon-purple transition-colors"
                      />
                    ) : (
                      <div
                        onClick={() => setShowAvatarModal(true)}
                        className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white text-3xl font-bold relative z-10 border-2 border-bg-secondary cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        {profile?.username?.charAt(0).toUpperCase() || 'D'}
                      </div>
                    )}

                    {/* Avatar Edit Icon - positioned at bottom left to avoid level badge */}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        router.push('/dashboard/profile')
                      }}
                      className="absolute bottom-0 left-0 p-2 bg-gradient-to-br from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 rounded-full text-white transition-all shadow-lg hover:shadow-neon-purple/50 hover:scale-110 z-30 border-2 border-bg-secondary"
                      aria-label="Edit profile picture"
                    >
                      <FiEdit3 size={14} />
                    </button>

                    {/* Level Badge */}
                    <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-gradient-to-br from-neon-purple to-neon-pink rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-neon-purple/30 z-20 border-2 border-bg-secondary">
                      {profile?.level || 1}
                    </div>
                  </div>

                  {/* Name & Title */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                        {profile?.display_name || profile?.username || 'Dancer'}
                      </h1>
                      {profile?.is_premium === 'active' && (
                        <div className="px-2 py-0.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-full">
                          <FiStar className="text-amber-400" size={14} />
                        </div>
                      )}
                    </div>
                    <p className="text-text-secondary">@{profile?.username}</p>
                    <p className="text-neon-purple font-medium mt-1">
                      {getLevelTitle(profile?.level || 1)}
                    </p>
                  </div>
                </div>

                {/* XP Progress Bar - Desktop */}
                <div className="hidden lg:flex flex-1 items-center">
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">Level Progress</span>
                      <span className="text-sm font-medium text-neon-purple">
                        {profile?.xp || 0} XP
                      </span>
                    </div>
                    <div className="h-2.5 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${xpProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1.5">{xpToNext} XP to level up</p>
                  </div>
                </div>

                {/* Quick Stats Pills */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-primary/60 rounded-xl border border-neon-purple/10">
                    <FiZap className="text-yellow-400" size={18} />
                    <div>
                      <p className="text-lg font-bold text-text-primary leading-none">
                        {profile?.longest_streak || 0}
                      </p>
                      <p className="text-xs text-text-muted">Day Streak</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-primary/60 rounded-xl border border-neon-purple/10">
                    <FiHeart className="text-pink-400" size={18} />
                    <div>
                      <p className="text-lg font-bold text-text-primary leading-none">
                        {profile?.dance_bonds_count || 0}
                      </p>
                      <p className="text-xs text-text-muted">Bonds</p>
                    </div>
                  </div>
                  {profile?.city && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-primary/60 rounded-xl border border-neon-purple/10">
                      <FiMapPin className="text-neon-blue" size={18} />
                      <p className="text-sm text-text-secondary">{profile.city}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* XP Progress Bar - Mobile */}
              <div className="lg:hidden mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Level Progress</span>
                  <span className="text-sm font-medium text-neon-purple">
                    {profile?.xp || 0} XP
                  </span>
                </div>
                <div className="h-2.5 bg-bg-primary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full transition-all duration-1000"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1.5">{xpToNext} XP to level up</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            QUICK ACTIONS - Primary CTAs
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard/my-events')}
            className="group bg-gradient-to-br from-neon-purple/20 to-neon-purple/5 hover:from-neon-purple/30 hover:to-neon-purple/10 rounded-2xl border border-neon-purple/30 hover:border-neon-purple/50 p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-neon-purple/20 text-left flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <FiCalendar className="text-neon-purple" size={20} />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-text-primary mb-1">
              {profile?.upcoming_events_count || 0}
            </p>
            <p className="text-xs sm:text-sm text-text-secondary">Upcoming Events</p>
            <div className="flex items-center gap-1 mt-auto pt-3 text-neon-purple text-sm font-medium group-hover:gap-2 transition-all">
              <span>View All</span>
              <FiChevronRight size={16} />
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard/my-events/create')}
            className="group bg-gradient-to-br from-neon-pink/20 to-neon-pink/5 hover:from-neon-pink/30 hover:to-neon-pink/10 rounded-2xl border border-neon-pink/30 hover:border-neon-pink/50 p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-neon-pink/20 text-left flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-neon-pink/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <FiPlus className="text-neon-pink" size={20} />
            </div>
            <p className="text-base sm:text-lg font-bold text-text-primary mb-1">Host Event</p>
            <p className="text-xs sm:text-sm text-text-secondary">Create a dance session</p>
            <div className="flex items-center gap-1 mt-auto pt-3 text-neon-pink text-sm font-medium group-hover:gap-2 transition-all">
              <span>Create</span>
              <FiChevronRight size={16} />
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard/feed')}
            className="group bg-gradient-to-br from-blue-500/20 to-blue-500/5 hover:from-blue-500/30 hover:to-blue-500/10 rounded-2xl border border-blue-500/30 hover:border-blue-500/50 p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 text-left flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <FiActivity className="text-blue-400" size={20} />
            </div>
            <p className="text-base sm:text-lg font-bold text-text-primary mb-1">Activity</p>
            <p className="text-xs sm:text-sm text-text-secondary">See community feed</p>
            <div className="flex items-center gap-1 mt-auto pt-3 text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
              <span>Explore</span>
              <FiChevronRight size={16} />
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard/profile')}
            className="group bg-gradient-to-br from-green-500/20 to-green-500/5 hover:from-green-500/30 hover:to-green-500/10 rounded-2xl border border-green-500/30 hover:border-green-500/50 p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 text-left flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <FiEdit3 className="text-green-400" size={20} />
            </div>
            <p className="text-base sm:text-lg font-bold text-text-primary mb-1">Profile</p>
            <p className="text-xs sm:text-sm text-text-secondary">Edit your info</p>
            <div className="flex items-center gap-1 mt-auto pt-3 text-green-400 text-sm font-medium group-hover:gap-2 transition-all">
              <span>Edit</span>
              <FiChevronRight size={16} />
            </div>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            ENHANCED DASHBOARD WIDGETS
        ═══════════════════════════════════════════════════════════════════ */}

        {/* Row 1: Upcoming Events + Practice Log */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <UpcomingEventsWidget />
          </div>
          <div>
            <PracticeLogWidget />
          </div>
        </div>

        {/* Row 2: Activity Stats (Full Width) */}
        <div className="mb-6">
          <ActivityStatsWidget />
        </div>

        {/* Row 3: Recent Activity Feed + Notifications */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <RecentActivityFeed />
          </div>
          <div>
            <NotificationsCenterWidget />
          </div>
        </div>

        {/* Row 4: All-Time Stats (Full Width) */}
        <div className="mb-6">
          <UserStatsCard />
        </div>

        {/* Row 5: Achievements + Dance Bonds + Leaderboard */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <AchievementsWidget />
          <DanceBondsWidget />
          <LeaderboardWidget />
        </div>

        {/* Row 6: Weekly Challenges + Dance Style Progress */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <WeeklyChallengesWidget />
          <DanceStyleProgressWidget />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            BOTTOM SECTION - Profile Details & Account
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dance Styles */}
          <div className="lg:col-span-2">
            {profile?.dance_styles && profile.dance_styles.length > 0 ? (
              <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <FiMusic className="text-neon-purple" />
                  Dance Styles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.dance_styles.map((style: string) => (
                    <span
                      key={style}
                      className="px-4 py-2 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 border border-neon-purple/30 text-text-primary rounded-full text-sm font-medium hover:border-neon-purple/50 transition-colors"
                    >
                      {style}
                    </span>
                  ))}
                </div>
                {profile.bio && (
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <p className="text-text-secondary text-sm leading-relaxed">{profile.bio}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 border-dashed p-6">
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neon-purple/10 flex items-center justify-center">
                    <FiMusic className="text-neon-purple" size={24} />
                  </div>
                  <p className="text-text-secondary mb-3">Add your dance styles</p>
                  <button
                    onClick={() => router.push('/dashboard/profile')}
                    className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-lg text-neon-purple text-sm font-medium transition-colors"
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account & Social */}
          <div className="space-y-4">
            {/* Account Info */}
            <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 p-5">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Account</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Email</span>
                  <span className="text-text-primary truncate max-w-[180px]">
                    {email || 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Member Since</span>
                  <span className="text-text-primary">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Role</span>
                  <span className="text-text-primary capitalize">{profile?.role || 'Dancer'}</span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            {(profile?.instagram || profile?.twitter || profile?.tiktok || profile?.youtube) && (
              <div className="bg-bg-secondary rounded-2xl border border-neon-purple/10 p-5">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Social</h3>
                <div className="flex gap-3">
                  {profile.instagram && (
                    <a
                      href={`https://instagram.com/${profile.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400 hover:from-pink-500/30 hover:to-purple-500/30 transition-colors"
                    >
                      <FiInstagram size={18} />
                    </a>
                  )}
                  {profile.twitter && (
                    <a
                      href={`https://twitter.com/${profile.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                      <FiTwitter size={18} />
                    </a>
                  )}
                  {profile.tiktok && (
                    <a
                      href={`https://tiktok.com/@${profile.tiktok}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-bg-primary flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <FaTiktok size={18} />
                    </a>
                  )}
                  {profile.youtube && (
                    <a
                      href={`https://youtube.com/${profile.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <FiYoutube size={18} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {profile === null && (
          <div className="bg-bg-secondary rounded-2xl border border-neon-purple/20 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-purple/20 flex items-center justify-center">
              <FiUsers className="text-neon-purple" size={28} />
            </div>
            <p className="text-text-secondary mb-4">
              Complete your registration to start your dance journey
            </p>
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl text-white font-medium hover:shadow-lg hover:shadow-neon-purple/30 transition-all"
            >
              Complete Registration
            </button>
          </div>
        )}
      </div>

      {/* Avatar View Modal */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowAvatarModal(false)}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            {/* Large Avatar */}
            <div className="relative w-80 h-80 sm:w-96 sm:h-96">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || 'Avatar'}
                  className="w-full h-full rounded-full object-cover border-4 border-neon-purple/50 shadow-2xl shadow-neon-purple/30"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white text-9xl font-bold border-4 border-neon-purple/50 shadow-2xl shadow-neon-purple/30">
                  {profile?.username?.charAt(0).toUpperCase() || 'D'}
                </div>
              )}

              {/* Edit Icon */}
              <button
                onClick={() => {
                  setShowAvatarModal(false)
                  router.push('/dashboard/profile')
                }}
                className="absolute bottom-4 right-4 p-4 bg-gradient-to-br from-neon-purple to-neon-pink rounded-full text-white shadow-lg hover:shadow-neon-purple/50 transition-all hover:scale-110"
                aria-label="Edit Avatar"
              >
                <FiEdit3 size={24} />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowAvatarModal(false)}
              className="absolute -top-4 -right-4 p-3 bg-bg-primary border border-white/20 rounded-full text-text-primary hover:text-neon-purple hover:border-neon-purple/50 transition-all shadow-lg"
              aria-label="Close"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-neon-purple/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-neon-purple rounded-full animate-spin" />
              </div>
              <p className="text-text-secondary">Loading...</p>
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
