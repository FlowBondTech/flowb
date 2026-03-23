'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import {
  TransactionStatus,
  useGetAllTransactionsQuery,
  useGetMyProfileQuery,
  useReversePointTransactionMutation,
  useVerifyPointTransactionMutation,
} from '@/src/generated/graphql'
import { useAuth } from '@/src/contexts/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FiArrowLeft, FiCheck, FiRotateCcw, FiX } from 'react-icons/fi'

export default function TransactionsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [statusFilter, setStatusFilter] = useState<TransactionStatus | undefined>()
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [reverseReason, setReverseReason] = useState('')
  const [reversingId, setReversingId] = useState<string | null>(null)

  const { data: profileData, loading: profileLoading } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })

  const { data, loading, refetch } = useGetAllTransactionsQuery({
    variables: {
      limit,
      offset,
      status: statusFilter,
    },
    skip: !isAuthenticated || profileData?.me?.role !== 'admin',
  })

  const [verifyTransaction] = useVerifyPointTransactionMutation()
  const [reverseTransaction] = useReversePointTransactionMutation()


  useEffect(() => {
    if (!isLoading && isAuthenticated && !profileLoading && profileData?.me?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, profileData, profileLoading, router])

  useEffect(() => {
    refetch()
  }, [statusFilter, offset, refetch])

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

  const transactions = data?.getAllTransactions?.transactions || []
  const totalCount = data?.getAllTransactions?.total_count || 0
  const hasMore = data?.getAllTransactions?.has_more || false

  const handleVerify = async (transactionId: string) => {
    try {
      await verifyTransaction({
        variables: { transaction_id: transactionId },
      })
      refetch()
    } catch (error) {
      console.error('Error verifying transaction:', error)
      alert('Failed to verify transaction')
    }
  }

  const handleReverse = async (transactionId: string) => {
    if (!reverseReason.trim()) {
      alert('Please enter a reason for reversing this transaction')
      return
    }

    try {
      await reverseTransaction({
        variables: {
          transaction_id: transactionId,
          reason: reverseReason,
        },
      })
      setReversingId(null)
      setReverseReason('')
      refetch()
    } catch (error) {
      console.error('Error reversing transaction:', error)
      alert('Failed to reverse transaction')
    }
  }

  const statusOptions = [
    { value: undefined, label: 'All Status' },
    { value: TransactionStatus.Pending, label: 'Pending' },
    { value: TransactionStatus.Completed, label: 'Completed' },
    { value: TransactionStatus.Reversed, label: 'Reversed' },
    { value: TransactionStatus.Failed, label: 'Failed' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-400/20 text-green-400'
      case 'pending':
        return 'bg-yellow-400/20 text-yellow-400'
      case 'reversed':
        return 'bg-red-400/20 text-red-400'
      case 'failed':
        return 'bg-gray-400/20 text-gray-400'
      default:
        return 'bg-blue-400/20 text-blue-400'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earn':
        return 'text-green-400'
      case 'spend':
        return 'text-red-400'
      case 'bonus':
        return 'text-neon-purple'
      case 'penalty':
        return 'text-orange-400'
      case 'adjustment':
        return 'text-blue-400'
      case 'refund':
        return 'text-cyan-400'
      default:
        return 'text-text-primary'
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
              Transaction History
            </h1>
            <p className="text-text-secondary mt-1">View and manage all point transactions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(opt => (
              <button
                key={opt.label}
                onClick={() => {
                  setStatusFilter(opt.value)
                  setOffset(0)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-neon-purple text-text-primary'
                    : 'bg-bg-secondary text-text-secondary hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Total Transactions</span>
            <span className="text-text-primary font-bold text-lg">
              {totalCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-text-secondary">Loading transactions...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">No transactions found</p>
            </div>
          ) : (
            transactions.map(tx => (
              <div
                key={tx.id}
                className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          tx.status,
                        )}`}
                      >
                        {tx.status}
                      </span>
                      <span
                        className={`font-semibold text-sm ${getTypeColor(tx.transaction_type)}`}
                      >
                        {tx.transaction_type.toUpperCase()}
                      </span>
                      <span className="text-text-primary font-bold text-lg">
                        {tx.transaction_type === 'spend' || tx.transaction_type === 'penalty'
                          ? '-'
                          : '+'}
                        {tx.points_amount} pts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-text-secondary text-sm">User</p>
                        <p className="text-text-primary">
                          {tx.user?.username || tx.user_id.slice(0, 8)}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm">Action</p>
                        <p className="text-text-primary">
                          {tx.action?.action_name || tx.action_key}
                        </p>
                      </div>
                      {tx.reference_type && (
                        <div>
                          <p className="text-text-secondary text-sm">Reference</p>
                          <p className="text-text-primary capitalize">
                            {tx.reference_type}
                            {tx.reference_id && (
                              <span className="text-text-secondary ml-1 text-xs">
                                ({tx.reference_id.slice(0, 8)}...)
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-text-secondary text-sm">Date</p>
                        <p className="text-text-primary">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      {tx.admin_user_id && (
                        <div>
                          <p className="text-text-secondary text-sm">Admin</p>
                          <p className="text-text-primary">
                            {tx.admin_user?.username || tx.admin_user_id.slice(0, 8)}
                          </p>
                        </div>
                      )}
                      {tx.admin_note && (
                        <div className="md:col-span-2">
                          <p className="text-text-secondary text-sm">Admin Note</p>
                          <p className="text-text-primary">{tx.admin_note}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {tx.status === 'pending' && (
                      <button
                        onClick={() => handleVerify(tx.id)}
                        className="p-2 text-green-400 hover:text-green-300 transition-colors"
                        title="Verify"
                      >
                        <FiCheck size={20} />
                      </button>
                    )}
                    {tx.status === 'completed' && (
                      <>
                        {reversingId === tx.id ? (
                          <div className="bg-bg-primary rounded-lg p-3 w-64">
                            <p className="text-text-secondary text-xs mb-2">Reverse Reason:</p>
                            <textarea
                              value={reverseReason}
                              onChange={e => setReverseReason(e.target.value)}
                              className="w-full px-2 py-1 bg-bg-secondary border border-white/10 rounded text-sm text-text-primary mb-2"
                              rows={2}
                              placeholder="Enter reason..."
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReverse(tx.id)}
                                className="btn btn-primary text-xs px-2 py-1"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  setReversingId(null)
                                  setReverseReason('')
                                }}
                                className="btn btn-outline text-xs px-2 py-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReversingId(tx.id)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            title="Reverse"
                          >
                            <FiRotateCcw size={20} />
                          </button>
                        )}
                      </>
                    )}
                    {tx.status === 'reversed' && (
                      <span className="p-2 text-gray-400">
                        <FiX size={20} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {(offset > 0 || hasMore) && (
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-text-secondary text-sm">
              Showing {offset + 1} - {offset + transactions.length} of {totalCount.toLocaleString()}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={!hasMore}
              className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
