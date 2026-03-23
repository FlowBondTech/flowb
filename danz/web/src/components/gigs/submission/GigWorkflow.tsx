'use client'

import { useCheckInToGigMutation, useCheckOutFromGigMutation } from '@/src/generated/graphql'
import { useState } from 'react'
import { FiAlertCircle, FiCheckCircle, FiClock, FiMapPin, FiUpload } from 'react-icons/fi'
import ProofUploader from './ProofUploader'

interface ApplicationData {
  id: string
  status: string
  checkInTime?: string | null
  checkOutTime?: string | null
  danzAwarded?: number | null
  organizerRating?: number | null
  submissions?: unknown[] | null
  gig?: {
    title: string
    role?: {
      icon?: string | null
    } | null
    event?: {
      title: string
      start_date_time: string
      end_date_time: string
      location_name?: string | null
    } | null
  } | null
}

interface GigWorkflowProps {
  application: ApplicationData
  onRefresh: () => void
}

export default function GigWorkflow({ application, onRefresh }: GigWorkflowProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showProofUploader, setShowProofUploader] = useState(false)

  const [checkInToGig] = useCheckInToGigMutation()
  const [checkOutFromGig] = useCheckOutFromGigMutation()

  const gig = application.gig
  const event = gig?.event

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleCheckIn = async () => {
    try {
      setIsProcessing(true)
      await checkInToGig({
        variables: { applicationId: application.id },
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to check in:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setIsProcessing(true)
      await checkOutFromGig({
        variables: { applicationId: application.id },
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to check out:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Determine current workflow state
  const isCheckedIn = !!application.checkInTime && !application.checkOutTime
  const isCheckedOut = !!application.checkOutTime
  const hasSubmissions = (application.submissions?.length || 0) > 0

  // Check if event is active (within check-in window)
  const now = new Date()
  const eventStart = event ? new Date(event.start_date_time) : null
  const eventEnd = event ? new Date(event.end_date_time) : null
  const hoursBeforeStart = eventStart
    ? (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60)
    : 0
  const canCheckIn = !application.checkInTime && hoursBeforeStart <= 2 && hoursBeforeStart >= -4
  const canCheckOut = isCheckedIn && eventStart && eventEnd && now >= eventStart

  const getStatusStep = () => {
    if (application.status === 'COMPLETED') return 4
    if (hasSubmissions) return 3
    if (isCheckedOut) return 2
    if (isCheckedIn) return 1
    return 0
  }

  const currentStep = getStatusStep()

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-3xl">{gig?.role?.icon || '💼'}</span>
          <div>
            <h3 className="font-semibold text-text-primary">{gig?.title}</h3>
            <p className="text-sm text-text-muted">{event?.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-text-muted">
          <div className="flex items-center gap-1">
            <FiClock size={14} />
            <span>
              {event && formatDate(event.start_date_time)} at{' '}
              {event && formatTime(event.start_date_time)}
            </span>
          </div>
          {event?.location_name && (
            <div className="flex items-center gap-1">
              <FiMapPin size={14} />
              <span>{event.location_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          {['Approved', 'Checked In', 'Checked Out', 'Proof Submitted', 'Completed'].map(
            (step, index) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-bg-tertiary text-text-muted'
                  }`}
                >
                  {index <= currentStep ? <FiCheckCircle size={16} /> : index + 1}
                </div>
                <span className="text-xs text-text-muted mt-1 hidden sm:block">{step}</span>
              </div>
            ),
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Action Area */}
      <div className="p-6">
        {application.status === 'COMPLETED' ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h4 className="text-lg font-semibold text-text-primary mb-2">Gig Completed!</h4>
            <p className="text-green-400 text-xl font-bold">+{application.danzAwarded} $DANZ</p>
            {(application.organizerRating ?? 0) > 0 && (
              <p className="text-text-muted text-sm mt-2">
                Rating: {application.organizerRating}/5 ⭐
              </p>
            )}
          </div>
        ) : showProofUploader ? (
          <ProofUploader
            applicationId={application.id}
            onSuccess={() => {
              setShowProofUploader(false)
              onRefresh()
            }}
            onCancel={() => setShowProofUploader(false)}
          />
        ) : (
          <>
            {/* Check-in/Check-out Times */}
            {(application.checkInTime || application.checkOutTime) && (
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-bg-tertiary rounded-xl">
                {application.checkInTime && (
                  <div>
                    <p className="text-xs text-text-muted">Checked In</p>
                    <p className="text-sm text-green-400 font-medium">
                      {formatTime(application.checkInTime)}
                    </p>
                  </div>
                )}
                {application.checkOutTime && (
                  <div>
                    <p className="text-xs text-text-muted">Checked Out</p>
                    <p className="text-sm text-blue-400 font-medium">
                      {formatTime(application.checkOutTime)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {canCheckIn && (
                <button
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-500/80 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiCheckCircle size={20} />
                  )}
                  Check In
                </button>
              )}

              {canCheckOut && (
                <button
                  onClick={handleCheckOut}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-500/80 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiClock size={20} />
                  )}
                  Check Out
                </button>
              )}

              {isCheckedOut && !hasSubmissions && (
                <button
                  onClick={() => setShowProofUploader(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-xl font-medium transition-colors"
                >
                  <FiUpload size={20} />
                  Submit Proof
                </button>
              )}

              {hasSubmissions && application.status !== 'COMPLETED' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/20 text-yellow-400 rounded-xl">
                  <FiAlertCircle size={20} />
                  <span>Awaiting review from organizer</span>
                </div>
              )}

              {!canCheckIn && !isCheckedIn && !isCheckedOut && (
                <div className="flex items-center gap-2 px-4 py-3 bg-bg-tertiary text-text-muted rounded-xl">
                  <FiClock size={20} />
                  <span>Check-in opens 2 hours before event</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
