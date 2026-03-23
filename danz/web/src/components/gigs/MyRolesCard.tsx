'use client'

import type { GetMyGigDashboardQuery } from '@/src/generated/graphql'
import { useState } from 'react'
import { FiBriefcase, FiCheck, FiClock, FiPlus, FiStar, FiX } from 'react-icons/fi'
import RoleApplicationModal from './roles/RoleApplicationModal'

type UserRoleType = NonNullable<
  NonNullable<GetMyGigDashboardQuery['myGigDashboard']>['myRoles']
>[number]

interface MyRolesCardProps {
  roles: UserRoleType[]
  onRefresh: () => void
}

export default function MyRolesCard({ roles, onRefresh }: MyRolesCardProps) {
  const [showModal, setShowModal] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
            <FiCheck size={10} /> Active
          </span>
        )
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
            <FiClock size={10} /> Pending
          </span>
        )
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
            <FiX size={10} /> Rejected
          </span>
        )
      default:
        return null
    }
  }

  const getTierLabel = (tier: number) => {
    const labels = ['Beginner', 'Intermediate', 'Skilled', 'Expert']
    return labels[tier - 1] || 'Unknown'
  }

  const getTierColor = (tier: number) => {
    const colors = ['text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400']
    return colors[tier - 1] || 'text-gray-400'
  }

  return (
    <>
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
              <FiBriefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">My Gig Roles</h3>
              <p className="text-sm text-text-muted">
                {roles.filter(r => r.status === 'APPROVED').length} active roles
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple rounded-lg text-sm font-medium transition-colors"
          >
            <FiPlus size={16} />
            Add Role
          </button>
        </div>

        {roles.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
              <FiBriefcase className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-text-muted mb-3">No gig roles yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Browse Available Roles
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map(userRole => (
              <div
                key={userRole.id}
                className="flex items-center justify-between p-3 bg-bg-tertiary rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{userRole.role?.icon || '💼'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary">{userRole.role?.name}</p>
                      {getStatusBadge(userRole.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs ${getTierColor(userRole.role?.tier || 1)}`}>
                        {getTierLabel(userRole.role?.tier || 1)}
                      </span>
                      {userRole.status === 'APPROVED' && (
                        <>
                          <span className="text-xs text-text-muted">
                            {userRole.totalGigsCompleted} gigs
                          </span>
                          {userRole.rating > 0 && (
                            <span className="flex items-center gap-1 text-xs text-yellow-400">
                              <FiStar size={10} />
                              {userRole.rating.toFixed(1)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-400">
                    {userRole.role?.baseDanzRate || 0} $DANZ
                  </p>
                  <p className="text-xs text-text-muted">base rate</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RoleApplicationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        existingRoleIds={roles.map(r => r.roleId)}
        onSuccess={() => {
          setShowModal(false)
          onRefresh()
        }}
      />
    </>
  )
}
