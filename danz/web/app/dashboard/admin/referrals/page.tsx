'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useAuth } from '@/src/contexts/AuthContext'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FiArrowLeft, FiAward, FiTrendingUp, FiUsers } from 'react-icons/fi'

export default function AdminReferralsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const { data: profileData, loading: profileLoading } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })


  useEffect(() => {
    if (!isLoading && isAuthenticated && !profileLoading && profileData?.me?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileData, profileLoading, router])

  if (isLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-primary text-2xl">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (profileData?.me?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-red-400 text-xl">Access Denied - Admin Only</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-text-primary transition-colors mb-6"
        >
          <FiArrowLeft size={20} />
          <span>Back to Admin</span>
        </Link>

        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Referral Tracking</h1>
            <p className="text-text-secondary mt-1">
              Monitor referral performance and bonus rewards across all users
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3 mb-6 sm:mb-8">
          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <FiUsers className="text-neon-purple" size={24} />
              <span className="text-xs text-text-secondary uppercase tracking-wider">Total</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">0</p>
            <p className="text-sm text-text-secondary mt-1">Referrals</p>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <FiTrendingUp className="text-green-400" size={24} />
              <span className="text-xs text-text-secondary uppercase tracking-wider">
                Completed
              </span>
            </div>
            <p className="text-2xl font-bold text-text-primary">0</p>
            <p className="text-sm text-text-secondary mt-1">First Sessions</p>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <FiAward className="text-yellow-400" size={24} />
              <span className="text-xs text-text-secondary uppercase tracking-wider">Points</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">0</p>
            <p className="text-sm text-text-secondary mt-1">Total Awarded</p>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-12 text-center">
          <div className="max-w-md mx-auto">
            <FiAward className="mx-auto text-neon-purple mb-4" size={48} />
            <h3 className="text-xl font-bold text-text-primary mb-2">
              Referral Analytics Coming Soon
            </h3>
            <p className="text-text-secondary mb-6">
              Advanced referral tracking, conversion analytics, and performance metrics will be
              available here soon.
            </p>
            <div className="flex flex-col gap-2 text-sm text-text-secondary text-left bg-bg-primary rounded-lg p-4">
              <p>• View all referral codes and usage statistics</p>
              <p>• Track conversion rates and completion status</p>
              <p>• Monitor points awarded through referrals</p>
              <p>• Identify top referrers and rewards</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
