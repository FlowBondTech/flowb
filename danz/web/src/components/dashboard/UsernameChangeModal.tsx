'use client'

import { useMutation, useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { useEffect, useState } from 'react'
import {
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiEdit3,
  FiInfo,
  FiLoader,
  FiLock,
  FiShield,
  FiX,
} from 'react-icons/fi'

const GET_USERNAME_ELIGIBILITY = gql`
  query GetUsernameChangeEligibility {
    myUsernameChangeEligibility {
      can_request
      is_first_change
      will_auto_approve
      pending_request {
        id
        current_username
        requested_username
        reason
        status
        admin_note
        created_at
      }
      change_count
      last_change_at
      cooldown_ends_at
      message
    }
  }
`

const REQUEST_USERNAME_CHANGE = gql`
  mutation RequestUsernameChange($input: RequestUsernameChangeInput!) {
    requestUsernameChange(input: $input) {
      success
      message
      auto_approved
      request {
        id
        current_username
        requested_username
        status
        created_at
      }
    }
  }
`

const CANCEL_USERNAME_REQUEST = gql`
  mutation CancelUsernameChangeRequest($requestId: ID!) {
    cancelUsernameChangeRequest(request_id: $requestId) {
      success
      message
    }
  }
`

const CHECK_USERNAME = gql`
  query CheckUsername($username: String!) {
    checkUsername(username: $username)
  }
`

interface UsernameChangeModalProps {
  isOpen: boolean
  onClose: () => void
  currentUsername: string
  onSuccess?: () => void
  isMinted?: boolean
}

export default function UsernameChangeModal({
  isOpen,
  onClose,
  currentUsername,
  onSuccess,
  isMinted = false,
}: UsernameChangeModalProps) {
  const [newUsername, setNewUsername] = useState('')
  const [reason, setReason] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null)

  const {
    data: eligibilityData,
    loading: eligibilityLoading,
    refetch,
  } = useQuery(GET_USERNAME_ELIGIBILITY, { skip: !isOpen })

  const [requestChange, { loading: requesting }] = useMutation(REQUEST_USERNAME_CHANGE, {
    onCompleted: data => {
      if (data.requestUsernameChange.success) {
        if (data.requestUsernameChange.auto_approved) {
          onSuccess?.()
          onClose()
        } else {
          refetch()
        }
      }
    },
  })

  const [cancelRequest, { loading: cancelling }] = useMutation(CANCEL_USERNAME_REQUEST, {
    onCompleted: () => {
      refetch()
    },
  })

  const eligibility = eligibilityData?.myUsernameChangeEligibility

  // Validate username format
  const validateUsername = (username: string) => {
    if (!username) {
      setUsernameError('')
      setIsUsernameAvailable(null)
      return false
    }
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      setIsUsernameAvailable(null)
      return false
    }
    if (username.length > 20) {
      setUsernameError('Username must be 20 characters or less')
      setIsUsernameAvailable(null)
      return false
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError('Only letters, numbers, and underscores allowed')
      setIsUsernameAvailable(null)
      return false
    }
    if (username.toLowerCase() === currentUsername?.toLowerCase()) {
      setUsernameError('This is your current username')
      setIsUsernameAvailable(null)
      return false
    }
    setUsernameError('')
    return true
  }

  // Check username availability with debounce
  useEffect(() => {
    if (!validateUsername(newUsername)) return

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true)
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/graphql',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query CheckUsername($username: String!) { checkUsername(username: $username) }`,
              variables: { username: newUsername },
            }),
          },
        )
        const { data } = await response.json()
        setIsUsernameAvailable(data?.checkUsername ?? false)
      } catch (err) {
        console.error('Error checking username:', err)
        setIsUsernameAvailable(null)
      } finally {
        setIsCheckingUsername(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [newUsername, currentUsername])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateUsername(newUsername) || !isUsernameAvailable) return

    await requestChange({
      variables: {
        input: {
          new_username: newUsername,
          reason: reason || undefined,
        },
      },
    })
  }

  const handleCancel = async () => {
    if (!eligibility?.pending_request?.id) return
    await cancelRequest({
      variables: { requestId: eligibility.pending_request.id },
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-neon-purple/30 rounded-2xl w-full max-w-md mx-4 shadow-xl shadow-neon-purple/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <FiEdit3 className="text-neon-purple" />
            Change Username
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <FiX className="text-text-secondary" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isMinted ? (
            /* Minted Username - Cannot Change */
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <FiLock className="text-amber-500 mt-0.5" size={24} />
                  <div>
                    <h3 className="font-bold text-amber-500 text-lg">
                      Username Permanently Minted
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">
                      Your username has been minted as an on-chain identity and cannot be changed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <FiShield className="text-green-500" size={20} />
                  <div>
                    <p className="text-text-secondary text-sm">Your permanent identity:</p>
                    <p className="text-green-400 font-bold text-xl mt-1">
                      {currentUsername}.danz.eth
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-xs text-text-secondary">
                  Minted usernames are permanently recorded on the blockchain. This ensures your
                  identity is unique and verifiable across the DANZ ecosystem forever.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-text-primary font-medium transition-colors"
              >
                Close
              </button>
            </div>
          ) : eligibilityLoading ? (
            <div className="flex items-center justify-center py-8">
              <FiLoader className="animate-spin text-neon-purple" size={32} />
            </div>
          ) : eligibility?.pending_request ? (
            /* Pending Request View */
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <FiClock className="text-yellow-500 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-semibold text-yellow-500">Pending Request</h3>
                    <p className="text-sm text-text-secondary mt-1">
                      You have a pending username change request
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-white/5 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Current</span>
                  <span className="text-text-primary font-medium">
                    @{eligibility.pending_request.current_username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Requested</span>
                  <span className="text-neon-purple font-medium">
                    @{eligibility.pending_request.requested_username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Submitted</span>
                  <span className="text-text-primary text-sm">
                    {new Date(eligibility.pending_request.created_at).toLocaleDateString()}
                  </span>
                </div>
                {eligibility.pending_request.reason && (
                  <div>
                    <span className="text-text-secondary text-sm">Reason:</span>
                    <p className="text-text-primary text-sm mt-1">
                      {eligibility.pending_request.reason}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 font-medium transition-colors disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Request'}
              </button>
            </div>
          ) : !eligibility?.can_request ? (
            /* Cannot Request View */
            <div className="space-y-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="text-orange-500 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-semibold text-orange-500">Cannot Request Change</h3>
                    <p className="text-sm text-text-secondary mt-1">{eligibility?.message}</p>
                  </div>
                </div>
              </div>

              {eligibility?.cooldown_ends_at && (
                <div className="text-center text-sm text-text-secondary">
                  Next change available:{' '}
                  <span className="text-text-primary">
                    {new Date(eligibility.cooldown_ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Request Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Info Banner */}
              <div
                className={`p-4 rounded-xl ${
                  eligibility?.will_auto_approve
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-blue-500/10 border border-blue-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <FiInfo
                    className={eligibility?.will_auto_approve ? 'text-green-500' : 'text-blue-500'}
                    size={20}
                  />
                  <p className="text-sm text-text-secondary">
                    {eligibility?.will_auto_approve
                      ? 'This is your first username change and will be approved automatically!'
                      : 'Your request will be reviewed by our team. This usually takes 1-2 business days.'}
                  </p>
                </div>
              </div>

              {/* Current Username */}
              <div>
                <label className="block text-text-secondary text-sm mb-2">Current Username</label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-secondary">
                  @{currentUsername}
                </div>
              </div>

              {/* New Username */}
              <div>
                <label className="block text-text-secondary text-sm mb-2">New Username</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    @
                  </div>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e =>
                      setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    className={`w-full pl-8 pr-10 py-3 bg-white/5 border rounded-lg text-text-primary focus:outline-none transition-colors ${
                      usernameError
                        ? 'border-red-500'
                        : isUsernameAvailable
                          ? 'border-green-500'
                          : 'border-white/10 focus:border-neon-purple'
                    }`}
                    placeholder="new_username"
                    maxLength={20}
                  />
                  {/* Status indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername ? (
                      <FiLoader className="animate-spin text-text-secondary" size={18} />
                    ) : isUsernameAvailable === true ? (
                      <FiCheck className="text-green-500" size={18} />
                    ) : isUsernameAvailable === false ? (
                      <FiX className="text-red-500" size={18} />
                    ) : null}
                  </div>
                </div>
                {usernameError && <p className="text-red-500 text-sm mt-1">{usernameError}</p>}
                {isUsernameAvailable === false && !usernameError && (
                  <p className="text-red-500 text-sm mt-1">This username is already taken</p>
                )}
                {isUsernameAvailable === true && (
                  <p className="text-green-500 text-sm mt-1">Username is available!</p>
                )}
              </div>

              {/* Reason (optional for first change, helpful for subsequent) */}
              {!eligibility?.will_auto_approve && (
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Reason for change <span className="text-text-secondary/50">(optional)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors resize-none"
                    rows={3}
                    placeholder="Why would you like to change your username?"
                    maxLength={500}
                  />
                  <p className="text-text-secondary text-xs mt-1">
                    Providing a reason helps with faster approval
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={requesting || !newUsername || !isUsernameAvailable || !!usernameError}
                className="w-full py-3 bg-neon-purple hover:bg-neon-purple/80 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requesting
                  ? 'Submitting...'
                  : eligibility?.will_auto_approve
                    ? 'Change Username'
                    : 'Submit Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
