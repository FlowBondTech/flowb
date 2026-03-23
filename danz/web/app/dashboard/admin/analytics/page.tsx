'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useAuth } from '@/src/contexts/AuthContext'
import { useGetMyProfileQuery, useGetUserPointsSummariesQuery } from '@/src/generated/graphql'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FiArrowLeft, FiAward, FiTrendingUp, FiUser } from 'react-icons/fi'

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [sortBy, setSortBy] = useState('total_points_earned')
  const [sortOrder, setSortOrder] = useState('DESC')
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)

  const { data: profileData, loading: profileLoading } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })

  const { data, loading, refetch } = useGetUserPointsSummariesQuery({
    variables: {
      limit,
      offset,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
    skip: !isAuthenticated || profileData?.me?.role !== 'admin',
  })


  useEffect(() => {
    if (!isLoading && isAuthenticated && !profileLoading && profileData?.me?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileData, profileLoading, router])

  useEffect(() => {
    refetch()
  }, [sortBy, sortOrder, offset, refetch])

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

  const users = data?.getUserPointsSummaries || []

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')
    } else {
      setSortBy(column)
      setSortOrder('DESC')
    }
    setOffset(0)
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

        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary">
            User Analytics
          </h1>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">
            Points summaries and activity
          </p>
        </div>

        {/* Summary Stats - Fluid grid for accessibility */}
        {users.length > 0 && (
          <div
            className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(140px,1fr))] lg:grid-cols-3 mb-6 sm:mb-8"
            role="region"
            aria-label="User analytics summary"
          >
            <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-3 sm:p-4 md:p-6 min-h-[100px]">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
                <FiUser className="text-neon-purple flex-shrink-0" size={20} aria-hidden="true" />
                <span className="text-xs text-text-secondary uppercase tracking-wider">Users</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-text-primary break-words">
                {users.length}
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">With Activity</p>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-3 sm:p-4 md:p-6 min-h-[100px]">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
                <FiAward className="text-neon-pink flex-shrink-0" size={20} aria-hidden="true" />
                <span className="text-xs text-text-secondary uppercase tracking-wider">
                  Avg Pts
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-text-primary break-words">
                {Math.round(
                  users.reduce((sum, u) => sum + (u.total_points_earned || 0), 0) / users.length,
                ).toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Per User</p>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 p-3 sm:p-4 md:p-6 min-h-[100px]">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
                <FiTrendingUp
                  className="text-blue-400 flex-shrink-0"
                  size={20}
                  aria-hidden="true"
                />
                <span className="text-xs text-text-secondary uppercase tracking-wider">Active</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-text-primary break-words">
                {users.filter(u => (u.transactions_last_week || 0) > 0).length}
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Last 7 Days</p>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 overflow-hidden">
          {/* Mobile Sort Controls */}
          <nav className="md:hidden p-4 border-b border-white/10" aria-label="Sort options">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-xs text-text-secondary whitespace-nowrap" id="sort-label">
                Sort:
              </span>
              <div role="group" aria-labelledby="sort-label" className="flex items-center gap-2">
                {[
                  { key: 'total_points_earned', label: 'Earned' },
                  { key: 'current_points_balance', label: 'Balance' },
                  { key: 'level', label: 'Level' },
                  { key: 'points_last_week', label: '7 Days' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple ${
                      sortBy === key
                        ? 'bg-neon-purple text-text-primary'
                        : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }`}
                    aria-pressed={sortBy === key}
                    aria-label={`Sort by ${label} ${sortBy === key ? (sortOrder === 'DESC' ? 'descending' : 'ascending') : ''}`}
                  >
                    {label} {sortBy === key && (sortOrder === 'DESC' ? '↓' : '↑')}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Mobile Card Layout */}
          <div
            className="md:hidden divide-y divide-white/10"
            role="list"
            aria-label="User analytics list"
          >
            {loading ? (
              <div
                className="px-4 py-12 text-center text-text-secondary"
                role="status"
                aria-live="polite"
              >
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="px-4 py-12 text-center text-text-secondary" role="status">
                No users found
              </div>
            ) : (
              users.map(user => (
                <article
                  key={user.id}
                  className="p-4 space-y-3"
                  role="listitem"
                  aria-label={`User ${user.username || 'Unknown'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {user.username || 'Unknown'}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {user.id.slice(0, 12)}...
                      </div>
                    </div>
                    <span
                      className="px-2 py-1 bg-neon-purple/20 text-neon-purple rounded-full text-xs font-medium flex-shrink-0"
                      aria-label={`Level ${user.level || 1}`}
                    >
                      Lv {user.level || 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3">
                    <div className="bg-white/5 rounded-lg p-2 min-h-[56px]">
                      <p className="text-xs text-text-secondary">Earned</p>
                      <p className="text-sm font-semibold text-text-primary break-words">
                        {(user.total_points_earned || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 min-h-[56px]">
                      <p className="text-xs text-text-secondary">Balance</p>
                      <p className="text-sm font-semibold text-text-primary break-words">
                        {(user.current_points_balance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 min-h-[56px]">
                      <p className="text-xs text-text-secondary">XP</p>
                      <p className="text-sm font-semibold text-text-primary break-words">
                        {(user.xp || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 min-h-[56px]">
                      <p className="text-xs text-text-secondary">Last 7d</p>
                      <p
                        className={`text-sm font-semibold break-words ${
                          (user.points_last_week || 0) > 0
                            ? 'text-green-400'
                            : 'text-text-secondary'
                        }`}
                      >
                        {(user.points_last_week || 0) > 0 ? '+' : ''}
                        {(user.points_last_week || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th
                    onClick={() => handleSort('username')}
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  >
                    User {sortBy === 'username' && (sortOrder === 'DESC' ? '↓' : '↑')}
                  </th>
                  <th
                    onClick={() => handleSort('total_points_earned')}
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  >
                    Earned {sortBy === 'total_points_earned' && (sortOrder === 'DESC' ? '↓' : '↑')}
                  </th>
                  <th
                    onClick={() => handleSort('current_points_balance')}
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  >
                    Balance{' '}
                    {sortBy === 'current_points_balance' && (sortOrder === 'DESC' ? '↓' : '↑')}
                  </th>
                  <th
                    onClick={() => handleSort('xp')}
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  >
                    XP {sortBy === 'xp' && (sortOrder === 'DESC' ? '↓' : '↑')}
                  </th>
                  <th
                    onClick={() => handleSort('level')}
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  >
                    Level {sortBy === 'level' && (sortOrder === 'DESC' ? '↓' : '↑')}
                  </th>
                  <th
                    onClick={() => handleSort('total_transactions')}
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  >
                    Transactions{' '}
                    {sortBy === 'total_transactions' && (sortOrder === 'DESC' ? '↓' : '↑')}
                  </th>
                  <th
                    onClick={() => handleSort('points_last_week')}
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  >
                    Last 7d {sortBy === 'points_last_week' && (sortOrder === 'DESC' ? '↓' : '↑')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-text-secondary">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-text-secondary">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text-primary">
                          {user.username || 'Unknown'}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {user.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {(user.total_points_earned || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {(user.current_points_balance || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {(user.xp || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-neon-purple/20 text-neon-purple rounded-full text-xs font-medium">
                          {user.level || 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {user.total_transactions || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(user.points_last_week || 0) > 0 ? (
                          <span className="text-green-400">
                            +{(user.points_last_week || 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-text-secondary">0</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {users.length >= limit && (
            <nav
              className="px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border-t border-white/10 flex justify-between items-center gap-2"
              aria-label="Pagination"
            >
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-2 text-sm bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple"
                aria-label="Go to previous page"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>
              <span className="text-text-secondary text-xs sm:text-sm" aria-live="polite">
                {offset + 1} - {offset + users.length}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={users.length < limit}
                className="px-3 py-2 text-sm bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple"
                aria-label="Go to next page"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
