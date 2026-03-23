'use client'

import { Bell, BellOff, X } from 'lucide-react'
import { useState } from 'react'

interface NotificationPromptProps {
  onEnable: () => Promise<void>
  onSkip: () => void
  onClose: () => void
  isLoading?: boolean
}

export function NotificationPrompt({
  onEnable,
  onSkip,
  onClose,
  isLoading = false,
}: NotificationPromptProps) {
  const [isEnabling, setIsEnabling] = useState(false)

  const handleEnable = async () => {
    setIsEnabling(true)
    try {
      await onEnable()
    } finally {
      setIsEnabling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-purple/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-pink/10 rounded-full blur-3xl" />
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full max-w-sm text-center">
        {/* Bell Icon with animation */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/30 to-neon-purple/30 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-bg-primary rounded-full flex items-center justify-center">
            <Bell
              className="w-10 h-10 text-neon-pink animate-bounce"
              style={{ animationDuration: '2s' }}
            />
          </div>
          {/* Notification dot */}
          <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-bg-primary animate-pulse" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-3">Stay in the Loop</h2>

        {/* Description */}
        <p className="text-white/60 mb-8 leading-relaxed">
          Get notified about streak reminders, friend activity, party updates, and exclusive
          rewards.
        </p>

        {/* Benefits list */}
        <div className="text-left space-y-3 mb-8 px-4">
          {[
            { icon: '🔥', text: 'Streak reminders before you lose it' },
            { icon: '🎉', text: 'Party invites from friends' },
            { icon: '🎁', text: 'Special rewards and drops' },
          ].map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 text-sm text-white/70">
              <span className="text-lg">{benefit.icon}</span>
              <span>{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleEnable}
            disabled={isEnabling || isLoading}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isEnabling ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enabling...
              </>
            ) : (
              <>
                <Bell className="w-5 h-5" />
                Enable Notifications
              </>
            )}
          </button>

          <button
            onClick={onSkip}
            disabled={isEnabling}
            className="w-full py-3 px-6 text-white/50 hover:text-white/70 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <BellOff className="w-4 h-4" />
            Maybe Later
          </button>
        </div>

        {/* Fine print */}
        <p className="mt-6 text-xs text-white/30">You can change this anytime in settings</p>
      </div>
    </div>
  )
}
