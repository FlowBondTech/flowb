'use client'

import { useState, useEffect } from 'react'
import { PARTY_EMOJI_OPTIONS, PARTY_TIER_CONFIG, PARTY_POOL_CONFIGS, PartyPoolType } from '@/types/party'
import { useUSDCPayment, usePaymentConfirmation, PARTY_CREATION_COST } from '@/hooks/useUSDCPayment'

interface CreatePartyModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: { name: string; description: string; emoji: string; isPublic: boolean; poolType: PartyPoolType; txHash?: string }) => Promise<void>
}

type Step = 'details' | 'payment' | 'creating'

export function CreatePartyModal({ isOpen, onClose, onCreate }: CreatePartyModalProps) {
  const [step, setStep] = useState<Step>('details')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('🎉')
  const [isPublic, setIsPublic] = useState(true)
  const [poolType, setPoolType] = useState<PartyPoolType>('large')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    payForPartyCreation,
    status: paymentStatus,
    error: paymentError,
    txHash,
    isConnected,
    reset: resetPayment,
  } = useUSDCPayment()

  const { isConfirming, isConfirmed, isError: txError } = usePaymentConfirmation(txHash)

  // Handle payment confirmation and proceed to create party
  useEffect(() => {
    if (isConfirmed && step === 'payment' && txHash) {
      handleCreateParty(txHash)
    }
  }, [isConfirmed, step, txHash])

  // Handle payment errors
  useEffect(() => {
    if (paymentError) {
      setError(paymentError)
    }
    if (txError) {
      setError('Transaction failed. Please try again.')
    }
  }, [paymentError, txError])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('details')
      setName('')
      setDescription('')
      setSelectedEmoji('🎉')
      setIsPublic(true)
      setPoolType('large')
      setError(null)
      resetPayment()
    }
  }, [isOpen, resetPayment])

  if (!isOpen) return null

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter a party name')
      return
    }

    if (name.length < 3) {
      setError('Party name must be at least 3 characters')
      return
    }

    if (name.length > 24) {
      setError('Party name must be 24 characters or less')
      return
    }

    if (!isConnected) {
      setError('Please connect your wallet first')
      return
    }

    setStep('payment')
  }

  const handlePayment = async () => {
    setError(null)
    const hash = await payForPartyCreation()
    // Payment confirmation is handled by useEffect above
  }

  const handleCreateParty = async (paymentTxHash: string) => {
    setStep('creating')
    setIsCreating(true)
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        emoji: selectedEmoji,
        isPublic,
        poolType,
        txHash: paymentTxHash,
      })
      onClose()
    } catch (err) {
      setError('Failed to create party. Please try again.')
      setStep('payment')
    } finally {
      setIsCreating(false)
    }
  }

  const starterTier = PARTY_TIER_CONFIG.starter

  // Payment step UI
  if (step === 'payment' || step === 'creating') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={paymentStatus === 'idle' ? () => setStep('details') : undefined} />
        <div className="relative w-full max-w-md glass-section rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up">
          <div className="relative px-6 pt-6 pb-4 border-b border-white/5">
            {paymentStatus === 'idle' && (
              <button
                onClick={() => setStep('details')}
                className="absolute top-4 left-4 w-8 h-8 rounded-full glass-card flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                ←
              </button>
            )}
            <h2 className="text-xl font-bold text-white text-center">
              {step === 'creating' ? 'Creating Party...' : 'Confirm Payment'}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Party preview */}
            <div className="p-4 rounded-xl glass-card-highlight flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl glass-card flex items-center justify-center text-3xl">
                {selectedEmoji}
              </div>
              <div>
                <div className="font-semibold text-white">{name}</div>
                <div className="text-sm text-gray-400">
                  {isPublic ? 'Public' : 'Private'} • {starterTier.label} Tier
                </div>
              </div>
            </div>

            {/* Payment info */}
            <div className="p-4 rounded-xl glass-card space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Party Creation Fee</span>
                <span className="text-white font-semibold">${PARTY_CREATION_COST} USDC</span>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Total</span>
                  <span className="text-danz-pink-400 font-bold text-lg">${PARTY_CREATION_COST} USDC</span>
                </div>
              </div>
            </div>

            {/* Status indicator */}
            {(paymentStatus === 'pending' || paymentStatus === 'confirming' || isConfirming || step === 'creating') && (
              <div className="p-4 rounded-xl glass-card-highlight flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-danz-pink-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-300">
                  {paymentStatus === 'pending' && 'Waiting for wallet approval...'}
                  {(paymentStatus === 'confirming' || isConfirming) && 'Confirming transaction...'}
                  {step === 'creating' && 'Creating your party...'}
                </span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl glass-card border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Payment button */}
            {step === 'payment' && paymentStatus !== 'pending' && !isConfirming && (
              <button
                onClick={handlePayment}
                disabled={paymentStatus === 'confirming'}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-danz-pink-500 to-danz-purple-500
                           text-white font-semibold shadow-glow-pink
                           hover:shadow-neon-glow hover:scale-[1.02] transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-2">
                  <span>💳</span>
                  Pay ${PARTY_CREATION_COST} USDC
                </span>
              </button>
            )}

            <p className="text-center text-gray-500 text-xs">
              Payment goes to the DANZ treasury to support development
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-section rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full glass-card flex items-center justify-center text-gray-400 hover:text-white hover:scale-110 transition-all duration-200"
          >
            ✕
          </button>
          <h2 className="text-xl font-bold text-white">Create a DANZ Party</h2>
          <p className="text-gray-400 text-sm mt-1">
            Start your crew and earn bonus XP together
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleProceedToPayment} className="p-6 space-y-5">
          {/* Emoji selector */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Party Icon</label>
            <div className="flex flex-wrap gap-2">
              {PARTY_EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-xl
                    transition-all duration-200
                    ${selectedEmoji === emoji
                      ? 'glass-card-highlight scale-110 shadow-[0_0_15px_rgba(255,110,199,0.3)]'
                      : 'glass-card hover:scale-105'
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Party Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Night Owls, Morning Movers"
              maxLength={24}
              className="w-full px-4 py-3 rounded-xl glass-card
                         text-white placeholder-gray-500
                         focus:outline-none focus:border-danz-pink-500/50 focus:shadow-[0_0_15px_rgba(255,110,199,0.2)]
                         transition-all duration-200"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">3-24 characters</span>
              <span className={`text-xs ${name.length > 20 ? 'text-orange-400' : 'text-gray-500'}`}>
                {name.length}/24
              </span>
            </div>
          </div>

          {/* Description input */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your party about?"
              maxLength={100}
              rows={2}
              className="w-full px-4 py-3 rounded-xl glass-card
                         text-white placeholder-gray-500 resize-none
                         focus:outline-none focus:border-danz-pink-500/50 focus:shadow-[0_0_15px_rgba(255,110,199,0.2)]
                         transition-all duration-200"
            />
          </div>

          {/* Privacy toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl glass-card">
            <div>
              <div className="text-white font-medium">Public Party</div>
              <div className="text-gray-400 text-sm">
                {isPublic ? 'Anyone can find and join' : 'Invite only with code'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`
                relative w-12 h-7 rounded-full transition-colors duration-200
                ${isPublic ? 'bg-danz-pink-500' : 'bg-gray-600'}
              `}
            >
              <div className={`
                absolute top-1 w-5 h-5 rounded-full bg-white shadow-md
                transition-transform duration-200
                ${isPublic ? 'left-6' : 'left-1'}
              `} />
            </button>
          </div>

          {/* Tier info */}
          <div className="p-4 rounded-xl glass-card-highlight">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{starterTier.emoji}</span>
              <span className={`font-medium ${starterTier.color}`}>{starterTier.label} Tier</span>
            </div>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Up to {starterTier.maxMembers} members</li>
              <li>• +{(starterTier.multiplierBonus * 100).toFixed(0)}% base XP bonus</li>
              <li>• Level up by earning more XP together</li>
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-xl glass-card border-red-500/30 text-red-400 text-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              {error}
            </div>
          )}

          {/* Cost notice */}
          <div className="p-3 rounded-xl glass-card-highlight text-center">
            <span className="text-gray-400 text-sm">Party creation fee: </span>
            <span className="text-danz-pink-400 font-semibold">${PARTY_CREATION_COST} USDC</span>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!name.trim() || !isConnected}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-danz-pink-500 to-danz-purple-500
                       text-white font-semibold shadow-glow-pink
                       hover:shadow-neon-glow hover:scale-[1.02] transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <span className="flex items-center justify-center gap-2">
              <span>🎉</span>
              Continue to Payment
            </span>
          </button>

          {!isConnected && (
            <p className="text-center text-orange-400 text-xs">
              Connect your wallet to create a party
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
