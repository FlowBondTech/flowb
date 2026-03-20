'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useAuth } from '@/src/contexts/AuthContext'
import {
  type UserRole,
  useApproveOrganizerMutation,
  useGetAllUsersQuery,
  useGetMyProfileQuery,
  useUpdateUserRoleMutation,
} from '@/src/generated/graphql'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiSearch,
  FiShield,
  FiUserCheck,
  FiUsers,
  FiX,
} from 'react-icons/fi'

export default function AdminUsersPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null)

  // Check if current user is admin
  const { data: profileData, loading: profileLoading } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })

  // Get all users
  const {
    data: usersData,
    loading: usersLoading,
    refetch,
  } = useGetAllUsersQuery({
    skip: !isAuthenticated || profileData?.me?.role !== 'admin',
  })

  const [updateUserRole] = useUpdateUserRoleMutation()
  const [approveOrganizer] = useApproveOrganizerMutation()

  useEffect(() => {
    if (!profileLoading && profileData?.me?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [profileData, profileLoading, router])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole({
        variables: { userId, role: newRole as UserRole },
      })
      refetch()
      setShowRoleMenu(null)
      alert(`User role updated to ${newRole}`)
    } catch (error) {
      console.error('Failed to update user role:', error)
      alert('Failed to update user role')
    }
  }

  const handleOrganizerApproval = async (userId: string, approved: boolean) => {
    try {
      await approveOrganizer({
        variables: { userId, approved },
      })
      refetch()
      alert(approved ? 'Organizer approved!' : 'Organizer rejected')
    } catch (error) {
      console.error('Failed to update organizer approval:', error)
      alert('Failed to update organizer approval')
    }
  }

  // Filter users based on search and role
  const filteredUsers =
    usersData?.getAllUsers?.filter(user => {
      const matchesSearch =
        searchTerm === '' ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())

      let matchesRole = false
      if (roleFilter === 'all') {
        matchesRole = true
      } else if (roleFilter === 'pending') {
        matchesRole = user.role === 'organizer' && !user.is_organizer_approved
      } else if (roleFilter === 'dev') {
        matchesRole = user.role === 'dev' || user.role === 'admin'
      } else {
        matchesRole = user.role === roleFilter
      }

      return matchesSearch && matchesRole
    }) || []

  // Count stats
  const stats = {
    totalUsers: usersData?.getAllUsers?.length || 0,
    admins: usersData?.getAllUsers?.filter(u => u.role === 'admin').length || 0,
    devs: usersData?.getAllUsers?.filter(u => u.role === 'dev' || u.role === 'admin').length || 0,
    organizers: usersData?.getAllUsers?.filter(u => u.role === 'organizer').length || 0,
    pendingOrganizers:
      usersData?.getAllUsers?.filter(u => u.role === 'organizer' && !u.is_organizer_approved)
        .length || 0,
    users: usersData?.getAllUsers?.filter(u => u.role === 'user').length || 0,
  }

  // Filter options with counts
  const filterOptions = [
    { value: 'all', label: 'All', count: stats.totalUsers },
    {
      value: 'pending',
      label: 'Pending',
      count: stats.pendingOrganizers,
      highlight: stats.pendingOrganizers > 0,
    },
    { value: 'organizer', label: 'Organizers', count: stats.organizers },
    { value: 'dev', label: 'Dev/Admin', count: stats.devs },
    { value: 'user', label: 'Users', count: stats.users },
  ]

  if (profileLoading || usersLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
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
      <div className="space-y-6">
        {/* Back Navigation */}
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-text-primary transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back to Admin</span>
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">User Management</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Manage user roles and permissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Total Users</p>
                <p className="text-xl sm:text-3xl font-bold text-text-primary mt-1">
                  {stats.totalUsers}
                </p>
              </div>
              <FiUsers className="text-purple-400 text-xl sm:text-3xl" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Dev/Admin</p>
                <p className="text-xl sm:text-3xl font-bold text-text-primary mt-1">{stats.devs}</p>
              </div>
              <FiShield className="text-purple-400 text-xl sm:text-3xl" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Organizers</p>
                <p className="text-xl sm:text-3xl font-bold text-text-primary mt-1">
                  {stats.organizers}
                </p>
              </div>
              <FiCalendar className="text-purple-400 text-xl sm:text-3xl" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Pending</p>
                <p className="text-xl sm:text-3xl font-bold text-text-primary mt-1">
                  {stats.pendingOrganizers}
                </p>
              </div>
              <FiUserCheck className="text-yellow-400 text-xl sm:text-3xl" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username or display name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black/30 border border-purple-500/30 rounded-xl text-text-primary placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setRoleFilter(option.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  roleFilter === option.value
                    ? 'bg-purple-600 text-text-primary border border-purple-500'
                    : option.highlight
                      ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/50 hover:bg-yellow-600/30'
                      : 'bg-white/5 text-gray-300 border border-purple-500/20 hover:bg-white/10 hover:border-purple-500/40'
                }`}
              >
                {option.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    roleFilter === option.value
                      ? 'bg-white/20'
                      : option.highlight
                        ? 'bg-yellow-500/30'
                        : 'bg-white/10'
                  }`}
                >
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Users List - Mobile Cards / Desktop Table */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-purple-500/20 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/30 border-b border-purple-500/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {filteredUsers.map(user => (
                  <tr key={user.privy_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-text-primary font-medium">
                          {user.display_name || user.username || 'No name'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          @{user.username || 'no-username'}
                        </div>
                        {user.invited_by && (
                          <div className="text-purple-400 text-xs mt-1">
                            Invited by: {user.invited_by}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setShowRoleMenu(showRoleMenu === user.privy_id ? null : user.privy_id)
                          }
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            user.role === 'admin'
                              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 hover:bg-purple-600/40'
                              : user.role === 'dev'
                                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/40'
                                : user.role === 'organizer'
                                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 hover:bg-blue-600/40'
                                  : 'bg-gray-600/30 text-gray-300 border border-gray-500/50 hover:bg-gray-600/40'
                          }`}
                        >
                          {user.role}
                          <FiChevronDown className="ml-1" />
                        </button>

                        {showRoleMenu === user.privy_id && (
                          <div className="absolute z-10 mt-1 bg-black/95 border border-purple-500/30 rounded-lg shadow-lg min-w-[120px]">
                            <button
                              onClick={() => handleRoleChange(user.privy_id, 'user')}
                              className="block w-full px-4 py-2 text-left text-text-primary hover:bg-purple-600/30 text-sm transition-colors"
                            >
                              User
                            </button>
                            <button
                              onClick={() => handleRoleChange(user.privy_id, 'organizer')}
                              className="block w-full px-4 py-2 text-left text-text-primary hover:bg-purple-600/30 text-sm transition-colors"
                            >
                              Organizer
                            </button>
                            <button
                              onClick={() => handleRoleChange(user.privy_id, 'dev')}
                              className="block w-full px-4 py-2 text-left text-text-primary hover:bg-purple-600/30 text-sm transition-colors"
                            >
                              Dev
                            </button>
                            <button
                              onClick={() => handleRoleChange(user.privy_id, 'admin')}
                              className="block w-full px-4 py-2 text-left text-text-primary hover:bg-purple-600/30 text-sm transition-colors"
                            >
                              Admin
                            </button>
                          </div>
                        )}
                      </div>

                      {user.role === 'organizer' && !user.is_organizer_approved && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-600/30 text-yellow-300 border border-yellow-500/50">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <div className="text-gray-400">
                          XP: <span className="text-text-primary font-medium">{user.xp || 0}</span>
                        </div>
                        <div className="text-gray-400">
                          Referrals:{' '}
                          <span className="text-text-primary font-medium">
                            {user.referral_count || 0}
                          </span>
                        </div>
                        {user.total_sessions && user.total_sessions > 0 && (
                          <div className="text-gray-400">
                            Sessions:{' '}
                            <span className="text-text-primary font-medium">
                              {user.total_sessions}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'organizer' && !user.is_organizer_approved && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOrganizerApproval(user.privy_id, true)}
                            className="p-2 bg-green-600/30 text-green-300 rounded-lg hover:bg-green-600/40 transition-colors"
                            title="Approve Organizer"
                          >
                            <FiCheck />
                          </button>
                          <button
                            onClick={() => handleOrganizerApproval(user.privy_id, false)}
                            className="p-2 bg-red-600/30 text-red-300 rounded-lg hover:bg-red-600/40 transition-colors"
                            title="Reject Organizer"
                          >
                            <FiX />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-purple-500/10">
            {filteredUsers.map(user => (
              <div key={user.privy_id} className="p-4 space-y-3">
                {/* User Info Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-text-primary font-medium">
                      {user.display_name || user.username || 'No name'}
                    </div>
                    <div className="text-gray-400 text-sm">@{user.username || 'no-username'}</div>
                    {user.invited_by && (
                      <div className="text-purple-400 text-xs mt-1">
                        Invited by: {user.invited_by}
                      </div>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded">
                    XP: {user.xp || 0}
                  </span>
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded">
                    Refs: {user.referral_count || 0}
                  </span>
                  {user.total_sessions && user.total_sessions > 0 && (
                    <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded">
                      Sessions: {user.total_sessions}
                    </span>
                  )}
                </div>

                {/* Role & Actions Row */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setShowRoleMenu(showRoleMenu === user.privy_id ? null : user.privy_id)
                        }
                        className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          user.role === 'admin'
                            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                            : user.role === 'dev'
                              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                              : user.role === 'organizer'
                                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                                : 'bg-gray-600/30 text-gray-300 border border-gray-500/50'
                        }`}
                      >
                        {user.role}
                        <FiChevronDown className="ml-2" />
                      </button>

                      {showRoleMenu === user.privy_id && (
                        <div className="absolute z-10 mt-1 bg-black/95 border border-purple-500/30 rounded-lg shadow-lg min-w-[140px]">
                          <button
                            onClick={() => handleRoleChange(user.privy_id, 'user')}
                            className="block w-full px-4 py-3 text-left text-text-primary hover:bg-purple-600/30 text-sm transition-colors"
                          >
                            User
                          </button>
                          <button
                            onClick={() => handleRoleChange(user.privy_id, 'organizer')}
                            className="block w-full px-4 py-3 text-left text-text-primary hover:bg-purple-600/30 text-sm transition-colors"
                          >
                            Organizer
                          </button>
                          <button
                            onClick={() => handleRoleChange(user.privy_id, 'dev')}
                            className="block w-full px-4 py-3 text-left text-text-primary hover:bg-purple-600/30 text-sm transition-colors"
                          >
                            Dev
                          </button>
                          <button
                            onClick={() => handleRoleChange(user.privy_id, 'admin')}
                            className="block w-full px-4 py-3 text-left text-text-primary hover:bg-purple-600/30 text-sm transition-colors"
                          >
                            Admin
                          </button>
                        </div>
                      )}
                    </div>

                    {user.role === 'organizer' && !user.is_organizer_approved && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-600/30 text-yellow-300 border border-yellow-500/50">
                        Pending
                      </span>
                    )}
                  </div>

                  {user.role === 'organizer' && !user.is_organizer_approved && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOrganizerApproval(user.privy_id, true)}
                        className="p-3 bg-green-600/30 text-green-300 rounded-lg active:bg-green-600/50 transition-colors"
                        title="Approve Organizer"
                      >
                        <FiCheck size={18} />
                      </button>
                      <button
                        onClick={() => handleOrganizerApproval(user.privy_id, false)}
                        className="p-3 bg-red-600/30 text-red-300 rounded-lg active:bg-red-600/50 transition-colors"
                        title="Reject Organizer"
                      >
                        <FiX size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No users found matching your criteria
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
