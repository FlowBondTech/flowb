'use client'

import { FiBriefcase } from 'react-icons/fi'

interface GigOpportunityIconProps {
  count: number
  size?: 'sm' | 'md'
}

export default function GigOpportunityIcon({ count, size = 'sm' }: GigOpportunityIconProps) {
  if (count <= 0) return null

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
  }

  return (
    <div className="relative group">
      <div
        className={`${sizeClasses[size]} rounded-full bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center`}
      >
        <FiBriefcase className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} text-neon-purple`} />
      </div>

      {count > 1 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-neon-purple text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-bg-primary border border-neon-purple/30 rounded-lg text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {count} gig{count > 1 ? 's' : ''} available
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-bg-primary" />
      </div>
    </div>
  )
}
