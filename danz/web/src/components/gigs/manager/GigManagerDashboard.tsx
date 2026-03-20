'use client'

import { useGetGigManagerDashboardQuery } from '@/src/generated/graphql'
import { useState } from 'react'
import { FiCheckCircle, FiClock, FiFileText, FiTrendingUp, FiUsers } from 'react-icons/fi'
import GigApplicationQueue from './GigApplicationQueue'
import RoleApplicationQueue from './RoleApplicationQueue'
import SubmissionQueue from './SubmissionQueue'

type TabType = 'roles' | 'applications' | 'submissions'

export default function GigManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('roles')

  const { data, loading, error, refetch } = useGetGigManagerDashboardQuery()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">Failed to load gig manager dashboard</p>
        <button
          onClick={() => refetch()}
          className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const dashboard = data?.gigManagerDashboard
  const stats = dashboard?.stats

  const tabs = [
    {
      id: 'roles' as TabType,
      label: 'Role Applications',
      count: dashboard?.pendingRoleApplications?.length || 0,
      icon: <FiUsers size={18} />,
    },
    {
      id: 'applications' as TabType,
      label: 'Gig Applications',
      count: dashboard?.pendingGigApplications?.length || 0,
      icon: <FiFileText size={18} />,
    },
    {
      id: 'submissions' as TabType,
      label: 'Submissions',
      count: dashboard?.pendingSubmissions?.length || 0,
      icon: <FiCheckCircle size={18} />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<FiTrendingUp size={20} />}
          label="Total Reviewed"
          value={stats?.totalReviewed || 0}
          color="purple"
        />
        <StatCard
          icon={<FiCheckCircle size={20} />}
          label="Approved"
          value={stats?.approvedCount || 0}
          color="green"
        />
        <StatCard
          icon={<FiUsers size={20} />}
          label="Rejected"
          value={stats?.rejectedCount || 0}
          color="red"
        />
        <StatCard
          icon={<FiClock size={20} />}
          label="Avg Review Time"
          value={stats?.averageReviewTime ? `${Math.round(stats.averageReviewTime)}m` : 'N/A'}
          color="blue"
        />
        <StatCard
          icon={<FiFileText size={20} />}
          label="Today"
          value={stats?.todayReviewed || 0}
          color="yellow"
        />
      </div>

      {/* Tabs */}
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-neon-purple/10 text-neon-purple border-b-2 border-neon-purple'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-neon-purple text-white'
                      : 'bg-bg-tertiary text-text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'roles' && (
            <RoleApplicationQueue
              applications={dashboard?.pendingRoleApplications || []}
              onRefresh={refetch}
            />
          )}
          {activeTab === 'applications' && (
            <GigApplicationQueue
              applications={dashboard?.pendingGigApplications || []}
              onRefresh={refetch}
            />
          )}
          {activeTab === 'submissions' && (
            <SubmissionQueue
              submissions={dashboard?.pendingSubmissions || []}
              onRefresh={refetch}
            />
          )}
        </div>
      </div>

      {/* Recently Approved */}
      {dashboard?.recentlyApproved && dashboard.recentlyApproved.length > 0 && (
        <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Recently Approved</h3>
          <div className="space-y-2">
            {dashboard.recentlyApproved.slice(0, 5).map(app => (
              <div
                key={app.id}
                className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={app.user?.avatar_url || '/default-avatar.png'}
                    alt={app.user?.display_name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {app.user?.display_name || app.user?.username}
                    </p>
                    <p className="text-xs text-text-muted">{app.gig?.title}</p>
                  </div>
                </div>
                <span className="text-xs text-green-400">Approved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: 'purple' | 'green' | 'red' | 'blue' | 'yellow'
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    purple: 'from-neon-purple/20 to-neon-purple/5 border-neon-purple/30 text-neon-purple',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400',
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className={`mb-2 ${colorClasses[color].split(' ').slice(-1)[0]}`}>{icon}</div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
    </div>
  )
}
