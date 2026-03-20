'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { getDarkThemes, getLightThemes } from '@/src/constants/themes'
import { useAuth } from '@/src/contexts/AuthContext'
import { useExperimental } from '@/src/contexts/ExperimentalContext'
import { useTheme } from '@/src/contexts/ThemeContext'
import {
  useGetMyNotificationPreferencesQuery,
  useGetMyProfileQuery,
  useUpdateNotificationPreferencesMutation,
} from '@/src/generated/graphql'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FiBell,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiDroplet,
  FiEdit3,
  FiEye,
  FiLock,
  FiMonitor,
  FiMoon,
  FiSettings,
  FiShield,
  FiStar,
  FiSun,
  FiTrash2,
  FiUser,
  FiZap,
} from 'react-icons/fi'

// Collapsible Section Component
function SettingsSection({
  id,
  icon,
  title,
  children,
  defaultOpen = false,
  badge,
  accentColor = 'neon-purple',
}: {
  id: string
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
  accentColor?: string
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div id={id} className="bg-bg-secondary rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-${accentColor}`}>{icon}</span>
          <span className="font-semibold text-text-primary">{title}</span>
          {badge && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full bg-${accentColor}/20 text-${accentColor}`}
            >
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <FiChevronDown size={20} className="text-text-secondary" />
        ) : (
          <FiChevronRight size={20} className="text-text-secondary" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 border-t border-white/5">{children}</div>}
    </div>
  )
}

// Toggle Row Component
function ToggleRow({
  label,
  description,
  enabled,
  onChange,
  disabled = false,
}: {
  label: string
  description?: string
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-text-primary text-sm font-medium">{label}</p>
        {description && <p className="text-text-secondary text-xs mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-neon-purple' : 'bg-white/20'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { isAuthenticated, isLoading, user, email, logout } = useAuth()
  const router = useRouter()
  const { theme, themeId, mode, useSystemTheme, setTheme, toggleMode, setUseSystemTheme } =
    useTheme()
  const { experimentalEnabled, setExperimentalEnabled } = useExperimental()
  const { data: profileData } = useGetMyProfileQuery({ skip: !isAuthenticated })
  const profile = profileData?.me

  // Notification preferences
  const { data: notifData } = useGetMyNotificationPreferencesQuery({
    fetchPolicy: 'cache-and-network',
  })
  const [updateNotifPrefs] = useUpdateNotificationPreferencesMutation()
  const [notifPrefs, setNotifPrefs] = useState({
    email_notifications: true,
    push_notifications: true,
    post_interactions: true,
    event_updates: true,
    achievements: true,
    dance_bonds: true,
    quiet_hours_enabled: false,
  })

  useEffect(() => {
    if (notifData?.myNotificationPreferences) {
      const p = notifData.myNotificationPreferences
      setNotifPrefs({
        email_notifications: p.email_notifications,
        push_notifications: p.push_notifications,
        post_interactions: p.post_interactions,
        event_updates: p.event_updates,
        achievements: p.achievements,
        dance_bonds: p.dance_bonds,
        quiet_hours_enabled: p.quiet_hours_enabled,
      })
    }
  }, [notifData])

  const updateNotif = async (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value }
    setNotifPrefs(updated)
    await updateNotifPrefs({ variables: { input: updated } })
  }

  // Privacy settings (local state for now)
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showLocation: true,
    allowMessages: true,
  })

  useEffect(() => {
    if (profile) {
      setPrivacy({
        publicProfile: profile.is_public ?? true,
        showLocation: profile.show_location ?? true,
        allowMessages: profile.allow_messages ?? true,
      })
    }
  }, [profile])


  const presetThemes = mode === 'dark' ? getDarkThemes() : getLightThemes()
  const isPremium = profile?.is_premium === 'active'

  // Quick nav sections
  const sections = [
    { id: 'profile', label: 'Profile', icon: <FiUser size={14} /> },
    { id: 'appearance', label: 'Theme', icon: <FiDroplet size={14} /> },
    { id: 'notifications', label: 'Notifs', icon: <FiBell size={14} /> },
    { id: 'privacy', label: 'Privacy', icon: <FiShield size={14} /> },
    { id: 'account', label: 'Account', icon: <FiLock size={14} /> },
    { id: 'subscription', label: 'Sub', icon: <FiStar size={14} /> },
    { id: 'experimental', label: 'Labs', icon: <FiZap size={14} /> },
  ]

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <FiSettings className="text-neon-purple" />
              Settings
            </h1>
            <p className="text-text-secondary text-sm mt-1">Configure your account</p>
          </div>
        </div>

        {/* Quick Nav Pills */}
        <div className="flex flex-wrap gap-2 mb-6 p-3 bg-bg-secondary rounded-xl border border-white/10">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-neon-purple/20 hover:text-neon-purple text-text-secondary transition-colors"
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Profile Section */}
          <SettingsSection
            id="profile"
            icon={<FiUser size={20} />}
            title="Profile"
            defaultOpen={true}
          >
            <div className="pt-4 space-y-4">
              {/* Quick Profile Summary */}
              <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary truncate">
                    {profile?.display_name || profile?.username}
                  </p>
                  <p className="text-text-secondary text-sm">@{profile?.username}</p>
                </div>
                <button
                  onClick={() => router.push('/dashboard/profile?edit=true')}
                  className="flex items-center gap-2 px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-lg text-neon-purple text-sm font-medium transition-colors"
                >
                  <FiEdit3 size={14} />
                  Edit
                </button>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => router.push('/dashboard/profile')}
                  className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg text-text-secondary hover:text-text-primary text-sm transition-colors"
                >
                  <FiEye size={16} />
                  View Profile
                </button>
                <button
                  onClick={() => router.push('/dashboard/profile?edit=true')}
                  className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg text-text-secondary hover:text-text-primary text-sm transition-colors"
                >
                  <FiEdit3 size={16} />
                  Edit Profile
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* Appearance Section */}
          <SettingsSection
            id="appearance"
            icon={<FiDroplet size={20} />}
            title="Theme & Appearance"
            defaultOpen={true}
          >
            <div className="pt-4 space-y-4">
              {/* Mode Toggle */}
              <div>
                <p className="text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
                  Mode
                </p>
                <div className="flex gap-2">
                  {[
                    { mode: 'dark' as const, icon: <FiMoon size={16} />, label: 'Dark' },
                    { mode: 'light' as const, icon: <FiSun size={16} />, label: 'Light' },
                    { mode: 'system' as const, icon: <FiMonitor size={16} />, label: 'Auto' },
                  ].map(m => (
                    <button
                      key={m.mode}
                      onClick={() => {
                        if (m.mode === 'system') {
                          setUseSystemTheme(true)
                        } else {
                          setUseSystemTheme(false)
                          if (mode !== m.mode) toggleMode()
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all text-sm ${
                        (m.mode === 'system' && useSystemTheme) ||
                        (m.mode !== 'system' && !useSystemTheme && mode === m.mode)
                          ? 'border-neon-purple bg-neon-purple/10 text-neon-purple'
                          : 'border-white/10 text-text-secondary hover:border-white/20'
                      }`}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Grid - Compact */}
              <div>
                <p className="text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
                  Theme
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {presetThemes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative p-2 rounded-lg border-2 transition-all ${
                        themeId === t.id
                          ? 'border-neon-purple bg-neon-purple/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                      title={t.name}
                    >
                      <div className="flex gap-1 mb-1.5">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: t.colors.neonPurple }}
                        />
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: t.colors.neonPink }}
                        />
                      </div>
                      <p className="text-[10px] text-text-secondary truncate">{t.name}</p>
                      {themeId === t.id && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-neon-purple rounded-full flex items-center justify-center">
                          <FiCheck size={10} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Notifications Section */}
          <SettingsSection id="notifications" icon={<FiBell size={20} />} title="Notifications">
            <div className="pt-4 divide-y divide-white/5">
              <ToggleRow
                label="Email Notifications"
                description="Receive updates via email"
                enabled={notifPrefs.email_notifications}
                onChange={v => updateNotif('email_notifications', v)}
              />
              <ToggleRow
                label="Push Notifications"
                description="Browser & mobile push"
                enabled={notifPrefs.push_notifications}
                onChange={v => updateNotif('push_notifications', v)}
              />
              <ToggleRow
                label="Post Interactions"
                description="Likes, comments, mentions"
                enabled={notifPrefs.post_interactions}
                onChange={v => updateNotif('post_interactions', v)}
              />
              <ToggleRow
                label="Event Updates"
                description="Reminders & announcements"
                enabled={notifPrefs.event_updates}
                onChange={v => updateNotif('event_updates', v)}
              />
              <ToggleRow
                label="Achievements"
                description="New badges & rewards"
                enabled={notifPrefs.achievements}
                onChange={v => updateNotif('achievements', v)}
              />
              <ToggleRow
                label="Dance Bonds"
                description="Connection updates"
                enabled={notifPrefs.dance_bonds}
                onChange={v => updateNotif('dance_bonds', v)}
              />
              <ToggleRow
                label="Quiet Hours"
                description="Pause notifications at night"
                enabled={notifPrefs.quiet_hours_enabled}
                onChange={v => updateNotif('quiet_hours_enabled', v)}
              />
            </div>
          </SettingsSection>

          {/* Privacy Section */}
          <SettingsSection id="privacy" icon={<FiShield size={20} />} title="Privacy & Security">
            <div className="pt-4 divide-y divide-white/5">
              <ToggleRow
                label="Public Profile"
                description="Allow others to view your profile"
                enabled={privacy.publicProfile}
                onChange={v => setPrivacy(p => ({ ...p, publicProfile: v }))}
              />
              <ToggleRow
                label="Show Location"
                description="Display city on your profile"
                enabled={privacy.showLocation}
                onChange={v => setPrivacy(p => ({ ...p, showLocation: v }))}
              />
              <ToggleRow
                label="Allow Messages"
                description="Let users send you DMs"
                enabled={privacy.allowMessages}
                onChange={v => setPrivacy(p => ({ ...p, allowMessages: v }))}
              />
            </div>
          </SettingsSection>

          {/* Account Section */}
          <SettingsSection id="account" icon={<FiLock size={20} />} title="Account">
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-text-secondary text-xs">Email</p>
                  <p className="text-text-primary text-sm">{email || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-text-secondary text-xs">Account ID</p>
                  <p className="text-text-primary text-sm font-mono">{user?.privy_id?.slice(0, 16) || ''}...</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="w-full mt-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </SettingsSection>

          {/* Subscription Section */}
          <SettingsSection
            id="subscription"
            icon={<FiStar size={20} />}
            title="Subscription"
            badge={isPremium ? 'Premium' : undefined}
            accentColor={isPremium ? 'amber-400' : 'neon-purple'}
          >
            <div className="pt-4">
              {isPremium ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                      <FiStar className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-text-primary font-semibold text-sm">Premium Active</p>
                      <p className="text-text-secondary text-xs">All features unlocked</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/dashboard/subscription')}
                    className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-text-secondary text-sm transition-colors"
                  >
                    Manage Subscription
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-text-secondary text-sm">Upgrade to unlock all features</p>
                  <button
                    onClick={() => router.push('/dashboard/subscription')}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 rounded-lg text-white text-sm font-medium transition-opacity"
                  >
                    Upgrade to Premium
                  </button>
                </div>
              )}
            </div>
          </SettingsSection>

          {/* Experimental Section */}
          <SettingsSection
            id="experimental"
            icon={<FiZap size={20} />}
            title="Experimental"
            badge={experimentalEnabled ? 'Active' : undefined}
            accentColor="yellow-500"
          >
            <div className="pt-4">
              <ToggleRow
                label="Enable Labs Features"
                description="Access beta features (may be unstable)"
                enabled={experimentalEnabled}
                onChange={setExperimentalEnabled}
              />
              {experimentalEnabled && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-xs font-medium">Labs Mode Active</p>
                  <p className="text-text-secondary text-xs mt-1">
                    Check the sidebar for experimental features
                  </p>
                </div>
              )}
            </div>
          </SettingsSection>

          {/* Danger Zone */}
          <div className="bg-red-900/20 rounded-xl border border-red-500/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-red-400 font-semibold text-sm flex items-center gap-2">
                  <FiTrash2 size={16} />
                  Delete Account
                </h3>
                <p className="text-text-secondary text-xs mt-1">
                  Permanently delete your account and data
                </p>
              </div>
              <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
