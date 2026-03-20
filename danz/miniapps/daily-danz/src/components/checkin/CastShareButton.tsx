'use client'

import { useState } from 'react'
import { useFarcasterSDK } from '@/hooks/useFarcasterSDK'

interface CastShareButtonProps {
  streak: number
  xpEarned: number
  onShared?: () => void
}

export function CastShareButton({ streak, xpEarned, onShared }: CastShareButtonProps) {
  const { composeCast, isInFrame } = useFarcasterSDK()
  const [isSharing, setIsSharing] = useState(false)
  const [hasShared, setHasShared] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)
    try {
      // Generate a fun share message based on streak
      const streakEmoji = streak >= 30 ? '🏆' : streak >= 14 ? '💎' : streak >= 7 ? '🔥' : '💃'
      const message = generateShareMessage(streak, xpEarned, streakEmoji)

      // Compose the cast with the miniapp link as embed
      await composeCast(message, ['https://daily-danz.flowbond.tech'])

      setHasShared(true)
      onShared?.()
    } catch (err) {
      console.error('Failed to share:', err)
    } finally {
      setIsSharing(false)
    }
  }

  if (hasShared) {
    return (
      <div className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/30">
        <span className="text-green-400 text-sm font-medium">Shared to Farcaster!</span>
        <span>✨</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className="group relative flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl
                 bg-gradient-to-r from-purple-600 to-purple-700
                 border border-purple-500/50
                 text-white font-semibold
                 transition-all duration-300
                 hover:from-purple-500 hover:to-purple-600 hover:shadow-lg hover:shadow-purple-500/20
                 active:scale-[0.98]
                 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {/* Farcaster icon */}
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M18.24 3.75H5.76a2.01 2.01 0 0 0-2.01 2.01v12.48a2.01 2.01 0 0 0 2.01 2.01h12.48a2.01 2.01 0 0 0 2.01-2.01V5.76a2.01 2.01 0 0 0-2.01-2.01Zm-3.66 11.94a.54.54 0 0 1-.54.54h-4.08a.54.54 0 0 1-.54-.54V8.31a.54.54 0 0 1 .54-.54h4.08a.54.54 0 0 1 .54.54v7.38Z" />
      </svg>

      {isSharing ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Casting...
        </span>
      ) : (
        <span>Cast to Farcaster</span>
      )}

      {/* Shine effect on hover */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </div>
      </div>
    </button>
  )
}

function generateShareMessage(streak: number, xpEarned: number, emoji: string): string {
  const messages = [
    // Short and punchy
    `${emoji} Day ${streak} of dancing! +${xpEarned} XP earned today\n\nDancing daily with @dailydanz`,
    `${emoji} ${streak} day dance streak!\n\n+${xpEarned} XP from today's session\n\nJoin me on @dailydanz`,
    `I danced today! ${emoji}\n\nStreak: ${streak} days\nXP: +${xpEarned}\n\nTracking my dance journey with @dailydanz`,
  ]

  // Add special messages for milestones
  if (streak === 7) {
    return `🎉 One week of dancing every day!\n\nStreak: 7 days ${emoji}\nXP: +${xpEarned}\n\n@dailydanz is keeping me moving`
  }
  if (streak === 30) {
    return `🏆 30 DAYS of dancing!\n\nNot a single day missed! ${emoji}\nTotal commitment to the dance\n\n@dailydanz`
  }
  if (streak === 100) {
    return `💯 100 DAY DANCE STREAK!\n\nI am the dance ${emoji}\n\n@dailydanz changed my life`
  }

  // Random message
  return messages[Math.floor(Math.random() * messages.length)]
}
