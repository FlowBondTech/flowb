'use client'

import { FiMusic, FiTrendingUp } from 'react-icons/fi'

interface StyleProgress {
  id: string
  style: string
  level: string
  progress: number
  practiceHours: number
  recentImprovement: number
  icon: string
}

// Mock data
const mockStylesProgress: StyleProgress[] = [
  {
    id: '1',
    style: 'Hip Hop',
    level: 'Intermediate',
    progress: 65,
    practiceHours: 32,
    recentImprovement: 12,
    icon: '🎤',
  },
  {
    id: '2',
    style: 'Contemporary',
    level: 'Advanced',
    progress: 85,
    practiceHours: 48,
    recentImprovement: 8,
    icon: '🌟',
  },
  {
    id: '3',
    style: 'Breaking',
    level: 'Beginner',
    progress: 35,
    practiceHours: 15,
    recentImprovement: 18,
    icon: '⚡',
  },
]

export default function DanceStyleProgressWidget() {
  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'advanced':
        return 'text-yellow-400'
      case 'intermediate':
        return 'text-blue-400'
      default:
        return 'text-green-400'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'from-yellow-400 to-orange-400'
    if (progress >= 50) return 'from-blue-400 to-cyan-400'
    return 'from-green-400 to-emerald-400'
  }

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <FiMusic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Dance Style Progress</h2>
            <p className="text-sm text-text-secondary">
              {mockStylesProgress.length} styles tracked
            </p>
          </div>
        </div>
      </div>

      {mockStylesProgress.length > 0 ? (
        <div className="space-y-4">
          {mockStylesProgress.map(styleProgress => (
            <div
              key={styleProgress.id}
              className="p-4 bg-bg-primary/30 border border-white/5 hover:border-neon-purple/30 rounded-xl transition-all group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl">{styleProgress.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary group-hover:text-neon-purple transition-colors">
                        {styleProgress.style}
                      </h3>
                      <p className={`text-sm font-medium ${getLevelColor(styleProgress.level)}`}>
                        {styleProgress.level}
                      </p>
                    </div>
                    {styleProgress.recentImprovement > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                        <FiTrendingUp size={12} className="text-green-400" />
                        <span className="text-xs font-medium text-green-400">
                          +{styleProgress.recentImprovement}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Proficiency</span>
                      <span className="text-text-secondary font-medium">
                        {styleProgress.progress}%
                      </span>
                    </div>
                    <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${getProgressColor(
                          styleProgress.progress,
                        )} rounded-full transition-all duration-500`}
                        style={{ width: `${styleProgress.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Practice Hours */}
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-text-muted">Practice Hours</span>
                    <span className="text-text-primary font-medium">
                      {styleProgress.practiceHours}h
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
            <FiMusic className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-text-secondary mb-4">No dance styles tracked yet</p>
          <button className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all">
            Add Dance Styles
          </button>
        </div>
      )}

      {/* Summary Stats */}
      {mockStylesProgress.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-text-primary">
              {mockStylesProgress.reduce((sum, s) => sum + s.practiceHours, 0)}h
            </div>
            <div className="text-xs text-text-muted">Total Practice</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-text-primary">
              {Math.round(
                mockStylesProgress.reduce((sum, s) => sum + s.progress, 0) /
                  mockStylesProgress.length,
              )}
              %
            </div>
            <div className="text-xs text-text-muted">Avg Progress</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-text-primary">
              +
              {Math.round(
                mockStylesProgress.reduce((sum, s) => sum + s.recentImprovement, 0) /
                  mockStylesProgress.length,
              )}
              %
            </div>
            <div className="text-xs text-text-muted">This Week</div>
          </div>
        </div>
      )}
    </div>
  )
}
