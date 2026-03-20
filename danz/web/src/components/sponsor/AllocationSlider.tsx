'use client'

import { useEffect, useState } from 'react'
import { FiHeart, FiPercent, FiUsers } from 'react-icons/fi'

interface AllocationConfig {
  paidWorkersPercent: number
  volunteerRewardsPercent: number
  platformFeePercent: number
}

interface AllocationSliderProps {
  value: AllocationConfig
  onChange: (config: AllocationConfig) => void
  totalAmount?: number
  disabled?: boolean
}

const PLATFORM_FEE = 5 // Fixed 5% platform fee

export default function AllocationSlider({
  value,
  onChange,
  totalAmount,
  disabled = false,
}: AllocationSliderProps) {
  const [paidWorkers, setPaidWorkers] = useState(value.paidWorkersPercent)
  const [volunteerRewards, setVolunteerRewards] = useState(value.volunteerRewardsPercent)

  useEffect(() => {
    setPaidWorkers(value.paidWorkersPercent)
    setVolunteerRewards(value.volunteerRewardsPercent)
  }, [value])

  const handlePaidWorkersChange = (newValue: number) => {
    // Ensure we don't go below 0 or above (100 - platformFee)
    const maxValue = 100 - PLATFORM_FEE
    const clampedValue = Math.max(0, Math.min(newValue, maxValue))
    const newVolunteer = maxValue - clampedValue

    setPaidWorkers(clampedValue)
    setVolunteerRewards(newVolunteer)

    onChange({
      paidWorkersPercent: clampedValue,
      volunteerRewardsPercent: newVolunteer,
      platformFeePercent: PLATFORM_FEE,
    })
  }

  const calculateAmount = (percent: number) => {
    if (!totalAmount) return null
    return (totalAmount * percent) / 100
  }

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Visual bar */}
      <div className="relative h-8 rounded-lg overflow-hidden flex">
        {/* Paid Workers */}
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center transition-all"
          style={{ width: `${paidWorkers}%` }}
        >
          {paidWorkers > 15 && (
            <span className="text-white text-xs font-medium">{paidWorkers}%</span>
          )}
        </div>

        {/* Volunteer Rewards */}
        <div
          className="bg-gradient-to-r from-pink-500 to-pink-400 flex items-center justify-center transition-all"
          style={{ width: `${volunteerRewards}%` }}
        >
          {volunteerRewards > 10 && (
            <span className="text-white text-xs font-medium">{volunteerRewards}%</span>
          )}
        </div>

        {/* Platform Fee */}
        <div
          className="bg-gradient-to-r from-gray-600 to-gray-500 flex items-center justify-center"
          style={{ width: `${PLATFORM_FEE}%` }}
        >
          <span className="text-white text-xs font-medium">{PLATFORM_FEE}%</span>
        </div>
      </div>

      {/* Slider */}
      <div className="px-1">
        <input
          type="range"
          min={0}
          max={100 - PLATFORM_FEE}
          value={paidWorkers}
          onChange={e => handlePaidWorkersChange(Number.parseInt(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-grab
            [&::-webkit-slider-thumb]:active:cursor-grabbing
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-grab"
          disabled={disabled}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-3">
        {/* Paid Workers */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <FiUsers className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-400">Paid Workers</span>
          </div>
          <p className="text-lg font-bold text-text-primary">{paidWorkers}%</p>
          {totalAmount && (
            <p className="text-xs text-text-muted">
              ${calculateAmount(paidWorkers)?.toLocaleString()}
            </p>
          )}
        </div>

        {/* Volunteer Rewards */}
        <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <FiHeart className="w-4 h-4 text-pink-400" />
            <span className="text-xs text-pink-400">Volunteers</span>
          </div>
          <p className="text-lg font-bold text-text-primary">{volunteerRewards}%</p>
          {totalAmount && (
            <p className="text-xs text-text-muted">
              ${calculateAmount(volunteerRewards)?.toLocaleString()}
            </p>
          )}
        </div>

        {/* Platform Fee */}
        <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <FiPercent className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Platform</span>
          </div>
          <p className="text-lg font-bold text-text-primary">{PLATFORM_FEE}%</p>
          {totalAmount && (
            <p className="text-xs text-text-muted">
              ${calculateAmount(PLATFORM_FEE)?.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-text-muted text-center">
        Drag the slider to adjust allocation between paid workers and volunteer rewards
      </p>
    </div>
  )
}

// Export default allocation config
export const DEFAULT_ALLOCATION: AllocationConfig = {
  paidWorkersPercent: 80,
  volunteerRewardsPercent: 15,
  platformFeePercent: 5,
}
