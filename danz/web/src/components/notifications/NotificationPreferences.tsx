'use client'

import { useNotifications } from '@/src/contexts/NotificationContext'
import {
  useGetMyNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '@/src/generated/graphql'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import {
  FiAward,
  FiBell,
  FiCalendar,
  FiHeart,
  FiMail,
  FiMoon,
  FiRadio,
  FiSave,
  FiSmartphone,
  FiUsers,
} from 'react-icons/fi'

interface PreferenceToggleProps {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

function PreferenceToggle({
  icon,
  label,
  description,
  enabled,
  onChange,
  disabled = false,
}: PreferenceToggleProps) {
  return (
    <label
      className={`flex items-start gap-4 p-4 rounded-lg transition-colors cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center text-neon-purple">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-medium">{label}</p>
        <p className="text-text-secondary text-sm mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0 pt-1">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={disabled}
          onClick={() => !disabled && onChange(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-neon-purple' : 'bg-bg-hover'
          } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </label>
  )
}

export default function NotificationPreferences() {
  const { showToast } = useNotifications()
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch current preferences
  const { data, loading, error, refetch } = useGetMyNotificationPreferencesQuery({
    fetchPolicy: 'cache-and-network',
  })

  const [updatePreferences] = useUpdateNotificationPreferencesMutation()

  // Local state for form
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    post_interactions: true,
    event_updates: true,
    achievements: true,
    dance_bonds: true,
    admin_broadcasts: true,
    event_manager_broadcasts: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  })

  // Sync local state with fetched data
  useEffect(() => {
    if (data?.myNotificationPreferences) {
      const prefs = data.myNotificationPreferences
      setPreferences({
        email_notifications: prefs.email_notifications,
        push_notifications: prefs.push_notifications,
        post_interactions: prefs.post_interactions,
        event_updates: prefs.event_updates,
        achievements: prefs.achievements,
        dance_bonds: prefs.dance_bonds,
        admin_broadcasts: prefs.admin_broadcasts,
        event_manager_broadcasts: prefs.event_manager_broadcasts,
        quiet_hours_enabled: prefs.quiet_hours_enabled,
        quiet_hours_start: prefs.quiet_hours_start || '22:00',
        quiet_hours_end: prefs.quiet_hours_end || '08:00',
      })
    }
  }, [data])

  const updatePreference = <K extends keyof typeof preferences>(
    key: K,
    value: (typeof preferences)[K],
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updatePreferences({
        variables: {
          input: {
            email_notifications: preferences.email_notifications,
            push_notifications: preferences.push_notifications,
            post_interactions: preferences.post_interactions,
            event_updates: preferences.event_updates,
            achievements: preferences.achievements,
            dance_bonds: preferences.dance_bonds,
            admin_broadcasts: preferences.admin_broadcasts,
            event_manager_broadcasts: preferences.event_manager_broadcasts,
            quiet_hours_enabled: preferences.quiet_hours_enabled,
            quiet_hours_start: preferences.quiet_hours_start,
            quiet_hours_end: preferences.quiet_hours_end,
          },
        },
      })
      await refetch()
      setHasChanges(false)
      showToast({
        type: 'success',
        title: 'Preferences saved',
        message: 'Your notification preferences have been updated',
      })
    } catch (err) {
      console.error('Failed to save preferences:', err)
      showToast({
        type: 'error',
        title: 'Failed to save',
        message: 'Could not update your preferences. Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-bg-card animate-pulse" />
          <div className="h-6 bg-bg-card rounded w-40 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-bg-card/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-red-500/20 p-6">
        <p className="text-red-400">Failed to load notification preferences. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
          <FiBell className="text-neon-purple" />
          Notification Preferences
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          Control how and when you receive notifications
        </p>
      </div>

      {/* Delivery Methods */}
      <div className="p-6 border-b border-white/10">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Delivery Methods
        </h3>
        <div className="space-y-2">
          <PreferenceToggle
            icon={<FiMail size={20} />}
            label="Email Notifications"
            description="Receive notifications via email"
            enabled={preferences.email_notifications}
            onChange={v => updatePreference('email_notifications', v)}
          />
          <PreferenceToggle
            icon={<FiSmartphone size={20} />}
            label="Push Notifications"
            description="Receive push notifications on your devices"
            enabled={preferences.push_notifications}
            onChange={v => updatePreference('push_notifications', v)}
          />
        </div>
      </div>

      {/* Notification Types */}
      <div className="p-6 border-b border-white/10">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Notification Types
        </h3>
        <div className="space-y-2">
          <PreferenceToggle
            icon={<FiHeart size={20} />}
            label="Post Interactions"
            description="Likes, comments, and mentions on your posts"
            enabled={preferences.post_interactions}
            onChange={v => updatePreference('post_interactions', v)}
          />
          <PreferenceToggle
            icon={<FiCalendar size={20} />}
            label="Event Updates"
            description="Reminders and updates for events you're attending"
            enabled={preferences.event_updates}
            onChange={v => updatePreference('event_updates', v)}
          />
          <PreferenceToggle
            icon={<FiAward size={20} />}
            label="Achievements"
            description="Notifications when you unlock new achievements"
            enabled={preferences.achievements}
            onChange={v => updatePreference('achievements', v)}
          />
          <PreferenceToggle
            icon={<FiUsers size={20} />}
            label="Dance Bonds"
            description="Updates about your dance connections"
            enabled={preferences.dance_bonds}
            onChange={v => updatePreference('dance_bonds', v)}
          />
        </div>
      </div>

      {/* Broadcasts */}
      <div className="p-6 border-b border-white/10">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Broadcasts
        </h3>
        <div className="space-y-2">
          <PreferenceToggle
            icon={<FiRadio size={20} />}
            label="Admin Announcements"
            description="Important platform-wide announcements"
            enabled={preferences.admin_broadcasts}
            onChange={v => updatePreference('admin_broadcasts', v)}
          />
          <PreferenceToggle
            icon={<FiRadio size={20} />}
            label="Event Organizer Updates"
            description="Messages from event organizers"
            enabled={preferences.event_manager_broadcasts}
            onChange={v => updatePreference('event_manager_broadcasts', v)}
          />
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="p-6 border-b border-white/10">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Quiet Hours
        </h3>
        <PreferenceToggle
          icon={<FiMoon size={20} />}
          label="Enable Quiet Hours"
          description="Pause notifications during specific hours"
          enabled={preferences.quiet_hours_enabled}
          onChange={v => updatePreference('quiet_hours_enabled', v)}
        />

        {preferences.quiet_hours_enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 ml-14 flex items-center gap-4"
          >
            <div>
              <label className="block text-text-secondary text-sm mb-1">Start</label>
              <input
                type="time"
                value={preferences.quiet_hours_start}
                onChange={e => updatePreference('quiet_hours_start', e.target.value)}
                className="bg-bg-card border border-white/10 rounded-lg px-3 py-2 text-text-primary focus:border-neon-purple/50 focus:outline-none"
              />
            </div>
            <span className="text-text-muted mt-6">to</span>
            <div>
              <label className="block text-text-secondary text-sm mb-1">End</label>
              <input
                type="time"
                value={preferences.quiet_hours_end}
                onChange={e => updatePreference('quiet_hours_end', e.target.value)}
                className="bg-bg-card border border-white/10 rounded-lg px-3 py-2 text-text-primary focus:border-neon-purple/50 focus:outline-none"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Save Button */}
      <div className="p-6 bg-bg-card/30">
        <motion.button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          whileHover={hasChanges && !isSaving ? { scale: 1.02 } : {}}
          whileTap={hasChanges && !isSaving ? { scale: 0.98 } : {}}
          className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-all ${
            hasChanges && !isSaving
              ? 'bg-gradient-to-r from-neon-pink to-neon-purple text-white shadow-glow-purple hover:shadow-glow-pink'
              : 'bg-bg-card text-text-muted cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <FiSave size={18} />
              <span>Save Preferences</span>
            </>
          )}
        </motion.button>
        {hasChanges && <p className="text-text-muted text-sm mt-2">You have unsaved changes</p>}
      </div>
    </div>
  )
}
