'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import GigManagerDashboard from '@/src/components/gigs/manager/GigManagerDashboard'
import { useAuth } from '@/src/contexts/AuthContext'

export default function GigManagerPage() {
  const { isAuthenticated, isLoading, user } = useAuth()

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
          <p className="text-text-muted">Please sign in to access the gig manager dashboard</p>
        </div>
      </DashboardLayout>
    )
  }

  // Check if user is a gig manager
  if (!user?.is_gig_manager) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Access Restricted</h2>
          <p className="text-text-muted mb-6">
            You need to be a verified Gig Manager to access this dashboard.
          </p>
          <p className="text-sm text-text-muted">
            Interested in becoming a Gig Manager? Contact the DANZ team for more information.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Gig Manager Dashboard</h1>
          <p className="text-text-muted">
            Review applications, submissions, and manage gig workers
          </p>
        </div>

        <GigManagerDashboard />
      </div>
    </DashboardLayout>
  )
}
