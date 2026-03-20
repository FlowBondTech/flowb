'use client'

interface RoleData {
  name: string
  icon?: string | null
  tier: number
}

interface RoleBadgeProps {
  role: RoleData
  size?: 'sm' | 'md' | 'lg'
  showTier?: boolean
}

export default function RoleBadge({ role, size = 'md', showTier = false }: RoleBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  }

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const getTierColor = (tier: number) => {
    const colors = [
      'bg-gray-500/20 border-gray-500/30 text-gray-300',
      'bg-blue-500/20 border-blue-500/30 text-blue-300',
      'bg-purple-500/20 border-purple-500/30 text-purple-300',
      'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
    ]
    return colors[tier - 1] || colors[0]
  }

  const getTierLabel = (tier: number) => {
    const labels = ['T1', 'T2', 'T3', 'T4']
    return labels[tier - 1] || 'T1'
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses[size]} ${getTierColor(role.tier)}`}
    >
      <span className={iconSizes[size]}>{role.icon || '💼'}</span>
      <span className="font-medium">{role.name}</span>
      {showTier && <span className="opacity-70">{getTierLabel(role.tier)}</span>}
    </span>
  )
}
