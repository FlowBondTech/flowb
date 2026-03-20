'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import GigsDashboard from '@/src/components/gigs/GigsDashboard'
import { useAuth } from '@/src/contexts/AuthContext'

export default function GigsPage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-text-muted">Please sign in to view your gigs</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Gigs Dashboard</h1>
          <p className="text-text-muted">Earn $DANZ by completing tasks at events</p>
        </div>

        <GigsDashboard />
      </div>
    </DashboardLayout>
  )
}
