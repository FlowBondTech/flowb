'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import {
  RegistrationStatus,
  useGetAllEventRegistrationsQuery,
  useGetMyProfileQuery,
} from '@/src/generated/graphql'
import { useAuth } from '@/src/contexts/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiMapPin,
  FiMessageSquare,
  FiUser,
  FiXCircle,
} from 'react-icons/fi'

export default function AdminRegistrationsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')

  const { data: profileData, loading: profileLoading } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })

  const {
    data: registrationsData,
    loading: registrationsLoading,
    refetch,
  } = useGetAllEventRegistrationsQuery({
    skip: !isAuthenticated || profileData?.me?.role !== 'admin',
  })


  useEffect(() => {
    if (!isLoading && isAuthenticated && !profileLoading && profileData?.me?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileData, profileLoading, router])

  if (isLoading || profileLoading || registrationsLoading) {
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

  const registrations = registrationsData?.getAllEventRegistrations || []

  // Filter registrations
  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch =
      !searchTerm ||
      reg.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.user?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.event?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.user_notes?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || reg.status === filterStatus
    const matchesPayment = filterPayment === 'all' || reg.payment_status === filterPayment

    return matchesSearch && matchesStatus && matchesPayment
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400 bg-green-400/10'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'cancelled':
        return 'text-red-400 bg-red-400/10'
      default:
        return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-400'
      case 'pending':
        return 'text-yellow-400'
      case 'failed':
        return 'text-red-400'
      case 'refunded':
        return 'text-purple-400'
      default:
        return 'text-gray-400'
    }
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
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Event Registrations
            </h1>
            <p className="text-text-secondary mt-1">
              View all event registrations and user-submitted information
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by user, event, or notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-bg-secondary text-text-primary rounded-xl px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-bg-secondary text-text-primary rounded-xl px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterPayment}
            onChange={e => setFilterPayment(e.target.value)}
            className="bg-bg-secondary text-text-primary rounded-xl px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-4 mb-6 sm:mb-8">
          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <FiUser className="text-neon-purple" size={24} />
            </div>
            <p className="text-2xl font-bold text-text-primary">{registrations.length}</p>
            <p className="text-sm text-text-secondary">Total Registrations</p>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <FiCheckCircle className="text-green-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {registrations.filter(r => r.status === RegistrationStatus.Registered).length}
            </p>
            <p className="text-sm text-text-secondary">Confirmed</p>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <FiClock className="text-yellow-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {registrations.filter(r => r.checked_in).length}
            </p>
            <p className="text-sm text-text-secondary">Checked In</p>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <FiDollarSign className="text-green-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-text-primary">
              $
              {registrations
                .filter(r => r.payment_status === 'paid')
                .reduce((sum, r) => sum + (r.payment_amount || 0), 0)
                .toFixed(2)}
            </p>
            <p className="text-sm text-text-secondary">Total Revenue</p>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-neon-purple/20">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Check-In
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    User Notes
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredRegistrations.map(registration => (
                  <tr key={registration.id} className="hover:bg-bg-primary/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {registration.user?.display_name ||
                            registration.user?.username ||
                            'Unknown'}
                        </div>
                        <div className="text-xs text-text-secondary">
                          @{registration.user?.username || 'unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {registration.event?.title || 'Unknown Event'}
                        </div>
                        <div className="text-xs text-text-secondary flex items-center gap-1">
                          <FiCalendar size={10} />
                          {registration.event?.start_date_time &&
                            formatDate(registration.event.start_date_time)}
                        </div>
                        <div className="text-xs text-text-secondary flex items-center gap-1">
                          <FiMapPin size={10} />
                          {registration.event?.location_name || 'No location'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(registration.status || 'pending')}`}
                      >
                        {registration.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <FiDollarSign
                          className={getPaymentStatusColor(
                            registration.payment_status || 'pending',
                          )}
                          size={14}
                        />
                        <span
                          className={`text-sm ${getPaymentStatusColor(registration.payment_status || 'pending')}`}
                        >
                          {registration.payment_status || 'Pending'}
                        </span>
                      </div>
                      {registration.payment_amount && (
                        <div className="text-xs text-text-secondary">
                          ${registration.payment_amount.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      {registration.checked_in ? (
                        <div className="flex items-center gap-1">
                          <FiCheckCircle className="text-green-400" size={14} />
                          <span className="text-sm text-green-400">Checked In</span>
                          {registration.check_in_time && (
                            <div className="text-xs text-text-secondary">
                              {new Date(registration.check_in_time).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <FiXCircle className="text-gray-400" size={14} />
                          <span className="text-sm text-gray-400">Not Checked In</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {registration.user_notes ? (
                        <div className="max-w-xs">
                          <div className="flex items-start gap-1">
                            <FiMessageSquare
                              className="text-neon-purple mt-1 flex-shrink-0"
                              size={12}
                            />
                            <p
                              className="text-sm text-text-primary line-clamp-3"
                              title={registration.user_notes}
                            >
                              {registration.user_notes}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No notes</span>
                      )}
                      {registration.admin_notes && (
                        <div className="mt-2 p-2 bg-yellow-400/10 rounded">
                          <p className="text-xs text-yellow-400">
                            Admin: {registration.admin_notes}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-secondary">
                        {registration.registration_date
                          ? formatDate(registration.registration_date)
                          : registration.created_at
                            ? formatDate(registration.created_at)
                            : 'Unknown'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRegistrations.length === 0 && (
              <div className="text-center py-12">
                <FiCalendar className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-text-secondary text-lg">
                  {searchTerm || filterStatus !== 'all' || filterPayment !== 'all'
                    ? 'No registrations match your filters'
                    : 'No event registrations yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
