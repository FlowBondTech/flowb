'use client'
import { useGetMyGigDashboardQuery } from '@/src/generated/graphql'
import { FiBriefcase, FiDollarSign, FiStar, FiTrendingUp } from 'react-icons/fi'
import ActiveGigsCard from './ActiveGigsCard'
import AvailableGigsCard from './AvailableGigsCard'
import GigHistoryCard from './GigHistoryCard'
import MyRolesCard from './MyRolesCard'

export default function GigsDashboard() {
  const { data, loading, error, refetch } = useGetMyGigDashboardQuery()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">Failed to load gig dashboard</p>
        <button
          onClick={() => refetch()}
          className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const dashboard = data?.myGigDashboard
  const stats = dashboard?.stats

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FiBriefcase className="w-5 h-5" />}
          label="Gigs Completed"
          value={stats?.totalGigsCompleted || 0}
          color="purple"
        />
        <StatCard
          icon={<FiDollarSign className="w-5 h-5" />}
          label="$DANZ Earned"
          value={stats?.totalDanzEarned || 0}
          color="green"
          isAmount
        />
        <StatCard
          icon={<FiStar className="w-5 h-5" />}
          label="Avg Rating"
          value={stats?.averageRating?.toFixed(1) || 'N/A'}
          color="yellow"
        />
        <StatCard
          icon={<FiTrendingUp className="w-5 h-5" />}
          label="Active Roles"
          value={stats?.activeRoles || 0}
          color="blue"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Roles */}
        <MyRolesCard roles={dashboard?.myRoles || []} onRefresh={refetch} />

        {/* Available Gigs */}
        <AvailableGigsCard gigs={dashboard?.availableGigs || []} onRefresh={refetch} />
      </div>

      {/* Active Gigs */}
      {(dashboard?.activeGigs?.length || 0) > 0 && (
        <ActiveGigsCard applications={dashboard?.activeGigs || []} onRefresh={refetch} />
      )}

      {/* Recent History */}
      <GigHistoryCard applications={dashboard?.recentHistory || []} />
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: 'purple' | 'green' | 'yellow' | 'blue'
  isAmount?: boolean
}

function StatCard({ icon, label, value, color, isAmount }: StatCardProps) {
  const colorClasses = {
    purple: 'from-neon-purple/20 to-neon-purple/5 border-neon-purple/30 text-neon-purple',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div
        className={`w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center mb-3 ${colorClasses[color].split(' ').slice(-1)[0]}`}
      >
        {icon}
      </div>
      <p className="text-sm text-text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-primary">
        {isAmount && typeof value === 'number' ? `${value.toLocaleString()}` : value}
      </p>
    </div>
  )
}
