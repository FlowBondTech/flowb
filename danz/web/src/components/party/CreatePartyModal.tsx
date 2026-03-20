'use client'

import { POOL_TYPE_CONFIG, type PoolType } from '@/src/types/party'
import { X } from 'lucide-react'
import { useState } from 'react'

interface CreatePartyModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateParty: (data: CreatePartyData) => Promise<void>
  userBalance?: number
}

export interface CreatePartyData {
  name: string
  description: string
  poolType: PoolType
  isPublic: boolean
}

export function CreatePartyModal({
  isOpen,
  onClose,
  onCreateParty,
  userBalance = 0,
}: CreatePartyModalProps) {
  const [step, setStep] = useState<'type' | 'details' | 'payment'>('type')
  const [selectedPoolType, setSelectedPoolType] = useState<PoolType | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSelectPoolType = (type: PoolType) => {
    setSelectedPoolType(type)
    setStep('details')
  }

  const handleContinueToPayment = () => {
    if (!name.trim()) {
      setError('Party name is required')
      return
    }
    setError(null)
    setStep('payment')
  }

  const handleCreateParty = async () => {
    if (!selectedPoolType || !name.trim()) return

    const cost = POOL_TYPE_CONFIG[selectedPoolType].creationCostUsdc
    if (userBalance < cost) {
      setError(`Insufficient USDC balance. You need $${cost} USDC.`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onCreateParty({
        name: name.trim(),
        description: description.trim(),
        poolType: selectedPoolType,
        isPublic,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create party')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'details') setStep('type')
    else if (step === 'payment') setStep('details')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-bg-primary border border-white/10 rounded-t-3xl sm:rounded-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-bg-primary/95 backdrop-blur">
          <div className="flex items-center gap-3">
            {step !== 'type' && (
              <button
                onClick={handleBack}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <h2 className="text-lg font-bold text-white">
              {step === 'type' && 'Choose Party Type'}
              {step === 'details' && 'Party Details'}
              {step === 'payment' && 'Confirm & Pay'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="p-4">
          {/* Step 1: Pool Type Selection */}
          {step === 'type' && (
            <div className="space-y-3">
              <p className="text-white/60 text-sm mb-4">
                Select the size and type of party you want to create.
              </p>
              {(
                Object.entries(POOL_TYPE_CONFIG) as [
                  PoolType,
                  (typeof POOL_TYPE_CONFIG)[PoolType],
                ][]
              ).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleSelectPoolType(type)}
                  className="w-full p-4 rounded-xl border border-white/10 bg-card hover:border-neon-purple/50 transition-all text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white">{config.name}</h3>
                    <span className="text-sm font-bold text-green-400">
                      ${config.creationCostUsdc} USDC
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mb-2">{config.description}</p>
                  <p className="text-xs text-white/40">
                    {config.minMembers} - {config.maxMembers} members
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Party Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Party Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter party name"
                  maxLength={32}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-neon-purple/50 focus:outline-none transition-colors"
                />
                <p className="text-xs text-white/40 mt-1">{name.length}/32 characters</p>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Tell others about your party"
                  maxLength={160}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-neon-purple/50 focus:outline-none transition-colors resize-none"
                />
                <p className="text-xs text-white/40 mt-1">{description.length}/160 characters</p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-white font-medium">Public Party</p>
                  <p className="text-xs text-white/50">Anyone can find and request to join</p>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    isPublic ? 'bg-neon-purple' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handleContinueToPayment}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-white font-bold hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 3: Payment Confirmation */}
          {step === 'payment' && selectedPoolType && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-bold text-white mb-3">Party Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Name</span>
                    <span className="text-white">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Type</span>
                    <span className="text-white">{POOL_TYPE_CONFIG[selectedPoolType].name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Max Members</span>
                    <span className="text-white">
                      {POOL_TYPE_CONFIG[selectedPoolType].maxMembers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Visibility</span>
                    <span className="text-white">{isPublic ? 'Public' : 'Private'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Creation Cost</span>
                  <span className="text-xl font-bold text-white">
                    ${POOL_TYPE_CONFIG[selectedPoolType].creationCostUsdc} USDC
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-2">This goes to the party prize pool</p>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <span className="text-white/60 text-sm">Your Balance</span>
                <span
                  className={`font-bold ${
                    userBalance >= POOL_TYPE_CONFIG[selectedPoolType].creationCostUsdc
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  ${userBalance.toFixed(2)} USDC
                </span>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handleCreateParty}
                disabled={
                  isLoading || userBalance < POOL_TYPE_CONFIG[selectedPoolType].creationCostUsdc
                }
                className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  `Pay & Create Party`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
