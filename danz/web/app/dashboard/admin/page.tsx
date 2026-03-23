'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useAuth } from '@/src/contexts/AuthContext'
import { useGetMyProfileQuery, useGetPointsOverviewQuery } from '@/src/generated/graphql'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  FiActivity,
  FiAward,
  FiCalendar,
  FiDollarSign,
  FiSettings,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'

export default function AdminDashboardPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const { data: profileData, loading: profileLoading } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })

  const { data: overviewData, loading: overviewLoading } = useGetPointsOverviewQuery({
    skip: !isAuthenticated || profileData?.me?.role !== 'admin',
  })


  useEffect(() => {
    // Redirect non-admins
    if (!isLoading && isAuthenticated && !profileLoading && profileData?.me?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileData, profileLoading, router])

  if (isLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-primary text-2xl" role="status" aria-live="polite">
            Loading...
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (profileData?.me?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-red-400 text-xl" role="alert">
            Access Denied - Admin Only
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const overview = overviewData?.getPointsOverview

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary">
              Admin Dashboard
            </h1>
            <p className="text-text-secondary mt-1 text-sm sm:text-base">
              Manage points & analytics
            </p>
          </div>
          <div
            className="bg-gradient-neon px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex-shrink-0"
            aria-label="Admin role badge"
          >
            <span className="text-text-primary font-medium text-xs sm:text-sm">⚡ Admin</span>
          </div>
        </div>

        {/* Overview Stats - Fluid grid that adapts to text scaling */}
        {!overviewLoading && overview && (
          <div
            className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(140px,1fr))] lg:grid-cols-4 mb-6 sm:mb-8"
            role="region"
            aria-label="Points overview statistics"
          >
            <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-3 sm:p-4 md:p-6 min-h-[100px]">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                <FiDollarSign
                  className="text-neon-purple flex-shrink-0"
                  size={20}
                  aria-hidden="true"
                />
                <span className="text-xs text-text-secondary uppercase tracking-wider">Issued</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-text-primary break-words">
                {overview.total_points_issued.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Points</p>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-3 sm:p-4 md:p-6 min-h-[100px]">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                <FiUsers className="text-neon-pink flex-shrink-0" size={20} aria-hidden="true" />
                <span className="text-xs text-text-secondary uppercase tracking-wider">Users</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-text-primary break-words">
                {overview.total_active_users.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Active</p>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-3 sm:p-4 md:p-6 min-h-[100px]">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                <FiActivity className="text-blue-400 flex-shrink-0" size={20} aria-hidden="true" />
                <span className="text-xs text-text-secondary uppercase tracking-wider">Avg</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-text-primary break-words">
                {Math.round(overview.avg_points_per_user).toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Per User</p>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-3 sm:p-4 md:p-6 min-h-[100px]">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                <FiTrendingUp
                  className="text-green-400 flex-shrink-0"
                  size={20}
                  aria-hidden="true"
                />
                <span className="text-xs text-text-secondary uppercase tracking-wider">Today</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-text-primary break-words">
                {overview.points_issued_today.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Issued</p>
            </div>
          </div>
        )}

        {/* Quick Actions - Fluid grid with minimum touch targets */}
        <nav aria-label="Admin quick actions">
          <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:grid-cols-3 mb-6 sm:mb-8">
            <button
              onClick={() => router.push('/dashboard/admin/points')}
              className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-4 sm:p-6 hover:border-neon-purple/50 active:bg-white/5 transition-colors text-left group min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              aria-label="Configure point values and rewards"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-neon-purple/20 rounded-lg group-hover:bg-neon-purple/30 transition-colors w-fit">
                  <FiSettings className="text-neon-purple" size={20} aria-hidden="true" />
                </div>
                <h2 className="text-sm sm:text-lg font-semibold text-text-primary">Points</h2>
              </div>
              <p className="text-text-secondary text-xs sm:text-sm">Configure values & rewards</p>
            </button>

            <button
              onClick={() => router.push('/dashboard/admin/analytics')}
              className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-4 sm:p-6 hover:border-neon-purple/50 active:bg-white/5 transition-colors text-left group min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              aria-label="View user points summaries"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-neon-pink/20 rounded-lg group-hover:bg-neon-pink/30 transition-colors w-fit">
                  <FiTrendingUp className="text-neon-pink" size={20} aria-hidden="true" />
                </div>
                <h2 className="text-sm sm:text-lg font-semibold text-text-primary">Analytics</h2>
              </div>
              <p className="text-text-secondary text-xs sm:text-sm">View user summaries</p>
            </button>

            <button
              onClick={() => router.push('/dashboard/admin/transactions')}
              className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-4 sm:p-6 hover:border-neon-purple/50 active:bg-white/5 transition-colors text-left group min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              aria-label="Manage all point transactions"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-blue-400/20 rounded-lg group-hover:bg-blue-400/30 transition-colors w-fit">
                  <FiActivity className="text-blue-400" size={20} aria-hidden="true" />
                </div>
                <h2 className="text-sm sm:text-lg font-semibold text-text-primary">Transactions</h2>
              </div>
              <p className="text-text-secondary text-xs sm:text-sm">Manage all transactions</p>
            </button>

            <button
              onClick={() => router.push('/dashboard/admin/events')}
              className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-4 sm:p-6 hover:border-neon-purple/50 active:bg-white/5 transition-colors text-left group min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              aria-label="Track event attendance"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-green-400/20 rounded-lg group-hover:bg-green-400/30 transition-colors w-fit">
                  <FiCalendar className="text-green-400" size={20} aria-hidden="true" />
                </div>
                <h2 className="text-sm sm:text-lg font-semibold text-text-primary">Events</h2>
              </div>
              <p className="text-text-secondary text-xs sm:text-sm">Track attendance</p>
            </button>

            <button
              onClick={() => router.push('/dashboard/admin/users')}
              className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-4 sm:p-6 hover:border-neon-purple/50 active:bg-white/5 transition-colors text-left group min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              aria-label="Manage user points"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-yellow-400/20 rounded-lg group-hover:bg-yellow-400/30 transition-colors w-fit">
                  <FiUsers className="text-yellow-400" size={20} aria-hidden="true" />
                </div>
                <h2 className="text-sm sm:text-lg font-semibold text-text-primary">Users</h2>
              </div>
              <p className="text-text-secondary text-xs sm:text-sm">Manage user points</p>
            </button>

            <button
              onClick={() => router.push('/dashboard/admin/referrals')}
              className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-4 sm:p-6 hover:border-neon-purple/50 active:bg-white/5 transition-colors text-left group min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              aria-label="Track referral performance"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-purple-400/20 rounded-lg group-hover:bg-purple-400/30 transition-colors w-fit">
                  <FiAward className="text-purple-400" size={20} aria-hidden="true" />
                </div>
                <h2 className="text-sm sm:text-lg font-semibold text-text-primary">Referrals</h2>
              </div>
              <p className="text-text-secondary text-xs sm:text-sm">Track performance</p>
            </button>
          </div>
        </nav>

        {/* Top Earning Action */}
        {overview?.top_earning_action && (
          <section
            className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-4 sm:p-6"
            aria-labelledby="top-action-heading"
          >
            <h2
              id="top-action-heading"
              className="text-lg sm:text-xl font-bold text-text-primary mb-3 sm:mb-4"
            >
              Top Earning Action
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm sm:text-lg font-semibold text-text-primary"
                  title={overview.top_earning_action.action_name}
                >
                  {overview.top_earning_action.action_name}
                </p>
                <p className="text-text-secondary text-xs sm:text-sm">
                  {overview.top_earning_action.points_value} points per action
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 sm:text-right bg-white/5 sm:bg-transparent rounded-lg p-3 sm:p-0">
                <span className="text-text-secondary text-xs sm:text-sm sm:hidden">
                  Total Awarded
                </span>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-neon-purple">
                    {overview.top_earning_action?.total_points_awarded?.toLocaleString() || '0'}
                  </p>
                  <p className="text-text-secondary text-xs sm:text-sm hidden sm:block">
                    Total Awarded
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}
