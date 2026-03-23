'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import {
  type ApplicationStatus,
  useGetOrganizerApplicationsQuery,
  useGetPendingOrganizerApplicationsQuery,
  useReviewOrganizerApplicationMutation,
} from '@/src/generated/graphql'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'
import {
  FiCheck,
  FiChevronLeft,
  FiClock,
  FiExternalLink,
  FiGlobe,
  FiMapPin,
  FiMessageSquare,
  FiMusic,
  FiUser,
  FiX,
} from 'react-icons/fi'

export default function OrganizerApplicationsPage() {
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  const { data: profileData } = useGetMyProfileQuery()

  const {
    data: pendingData,
    loading: pendingLoading,
    refetch: refetchPending,
  } = useGetPendingOrganizerApplicationsQuery({
    variables: { limit: 50 },
  })

  const {
    data: allData,
    loading: allLoading,
    refetch: refetchAll,
  } = useGetOrganizerApplicationsQuery({
    variables: { limit: 50 },
  })

  const [reviewApplication] = useReviewOrganizerApplicationMutation()

  // Check admin access
  const isAdmin = profileData?.me?.role === 'admin' || profileData?.me?.role === 'manager'

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
            <p className="text-text-secondary">You don't have permission to view this page.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedApplication) return

    setIsProcessing(true)
    try {
      await reviewApplication({
        variables: {
          input: {
            application_id: selectedApplication.id,
            status: status as ApplicationStatus,
            admin_notes: adminNotes || null,
          },
        },
      })

      setSelectedApplication(null)
      setAdminNotes('')
      refetchPending()
      refetchAll()
    } catch (error) {
      console.error('Failed to review application:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const pendingApplications = pendingData?.pendingOrganizerApplications?.applications || []
  const allApplications = allData?.organizerApplications?.applications || []

  const filteredApplications =
    activeTab === 'pending'
      ? pendingApplications
      : activeTab === 'all'
        ? allApplications
        : allApplications.filter(app => app.status === activeTab)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
          >
            <FiChevronLeft size={16} />
            Back to Admin
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Organizer Applications</h1>
              <p className="text-text-secondary">Review and manage organizer applications</p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
              <FiClock size={18} />
              <span className="font-medium">{pendingApplications.length} Pending</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-neon-purple text-text-primary'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Applications List */}
        {pendingLoading || allLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-text-secondary">Loading applications...</div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-12 text-center">
            <FiUser className="w-12 h-12 mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No Applications</h3>
            <p className="text-text-secondary">
              {activeTab === 'pending'
                ? 'No pending applications to review'
                : `No ${activeTab} applications`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredApplications.map(app => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 hover:border-neon-purple/40 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedApplication(app)
                  setAdminNotes('')
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
                      {app.user?.avatar_url ? (
                        <img
                          src={app.user.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <FiUser className="w-6 h-6 text-neon-purple" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-text-primary">
                          {app.user?.display_name || app.user?.username || 'Unknown User'}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            app.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : app.status === 'approved'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>

                      <p className="text-sm text-text-secondary mb-2">@{app.user?.username}</p>

                      <p className="text-text-primary line-clamp-2">{app.reason}</p>

                      {app.venue_name && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary">
                          <FiMapPin className="w-4 h-4" />
                          <span>{app.venue_name}</span>
                          {app.venue_city && <span>• {app.venue_city}</span>}
                        </div>
                      )}

                      {app.dance_styles && app.dance_styles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {app.dance_styles.slice(0, 4).map(style => (
                            <span
                              key={style}
                              className="px-2 py-0.5 bg-neon-purple/20 text-neon-purple text-xs rounded-full"
                            >
                              {style}
                            </span>
                          ))}
                          {app.dance_styles.length > 4 && (
                            <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                              +{app.dance_styles.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-text-secondary">{formatDate(app.created_at)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Application Detail Modal */}
        <AnimatePresence>
          {selectedApplication && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setSelectedApplication(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-text-primary">Review Application</h2>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Applicant Info */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-bg-primary rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-neon-purple/20 flex items-center justify-center">
                    {selectedApplication.user?.avatar_url ? (
                      <img
                        src={selectedApplication.user.avatar_url}
                        alt=""
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <FiUser className="w-8 h-8 text-neon-purple" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary text-lg">
                      {selectedApplication.user?.display_name || selectedApplication.user?.username}
                    </h3>
                    <p className="text-text-secondary">@{selectedApplication.user?.username}</p>
                  </div>
                </div>

                {/* Application Details */}
                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-1">
                      Why they want to organize
                    </h4>
                    <p className="text-text-primary bg-bg-primary rounded-lg p-3">
                      {selectedApplication.reason}
                    </p>
                  </div>

                  {selectedApplication.experience && (
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-1">Experience</h4>
                      <p className="text-text-primary bg-bg-primary rounded-lg p-3">
                        {selectedApplication.experience}
                      </p>
                    </div>
                  )}

                  {selectedApplication.venue_name && (
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-1 flex items-center gap-2">
                        <FiMapPin className="w-4 h-4" /> Venue
                      </h4>
                      <div className="bg-bg-primary rounded-lg p-3">
                        <p className="text-text-primary font-medium">
                          {selectedApplication.venue_name}
                        </p>
                        {selectedApplication.venue_address && (
                          <p className="text-text-secondary text-sm">
                            {selectedApplication.venue_address}
                          </p>
                        )}
                        <div className="flex gap-4 mt-1 text-sm text-text-secondary">
                          {selectedApplication.venue_city && (
                            <span>{selectedApplication.venue_city}</span>
                          )}
                          {selectedApplication.venue_capacity && (
                            <span>Capacity: {selectedApplication.venue_capacity}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedApplication.dance_styles &&
                    selectedApplication.dance_styles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary mb-1 flex items-center gap-2">
                          <FiMusic className="w-4 h-4" /> Dance Styles
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplication.dance_styles.map((style: string) => (
                            <span
                              key={style}
                              className="px-3 py-1 bg-neon-purple/20 text-neon-purple rounded-full"
                            >
                              {style}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {(selectedApplication.website_url || selectedApplication.social_media) && (
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-1 flex items-center gap-2">
                        <FiGlobe className="w-4 h-4" /> Online Presence
                      </h4>
                      <div className="flex flex-wrap gap-4">
                        {selectedApplication.website_url && (
                          <a
                            href={selectedApplication.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-neon-purple hover:underline"
                          >
                            Website <FiExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {selectedApplication.social_media && (
                          <span className="text-text-primary">
                            {selectedApplication.social_media}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedApplication.additional_info && (
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-1">
                        Additional Information
                      </h4>
                      <p className="text-text-primary bg-bg-primary rounded-lg p-3">
                        {selectedApplication.additional_info}
                      </p>
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                {selectedApplication.status === 'pending' && (
                  <div className="mb-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                      <FiMessageSquare className="w-4 h-4" /> Admin Notes (optional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                      placeholder="Add feedback for the applicant..."
                    />
                  </div>
                )}

                {/* Show existing admin notes for reviewed applications */}
                {selectedApplication.status !== 'pending' && selectedApplication.admin_notes && (
                  <div className="mb-6 p-4 bg-bg-primary rounded-lg">
                    <h4 className="text-sm font-medium text-text-secondary mb-1">Admin Notes</h4>
                    <p className="text-text-primary">{selectedApplication.admin_notes}</p>
                    {selectedApplication.reviewer && (
                      <p className="text-sm text-text-secondary mt-2">
                        Reviewed by{' '}
                        {selectedApplication.reviewer.display_name ||
                          selectedApplication.reviewer.username}
                        {selectedApplication.reviewed_at &&
                          ` on ${formatDate(selectedApplication.reviewed_at)}`}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {selectedApplication.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReview('rejected')}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      <FiX className="w-5 h-5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview('approved')}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      <FiCheck className="w-5 h-5" />
                      Approve
                    </button>
                  </div>
                )}

                {selectedApplication.status !== 'pending' && (
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="w-full py-3 bg-gray-600 text-text-primary rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}
