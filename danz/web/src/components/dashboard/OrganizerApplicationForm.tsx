'use client'

import {
  useGetMyOrganizerApplicationQuery,
  useSubmitOrganizerApplicationMutation,
} from '@/src/generated/graphql'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import {
  FiCheck,
  FiClock,
  FiGlobe,
  FiInfo,
  FiMapPin,
  FiMusic,
  FiSend,
  FiX,
  FiXCircle,
} from 'react-icons/fi'

interface OrganizerApplicationFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function OrganizerApplicationForm({
  isOpen,
  onClose,
  onSuccess,
}: OrganizerApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    data: existingApplication,
    loading: queryLoading,
    error: queryError,
    refetch,
  } = useGetMyOrganizerApplicationQuery({
    fetchPolicy: 'network-only', // Always fetch fresh data when form opens
    onError: error => {
      console.error('[OrganizerApplication] Query error:', error)
    },
  })
  const [submitApplication] = useSubmitOrganizerApplicationMutation()

  const application = existingApplication?.myOrganizerApplication

  // Log query state for debugging
  if (queryError) {
    console.error('[OrganizerApplication] Query failed:', queryError.message)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const danceStylesInput = formData.get('dance_styles') as string

    try {
      await submitApplication({
        variables: {
          input: {
            reason: formData.get('reason') as string,
            experience: (formData.get('experience') as string) || null,
            venue_name: (formData.get('venue_name') as string) || null,
            venue_address: (formData.get('venue_address') as string) || null,
            venue_city: (formData.get('venue_city') as string) || null,
            venue_capacity: formData.get('venue_capacity')
              ? Number.parseInt(formData.get('venue_capacity') as string)
              : null,
            dance_styles: danceStylesInput
              ? danceStylesInput
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean)
              : null,
            website_url: (formData.get('website_url') as string) || null,
            social_media: (formData.get('social_media') as string) || null,
            additional_info: (formData.get('additional_info') as string) || null,
          },
        },
      })

      refetch()
      onSuccess?.()
    } catch (error: any) {
      console.error('[OrganizerApplication] Submission error:', error)

      // Extract the most specific error message available
      let message = 'Failed to submit application'

      if (error?.graphQLErrors?.length > 0) {
        const gqlError = error.graphQLErrors[0]
        message = gqlError.message
        console.error('[OrganizerApplication] GraphQL error:', gqlError)
      } else if (error?.networkError) {
        message = 'Network error - please check your connection and try again'
        console.error('[OrganizerApplication] Network error:', error.networkError)
      } else if (error?.message) {
        message = error.message
      }

      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
            <FiClock className="w-5 h-5" />
            <span className="font-medium">Application Pending Review</span>
          </div>
        )
      case 'approved':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
            <FiCheck className="w-5 h-5" />
            <span className="font-medium">Application Approved!</span>
          </div>
        )
      case 'rejected':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg">
            <FiXCircle className="w-5 h-5" />
            <span className="font-medium">Application Not Approved</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">
                {queryLoading
                  ? 'Loading...'
                  : application
                    ? 'Your Organizer Application'
                    : 'Become an Event Organizer'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Loading state */}
            {queryLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
              </div>
            )}

            {/* Query error state */}
            {queryError && !queryLoading && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 mb-6">
                <FiXCircle className="w-5 h-5 flex-shrink-0" />
                <span>Failed to load application status. Please try again.</span>
              </div>
            )}

            {/* Show existing application status */}
            {!queryLoading && application ? (
              <div className="space-y-6">
                {getStatusBadge(application.status)}

                <div className="bg-bg-primary rounded-lg p-4 space-y-4">
                  <div>
                    <h3 className="text-sm text-text-secondary mb-1">Your Reason</h3>
                    <p className="text-text-primary">{application.reason}</p>
                  </div>

                  {application.experience && (
                    <div>
                      <h3 className="text-sm text-text-secondary mb-1">Experience</h3>
                      <p className="text-text-primary">{application.experience}</p>
                    </div>
                  )}

                  {application.venue_name && (
                    <div>
                      <h3 className="text-sm text-text-secondary mb-1">Venue</h3>
                      <p className="text-text-primary">
                        {application.venue_name}
                        {application.venue_city && ` - ${application.venue_city}`}
                        {application.venue_capacity && ` (Capacity: ${application.venue_capacity})`}
                      </p>
                    </div>
                  )}

                  {application.dance_styles && application.dance_styles.length > 0 && (
                    <div>
                      <h3 className="text-sm text-text-secondary mb-1">Dance Styles</h3>
                      <div className="flex flex-wrap gap-2">
                        {application.dance_styles.map(style => (
                          <span
                            key={style}
                            className="px-2 py-1 bg-neon-purple/20 text-neon-purple text-sm rounded-full"
                          >
                            {style}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {application.status === 'rejected' && application.admin_notes && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <h3 className="text-sm text-red-400 mb-1">Admin Feedback</h3>
                      <p className="text-text-primary">{application.admin_notes}</p>
                    </div>
                  )}

                  <div className="text-sm text-text-secondary">
                    Submitted on {new Date(application.created_at).toLocaleDateString()}
                  </div>
                </div>

                {application.status === 'rejected' && (
                  <p className="text-sm text-text-secondary">
                    You can submit a new application after addressing the feedback.
                  </p>
                )}
              </div>
            ) : !queryLoading ? (
              /* Show application form */
              <form onSubmit={handleSubmit} className="space-y-6">
                <p className="text-text-secondary">
                  Tell us about yourself and why you'd like to become an event organizer on DANZ.
                  Our team will review your application and get back to you.
                </p>

                {/* Reason - Required */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                    <FiInfo className="w-4 h-4 text-neon-purple" />
                    Why do you want to be an organizer? *
                  </label>
                  <textarea
                    name="reason"
                    required
                    rows={3}
                    className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                    placeholder="Tell us about your motivation to organize dance events..."
                  />
                </div>

                {/* Experience */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                    <FiMusic className="w-4 h-4 text-neon-purple" />
                    Dance/Event Experience
                  </label>
                  <textarea
                    name="experience"
                    rows={2}
                    className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                    placeholder="Any previous experience organizing events or teaching dance?"
                  />
                </div>

                {/* Venue Information */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <FiMapPin className="w-4 h-4 text-neon-purple" />
                    Venue Information (if applicable)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="venue_name"
                        className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                        placeholder="Venue name"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="venue_city"
                        className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                        placeholder="City"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="venue_address"
                        className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                        placeholder="Address"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        name="venue_capacity"
                        className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                        placeholder="Capacity (people)"
                      />
                    </div>
                  </div>
                </div>

                {/* Dance Styles */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                    <FiMusic className="w-4 h-4 text-neon-purple" />
                    Dance Styles (comma separated)
                  </label>
                  <input
                    type="text"
                    name="dance_styles"
                    className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                    placeholder="e.g., Salsa, Bachata, Hip Hop, Contemporary"
                  />
                </div>

                {/* Online Presence */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <FiGlobe className="w-4 h-4 text-neon-purple" />
                    Online Presence
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="url"
                        name="website_url"
                        className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                        placeholder="Website URL"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="social_media"
                        className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                        placeholder="Instagram, TikTok, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Anything else you'd like us to know?
                  </label>
                  <textarea
                    name="additional_info"
                    rows={2}
                    className="w-full bg-bg-primary text-text-primary rounded-lg px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
                    placeholder="Any additional information..."
                  />
                </div>

                {/* Error Message */}
                {submitError && (
                  <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500">
                    <FiXCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-600 text-text-primary rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-blue text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FiSend className="w-4 h-4" />
                        Submit Application
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
