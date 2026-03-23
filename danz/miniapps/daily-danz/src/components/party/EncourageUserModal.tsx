'use client'

import { useState } from 'react'
import {
  EncouragementType,
  ENCOURAGEMENT_TEMPLATES,
  getRandomTemplate,
  formatEncouragementMessage,
} from '@/types/accountability'
import type { PartyMember } from '@/types/party'

interface EncourageUserModalProps {
  member: PartyMember
  partyName: string
  isOpen: boolean
  onClose: () => void
  onSend: (message: string, sendVia: 'in_app' | 'farcaster_dm') => void
}

export function EncourageUserModal({
  member,
  partyName,
  isOpen,
  onClose,
  onSend,
}: EncourageUserModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EncouragementType>('friendly_reminder')
  const [customMessage, setCustomMessage] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [sending, setSending] = useState(false)

  if (!isOpen) return null

  // Get suggested template based on member status
  const getSuggestedType = (): EncouragementType => {
    if (!member.isActiveToday && member.currentStreak > 3) return 'streak_at_risk'
    if (!member.isActiveToday) return 'friendly_reminder'
    if (member.currentStreak >= 7) return 'celebration'
    return 'party_needs_you'
  }

  const suggestedType = getSuggestedType()

  // Generate message from template
  const getTemplateMessage = (type: EncouragementType): string => {
    const template = getRandomTemplate(type)
    return formatEncouragementMessage(template.message, {
      name: member.displayName || member.username,
      streak: member.currentStreak,
      partyName: partyName,
      percent: '80', // Mock value
      remaining: '2', // Mock value
      rank: '3', // Mock value
      toTop: '150', // Mock value
      days: '3', // Mock value
      xp: '1000', // Mock value
    })
  }

  const handleSend = async (via: 'in_app' | 'farcaster_dm') => {
    setSending(true)
    const message = isCustom ? customMessage : getTemplateMessage(selectedTemplate)
    await onSend(message, via)
    setSending(false)
    onClose()
  }

  const quickTemplates: { type: EncouragementType; label: string; emoji: string }[] = [
    { type: 'friendly_reminder', label: 'Friendly Reminder', emoji: '👋' },
    { type: 'streak_at_risk', label: 'Streak Alert', emoji: '🚨' },
    { type: 'party_needs_you', label: 'Party Needs You', emoji: '🤝' },
    { type: 'celebration', label: 'Celebrate', emoji: '🎉' },
    { type: 'comeback', label: 'Welcome Back', emoji: '💫' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-bg-secondary rounded-t-3xl border-t border-white/10 animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.displayName}
                className="w-12 h-12 rounded-full border-2 border-neon-pink"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-xl">
                {member.displayName?.[0] || '?'}
              </div>
            )}
            <div>
              <h3 className="font-display font-bold text-lg">
                Encourage {member.displayName}
              </h3>
              <p className="text-sm text-gray-400">
                @{member.username} &bull; {member.currentStreak} day streak
              </p>
            </div>
          </div>

          {/* Member Status */}
          <div className="mt-3 flex gap-2">
            {member.isActiveToday ? (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                Active Today
              </span>
            ) : (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                Hasn't Checked In
              </span>
            )}
            {member.currentStreak > 0 && (
              <span className="px-2 py-1 bg-danz-pink-500/20 text-danz-pink-400 text-xs rounded-full">
                {member.currentStreak} Day Streak
              </span>
            )}
          </div>
        </div>

        {/* Suggested Message */}
        {suggestedType && !isCustom && (
          <div className="px-4 py-3 bg-danz-purple-500/10 border-b border-white/5">
            <p className="text-xs text-gray-400 mb-1">Suggested message:</p>
            <p className="text-sm">{getTemplateMessage(suggestedType)}</p>
          </div>
        )}

        {/* Quick Templates */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 mb-2">Quick templates:</p>
          <div className="flex flex-wrap gap-2">
            {quickTemplates.map(({ type, label, emoji }) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedTemplate(type)
                  setIsCustom(false)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedTemplate === type && !isCustom
                    ? 'bg-danz-pink-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Message Toggle */}
        <div className="px-4 py-3 border-t border-white/5">
          <button
            onClick={() => setIsCustom(!isCustom)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span className={`w-5 h-5 rounded border ${isCustom ? 'bg-danz-pink-500 border-danz-pink-500' : 'border-gray-500'} flex items-center justify-center`}>
              {isCustom && <span className="text-white text-xs">✓</span>}
            </span>
            Write custom message
          </button>

          {isCustom && (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={`Write a personal message to ${member.displayName}...`}
              className="mt-3 w-full px-3 py-2 bg-bg-primary rounded-lg border border-white/10 text-sm resize-none h-20 focus:border-neon-pink focus:outline-none"
              maxLength={280}
            />
          )}
        </div>

        {/* Preview */}
        {!isCustom && (
          <div className="px-4 py-3 border-t border-white/5">
            <p className="text-xs text-gray-400 mb-2">Message preview:</p>
            <div className="p-3 bg-bg-primary rounded-lg border border-white/5">
              <p className="text-sm">{getTemplateMessage(selectedTemplate)}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-4 py-4 border-t border-white/5 flex gap-3">
          <button
            onClick={() => handleSend('in_app')}
            disabled={sending || (isCustom && !customMessage.trim())}
            className="flex-1 py-3 bg-white/10 rounded-xl font-medium text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {sending ? '...' : '📬 Send In-App'}
          </button>
          <button
            onClick={() => handleSend('farcaster_dm')}
            disabled={sending || (isCustom && !customMessage.trim())}
            className="flex-1 py-3 bg-gradient-to-r from-neon-pink to-neon-purple rounded-xl font-medium text-sm shadow-glow-pink hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {sending ? '...' : '💬 Send via Farcaster'}
          </button>
        </div>

        {/* Footer tip */}
        <div className="px-4 pb-6 text-center">
          <p className="text-xs text-gray-500">
            Sending encouragement helps your party stay active and earn more XP!
          </p>
        </div>
      </div>
    </div>
  )
}
