'use client'

import { FiCheckCircle, FiTarget } from 'react-icons/fi'

interface SponsorshipProgressBarProps {
  current: number
  goal: number
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact' | 'detailed'
}

export default function SponsorshipProgressBar({
  current,
  goal,
  showLabels = true,
  size = 'md',
  variant = 'default',
}: SponsorshipProgressBarProps) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0
  const isComplete = percentage >= 100

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  if (variant === 'compact') {
    return (
      <div className="w-full">
        <div className={`w-full bg-white/10 rounded-full overflow-hidden ${heightClasses[size]}`}>
          <div
            className={`h-full transition-all duration-500 ${
              isComplete
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : 'bg-gradient-to-r from-neon-purple to-neon-pink'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabels && (
          <div className="flex items-center justify-between mt-1 text-xs">
            <span className="text-text-muted">{percentage.toFixed(0)}%</span>
            <span className="text-text-muted">
              ${current.toLocaleString()} / ${goal.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className="p-4 bg-bg-tertiary rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <FiCheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <FiTarget className="w-5 h-5 text-neon-purple" />
            )}
            <span className="font-medium text-text-primary">
              {isComplete ? 'Goal Reached!' : 'Sponsorship Goal'}
            </span>
          </div>
          <span className={`font-bold ${isComplete ? 'text-green-400' : 'text-neon-purple'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>

        <div className={`w-full bg-white/10 rounded-full overflow-hidden ${heightClasses.lg}`}>
          <div
            className={`h-full transition-all duration-500 ${
              isComplete
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : 'bg-gradient-to-r from-neon-purple to-neon-pink'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-sm text-text-muted">Raised</p>
            <p className="text-lg font-bold text-green-400">${current.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-muted">Goal</p>
            <p className="text-lg font-bold text-text-primary">${goal.toLocaleString()}</p>
          </div>
        </div>

        {!isComplete && (
          <p className="text-center text-sm text-text-muted mt-3">
            ${(goal - current).toLocaleString()} more to reach goal
          </p>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <FiCheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <FiTarget className="w-4 h-4 text-text-muted" />
            )}
            <span className="text-sm text-text-muted">
              {isComplete ? 'Goal Reached!' : 'Sponsorship Progress'}
            </span>
          </div>
          <span
            className={`text-sm font-medium ${isComplete ? 'text-green-400' : 'text-text-primary'}`}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}

      <div className={`w-full bg-white/10 rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`h-full transition-all duration-500 ${
            isComplete
              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
              : 'bg-gradient-to-r from-neon-purple to-neon-pink'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showLabels && (
        <div className="flex items-center justify-between mt-1.5 text-xs text-text-muted">
          <span>${current.toLocaleString()} raised</span>
          <span>${goal.toLocaleString()} goal</span>
        </div>
      )}
    </div>
  )
}
