'use client'

import { FiAward, FiUsers } from 'react-icons/fi'

interface RoleData {
  name: string
  description?: string | null
  icon?: string | null
  tier: number
  category: string
  baseDanzRate: number
  requiresVerification?: boolean
  approvedWorkers?: number | null
  registeredWorkers?: number | null
}

interface RoleCardProps {
  role: RoleData
  onClick?: () => void
  selected?: boolean
}

export default function RoleCard({ role, onClick, selected }: RoleCardProps) {
  const getTierColor = (tier: number) => {
    const colors = [
      'from-gray-500/20 to-gray-500/5 border-gray-500/30',
      'from-blue-500/20 to-blue-500/5 border-blue-500/30',
      'from-purple-500/20 to-purple-500/5 border-purple-500/30',
      'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
    ]
    return colors[tier - 1] || colors[0]
  }

  const getTierLabel = (tier: number) => {
    const labels = ['Beginner', 'Intermediate', 'Skilled', 'Expert']
    return labels[tier - 1] || 'Unknown'
  }

  const getTierTextColor = (tier: number) => {
    const colors = ['text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400']
    return colors[tier - 1] || colors[0]
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

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-br ${getTierColor(role.tier)} border transition-all ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      } ${selected ? 'ring-2 ring-neon-purple' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{role.icon || '💼'}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-primary">{role.name}</h3>
            {role.requiresVerification && <FiAward className="w-4 h-4 text-yellow-400" />}
          </div>

          <p className="text-sm text-text-muted mb-3 line-clamp-2">{role.description}</p>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className={`${getTierTextColor(role.tier)} font-medium`}>
              {getTierLabel(role.tier)}
            </span>
            <span className={getCategoryColor(role.category)}>{role.category}</span>
            <span className="text-green-400 font-medium">{role.baseDanzRate} $DANZ</span>
          </div>

          {((role.approvedWorkers ?? 0) > 0 || (role.registeredWorkers ?? 0) > 0) && (
            <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
              {(role.approvedWorkers ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <FiUsers size={12} />
                  {role.approvedWorkers} workers
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
