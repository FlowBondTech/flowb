'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useAuth } from '@/src/contexts/AuthContext'
import { useUserPoints } from '@/src/hooks/useReferralData'
import { FiAward, FiTrendingUp, FiLock } from 'react-icons/fi'

export default function WalletPage() {
  const { user } = useAuth()
  const { points, loading: pointsLoading } = useUserPoints(user?.username)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Wallet</h1>
          <p className="text-text-secondary mt-1">Manage your tokens and rewards</p>
        </div>

        {/* Points Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <FiAward className="w-5 h-5 text-neon-purple" />
              <span className="text-text-secondary text-sm">Total Points</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {pointsLoading ? '...' : (points?.total_points_earned ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <FiTrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-text-secondary text-sm">Current Balance</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {pointsLoading ? '...' : (points?.current_points_balance ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Upgrade Banner */}
        <div className="bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-xl border border-neon-purple/30 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-neon-purple/20 rounded-full flex items-center justify-center">
            <FiLock className="w-8 h-8 text-neon-purple" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Wallet Features Being Upgraded
          </h2>
          <p className="text-text-secondary max-w-md mx-auto">
            We're upgrading wallet functionality to a new system. Embedded wallet creation,
            linking, and token claiming will return soon with an improved experience.
          </p>
          <p className="text-sm text-text-muted mt-4">
            Your points and rewards are safe and will be available when wallet features return.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
