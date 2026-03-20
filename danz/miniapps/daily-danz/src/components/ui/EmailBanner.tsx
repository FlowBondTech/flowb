'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export function EmailBanner() {
  const { subscribedEmail, subscribeEmail, isFarcasterFrame, openSignupPage } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInput, setShowInput] = useState(false)

  // Don't show if already subscribed
  if (subscribedEmail) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    const success = await subscribeEmail(email)
    if (success) {
      setShowInput(false)
      setEmail('')
    }
    setIsSubmitting(false)
  }

  if (showInput) {
    return (
      <div className="bg-gradient-to-r from-danz-primary/20 to-danz-secondary/20 border-b border-white/10 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-danz-primary"
            disabled={isSubmitting}
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="flex-shrink-0 bg-danz-primary hover:bg-danz-primary/90 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'Subscribe'}
          </button>
          <button
            type="button"
            onClick={() => setShowInput(false)}
            className="text-gray-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-danz-primary/20 to-danz-secondary/20 border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">
            {isFarcasterFrame
              ? 'Get email updates from DANZ!'
              : 'Stay updated on new features'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            Events, rewards & more
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInput(true)}
            className="flex-shrink-0 bg-danz-primary hover:bg-danz-primary/90 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Subscribe
          </button>
          <button
            onClick={openSignupPage}
            className="flex-shrink-0 border border-white/20 hover:bg-white/10 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Full Signup
          </button>
        </div>
      </div>
    </div>
  )
}
