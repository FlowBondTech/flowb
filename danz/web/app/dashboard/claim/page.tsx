'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { FiGift, FiLock } from 'react-icons/fi'

export default function ClaimPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Claim Rewards</h1>
          <p className="text-text-secondary mt-1">Claim your earned tokens and rewards</p>
        </div>

        <div className="bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-xl border border-neon-purple/30 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-neon-purple/20 rounded-full flex items-center justify-center">
            <FiLock className="w-8 h-8 text-neon-purple" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Token Claiming Being Upgraded
          </h2>
          <p className="text-text-secondary max-w-md mx-auto">
            We're upgrading the token claiming system. Your earned rewards are tracked and
            will be claimable when the new wallet integration is ready.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
