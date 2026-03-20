'use client'

import { SponsorTier } from '@/src/generated/graphql'

interface SponsorBadgeProps {
  tier: SponsorTier
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const TIER_CONFIG: Record<
  SponsorTier,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  [SponsorTier.Bronze]: {
    label: 'Bronze',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  [SponsorTier.Silver]: {
    label: 'Silver',
    color: 'text-gray-300',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/30',
  },
  [SponsorTier.Gold]: {
    label: 'Gold',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  [SponsorTier.Platinum]: {
    label: 'Platinum',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  [SponsorTier.Diamond]: {
    label: 'Diamond',
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}

export default function SponsorBadge({ tier, size = 'md', showLabel = true }: SponsorBadgeProps) {
  const config = TIER_CONFIG[tier]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.bgColor} ${config.borderColor} ${config.color} ${SIZE_CLASSES[size]}`}
    >
      {tier === SponsorTier.Diamond && <span>💎</span>}
      {tier === SponsorTier.Platinum && <span>🏆</span>}
      {tier === SponsorTier.Gold && <span>🥇</span>}
      {tier === SponsorTier.Silver && <span>🥈</span>}
      {tier === SponsorTier.Bronze && <span>🥉</span>}
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

// Export tier config for use in other components
export { TIER_CONFIG }
