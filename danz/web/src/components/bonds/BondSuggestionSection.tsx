'use client'

import type { SuggestedBond } from '@/src/types/bonds'
import { useState } from 'react'
import { SuggestedBondCard } from './SuggestedBondCard'

interface BondSuggestionSectionProps {
  suggestions: SuggestedBond[]
  onAcceptBond: (bondId: string) => Promise<void>
  onDeclineBond: (bondId: string) => Promise<void>
}

export function BondSuggestionSection({
  suggestions,
  onAcceptBond,
  onDeclineBond,
}: BondSuggestionSectionProps) {
  const [loadingBondId, setLoadingBondId] = useState<string | null>(null)
  const [visibleSuggestions, setVisibleSuggestions] = useState(suggestions)

  const handleAccept = async (bondId: string) => {
    setLoadingBondId(bondId)
    try {
      await onAcceptBond(bondId)
      // Remove from list after successful bond
      setVisibleSuggestions(prev => prev.filter(s => s.id !== bondId))
    } finally {
      setLoadingBondId(null)
    }
  }

  const handleDecline = async (bondId: string) => {
    setLoadingBondId(bondId)
    try {
      await onDeclineBond(bondId)
      // Remove from list after decline
      setVisibleSuggestions(prev => prev.filter(s => s.id !== bondId))
    } finally {
      setLoadingBondId(null)
    }
  }

  if (visibleSuggestions.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 flex items-center justify-center">
          <span className="text-3xl">🤝</span>
        </div>
        <h3 className="text-text-primary font-semibold mb-2">No Bonds Available</h3>
        <p className="text-text-muted text-sm max-w-[250px] mx-auto">
          Keep dancing daily to unlock more bond suggestions with fellow dancers!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤝</span>
          <h2 className="text-lg font-semibold text-text-primary">Suggested Bonds</h2>
        </div>
        <span className="text-sm text-text-muted">
          {visibleSuggestions.length} match{visibleSuggestions.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Suggestion cards - horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4 scrollbar-hide">
        {visibleSuggestions.map(suggestion => (
          <div key={suggestion.id} className="flex-shrink-0 w-[300px] snap-center">
            <SuggestedBondCard
              bond={suggestion}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isLoading={loadingBondId === suggestion.id}
            />
          </div>
        ))}
      </div>

      {/* View all link */}
      {visibleSuggestions.length > 2 && (
        <div className="text-center">
          <button className="text-sm text-neon-pink hover:text-neon-purple transition-colors">
            View all suggestions →
          </button>
        </div>
      )}
    </div>
  )
}
