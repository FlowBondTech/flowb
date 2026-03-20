'use client'

import { useState } from 'react'
import { BENEFIT_OPTIONS, type DanceReflection, FEELING_OPTIONS } from './types'

interface ReflectionScreenProps {
  onSubmit: (reflection: DanceReflection | null) => void
  onSkip: () => void
}

export function ReflectionScreen({ onSubmit, onSkip }: ReflectionScreenProps) {
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null)
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([])

  const toggleBenefit = (benefitId: string) => {
    setSelectedBenefits(prev =>
      prev.includes(benefitId) ? prev.filter(b => b !== benefitId) : [...prev, benefitId],
    )
  }

  const handleSubmit = () => {
    if (!selectedFeeling && selectedBenefits.length === 0) {
      onSkip()
      return
    }

    onSubmit({
      feeling: selectedFeeling,
      benefits: selectedBenefits.length > 0 ? selectedBenefits : null,
    })
  }

  const hasSelection = selectedFeeling || selectedBenefits.length > 0

  return (
    <div className="flex flex-col min-h-[500px] px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">How was your dance?</h1>
        <p className="text-text-secondary text-sm">Share your experience to earn bonus XP</p>
        <div className="mt-2 text-xs text-neon-blue">+25 XP reflection bonus</div>
      </div>

      {/* Feeling selection */}
      <div className="mb-6">
        <h2 className="text-sm text-text-secondary mb-3">How did it feel?</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {FEELING_OPTIONS.map(option => (
            <button
              key={option.id}
              onClick={() => setSelectedFeeling(selectedFeeling === option.id ? null : option.id)}
              className={`
                px-4 py-2 rounded-full text-sm
                transition-all duration-200
                ${
                  selectedFeeling === option.id
                    ? 'bg-gradient-to-r from-neon-pink to-neon-purple text-white shadow-glow-pink'
                    : 'bg-bg-card text-text-secondary hover:bg-bg-hover border border-white/10'
                }
              `}
            >
              <span className="mr-1">{option.emoji}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Benefits selection */}
      <div className="mb-8 flex-1">
        <h2 className="text-sm text-text-secondary mb-3">What did it bring you?</h2>
        <div className="grid grid-cols-2 gap-2">
          {BENEFIT_OPTIONS.map(option => (
            <button
              key={option.id}
              onClick={() => toggleBenefit(option.id)}
              className={`
                px-3 py-3 rounded-xl text-sm
                transition-all duration-200
                flex items-center gap-2
                ${
                  selectedBenefits.includes(option.id)
                    ? 'bg-gradient-to-r from-neon-pink/30 to-neon-purple/30 text-white border-2 border-neon-pink'
                    : 'bg-bg-card text-text-secondary hover:bg-bg-hover border border-white/10'
                }
              `}
            >
              <span className="text-lg">{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          className={`
            w-full py-4 rounded-xl font-semibold
            transition-all duration-200
            ${
              hasSelection
                ? 'bg-gradient-to-r from-neon-pink to-neon-purple text-white shadow-glow-pink hover:shadow-glow-purple'
                : 'bg-bg-card text-text-muted'
            }
          `}
        >
          {hasSelection ? 'Continue (+25 XP)' : 'Continue'}
        </button>

        <button
          onClick={onSkip}
          className="w-full py-3 text-text-muted hover:text-text-secondary transition-colors text-sm"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
