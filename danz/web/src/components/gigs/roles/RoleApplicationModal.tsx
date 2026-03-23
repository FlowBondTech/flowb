'use client'

import {
  type GetAllGigRolesQuery,
  useApplyForGigRoleMutation,
  useGetAllGigRolesQuery,
} from '@/src/generated/graphql'
import { useEffect, useState } from 'react'
import { FiAlertCircle, FiCheck, FiStar, FiUsers, FiX } from 'react-icons/fi'

type GigRoleType = NonNullable<GetAllGigRolesQuery['allGigRoles']>[number]

interface RoleApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  existingRoleIds: string[]
  onSuccess: () => void
}

export default function RoleApplicationModal({
  isOpen,
  onClose,
  existingRoleIds,
  onSuccess,
}: RoleApplicationModalProps) {
  const [selectedRole, setSelectedRole] = useState<GigRoleType | null>(null)
  const [experienceNotes, setExperienceNotes] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data, loading } = useGetAllGigRolesQuery({
    variables: { activeOnly: true },
  })

  const [applyForGigRole] = useApplyForGigRoleMutation()

  useEffect(() => {
    if (!isOpen) {
      setSelectedRole(null)
      setExperienceNotes('')
      setPortfolioUrl('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!selectedRole) return

    try {
      setIsSubmitting(true)
      await applyForGigRole({
        variables: {
          input: {
            roleId: selectedRole.id,
            experienceNotes: experienceNotes || undefined,
            portfolioUrls: portfolioUrl ? [portfolioUrl] : undefined,
          },
        },
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to apply for role:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableRoles = data?.allGigRoles?.filter(role => !existingRoleIds.includes(role.id)) || []

  const getTierLabel = (tier: number) => {
    const labels = ['Beginner', 'Intermediate', 'Skilled', 'Expert']
    return labels[tier - 1] || 'Unknown'
  }

  const getTierColor = (tier: number) => {
    const colors = [
      'text-gray-400 bg-gray-500/20',
      'text-blue-400 bg-blue-500/20',
      'text-purple-400 bg-purple-500/20',
      'text-yellow-400 bg-yellow-500/20',
    ]
    return colors[tier - 1] || 'text-gray-400 bg-gray-500/20'
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      OPERATIONS: 'text-blue-400',
      CREATIVE: 'text-pink-400',
      TECHNICAL: 'text-cyan-400',
      HOSPITALITY: 'text-green-400',
      SAFETY: 'text-red-400',
    }
    return colors[category] || 'text-gray-400'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] m-4 bg-bg-secondary border border-neon-purple/20 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-text-primary">
            {selectedRole ? 'Apply for Role' : 'Browse Gig Roles'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <FiX className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
            </div>
          ) : selectedRole ? (
            // Application Form
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-bg-tertiary rounded-xl">
                <span className="text-3xl">{selectedRole.icon || '💼'}</span>
                <div>
                  <h3 className="font-semibold text-text-primary">{selectedRole.name}</h3>
                  <p className="text-sm text-text-muted">{selectedRole.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <span
                  className={`px-3 py-1 text-xs rounded-full ${getTierColor(selectedRole.tier)}`}
                >
                  {getTierLabel(selectedRole.tier)}
                </span>
                <span className={`text-xs ${getCategoryColor(selectedRole.category)}`}>
                  {selectedRole.category}
                </span>
                <span className="text-xs text-green-400">
                  {selectedRole.baseDanzRate} $DANZ base rate
                </span>
              </div>

              {selectedRole.requiresVerification && (
                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <FiAlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-400">Verification Required</p>
                    <p className="text-sm text-text-muted mt-1">
                      This role requires verification before approval. Please provide relevant
                      experience or credentials.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Experience & Qualifications
                </label>
                <textarea
                  value={experienceNotes}
                  onChange={e => setExperienceNotes(e.target.value)}
                  placeholder="Tell us about your relevant experience..."
                  className="w-full h-32 px-4 py-3 bg-bg-tertiary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Portfolio/Reference URL (optional)
                </label>
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={e => setPortfolioUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-bg-tertiary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/50"
                />
              </div>
            </div>
          ) : (
            // Role Selection
            <div className="space-y-4">
              {availableRoles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-muted">You've applied for all available roles!</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-text-muted mb-4">
                    Select a role to apply for. Higher tier roles may require verification.
                  </p>

                  <div className="grid gap-3">
                    {availableRoles.map(role => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role)}
                        className="flex items-center gap-4 p-4 bg-bg-tertiary hover:bg-bg-tertiary/80 border border-transparent hover:border-neon-purple/30 rounded-xl transition-all text-left"
                      >
                        <span className="text-2xl">{role.icon || '💼'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-text-primary">{role.name}</p>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${getTierColor(role.tier)}`}
                            >
                              {getTierLabel(role.tier)}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted truncate">{role.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className={getCategoryColor(role.category)}>{role.category}</span>
                            <span className="text-green-400">{role.baseDanzRate} $DANZ</span>
                            {(role.approvedWorkers ?? 0) > 0 && (
                              <span className="flex items-center gap-1 text-text-muted">
                                <FiUsers size={12} />
                                {role.approvedWorkers} workers
                              </span>
                            )}
                          </div>
                        </div>
                        {role.requiresVerification && (
                          <FiStar className="w-4 h-4 text-yellow-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedRole && (
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <button
              onClick={() => setSelectedRole(null)}
              className="px-4 py-2 text-text-muted hover:text-text-primary transition-colors"
            >
              ← Back to roles
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FiCheck size={16} />
                  Submit Application
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
