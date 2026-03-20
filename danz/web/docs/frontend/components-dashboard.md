# Dashboard Components

React components for the user dashboard, profile management, and app navigation.

## Overview

The dashboard provides the main interface for authenticated users to view their profile, manage events, track achievements, and interact with the community.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DASHBOARD LAYOUT                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     NAVIGATION BAR                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌─────────────────────────────────────────┐     │
│  │              │  │                                         │     │
│  │   SIDEBAR    │  │              MAIN CONTENT               │     │
│  │              │  │                                         │     │
│  │   - Home     │  │                                         │     │
│  │   - Profile  │  │                                         │     │
│  │   - Events   │  │                                         │     │
│  │   - Bonds    │  │                                         │     │
│  │   - Settings │  │                                         │     │
│  │              │  │                                         │     │
│  └──────────────┘  └─────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     MOBILE NAV (Bottom)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### DashboardLayout

Main layout wrapper with navigation and responsive sidebar.

```tsx
// src/components/dashboard/DashboardLayout.tsx
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/src/hooks/useAuth'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { MobileNav } from './MobileNav'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation */}
      <TopNav
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0">
          <Sidebar currentPath={pathname} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
              >
                <Sidebar
                  currentPath={pathname}
                  onClose={() => setSidebarOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 pb-20 lg:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav currentPath={pathname} />
    </div>
  )
}
```

---

### Sidebar

Navigation sidebar with links and user stats.

```tsx
// src/components/dashboard/Sidebar.tsx
'use client'

import Link from 'next/link'
import { useAuth } from '@/src/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/dashboard/profile', label: 'Profile', icon: UserIcon },
  { href: '/dashboard/events', label: 'Events', icon: CalendarIcon },
  { href: '/dashboard/bonds', label: 'Dance Bonds', icon: HeartIcon },
  { href: '/dashboard/achievements', label: 'Achievements', icon: TrophyIcon },
  { href: '/dashboard/feed', label: 'Feed', icon: NewspaperIcon },
  { href: '/dashboard/settings', label: 'Settings', icon: CogIcon },
]

interface SidebarProps {
  currentPath: string
  onClose?: () => void
}

export function Sidebar({ currentPath, onClose }: SidebarProps) {
  const { user } = useAuth()

  return (
    <nav className="flex h-full flex-col bg-gray-800 p-4">
      {/* User Card */}
      <div className="mb-6 rounded-lg bg-gray-700/50 p-4">
        <div className="flex items-center gap-3">
          <img
            src={user?.avatarUrl || '/default-avatar.png'}
            alt={user?.displayName || 'User'}
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">
              {user?.displayName}
            </p>
            <p className="truncate text-sm text-gray-400">
              @{user?.username}
            </p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Level {user?.level}</span>
            <span className="text-purple-400">{user?.xp} XP</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-600">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ width: `${(user?.xp ?? 0) % 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <ul className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Subscription Badge */}
      {user?.subscriptionTier !== 'free' && (
        <div className="mt-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-3 text-center">
          <p className="text-sm font-semibold text-white">
            {user?.subscriptionTier.toUpperCase()} Member
          </p>
        </div>
      )}
    </nav>
  )
}
```

---

### ProfileCard

User profile display with stats and actions.

```tsx
// src/components/dashboard/ProfileCard.tsx
'use client'

import { motion } from 'motion/react'
import Link from 'next/link'

interface ProfileCardProps {
  user: User
  showActions?: boolean
}

export function ProfileCard({ user, showActions = true }: ProfileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl bg-gray-800"
    >
      {/* Cover Image */}
      <div className="relative h-32 bg-gradient-to-r from-purple-600 to-pink-600">
        {user.coverImageUrl && (
          <img
            src={user.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Profile Content */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="-mt-12 mb-4">
          <img
            src={user.avatarUrl || '/default-avatar.png'}
            alt={user.displayName || 'User'}
            className="h-24 w-24 rounded-full border-4 border-gray-800 object-cover"
          />
        </div>

        {/* Name & Username */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">{user.displayName}</h2>
          <p className="text-gray-400">@{user.username}</p>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="mb-4 text-gray-300">{user.bio}</p>
        )}

        {/* Location & Dance Styles */}
        <div className="mb-4 flex flex-wrap gap-2">
          {user.city && (
            <span className="flex items-center gap-1 rounded-full bg-gray-700 px-3 py-1 text-sm text-gray-300">
              <MapPinIcon className="h-4 w-4" />
              {user.city}
            </span>
          )}
          {user.danceStyles?.slice(0, 3).map((style) => (
            <span
              key={style}
              className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-400"
            >
              {style}
            </span>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="mb-4 grid grid-cols-4 gap-4 text-center">
          <StatItem label="Events" value={user.totalEventsAttended} />
          <StatItem label="Bonds" value={user.danceBondsCount} />
          <StatItem label="Level" value={user.level} />
          <StatItem label="XP" value={user.xp} />
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-3">
            <Link
              href="/dashboard/profile/edit"
              className="btn btn-primary flex-1"
            >
              Edit Profile
            </Link>
            <button className="btn btn-outline">
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
```

---

### ProfileEditForm

Form for editing user profile information.

```tsx
// src/components/dashboard/ProfileEditForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUpdateProfileMutation } from '@/src/generated/graphql'
import { AvatarUpload } from '../auth/AvatarUpload'

const DANCE_STYLES = [
  'salsa', 'hip-hop', 'bachata', 'contemporary', 'jazz',
  'ballet', 'breakdance', 'swing', 'ballroom', 'kpop',
  'afrobeats', 'latin'
]

interface ProfileEditFormProps {
  user: User
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const router = useRouter()
  const [updateProfile, { loading, error }] = useUpdateProfileMutation()

  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    bio: user.bio || '',
    city: user.city || '',
    danceStyles: user.danceStyles || [],
    skillLevel: user.skillLevel || 'all',
    website: user.website || '',
    instagram: user.instagram || '',
    tiktok: user.tiktok || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateProfile({
        variables: { input: formData },
      })
      router.push('/dashboard/profile')
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  const toggleDanceStyle = (style: string) => {
    setFormData((prev) => ({
      ...prev,
      danceStyles: prev.danceStyles.includes(style)
        ? prev.danceStyles.filter((s) => s !== style)
        : [...prev.danceStyles, style],
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex justify-center">
        <AvatarUpload
          currentUrl={user.avatarUrl}
          onUpload={async (file) => {
            // Handle avatar upload
          }}
        />
      </div>

      {/* Basic Info */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label">Display Name</label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="label">City</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="input"
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="label">Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={4}
          className="input"
          maxLength={500}
        />
        <p className="mt-1 text-sm text-gray-500">
          {formData.bio.length}/500 characters
        </p>
      </div>

      {/* Dance Styles */}
      <div>
        <label className="label">Dance Styles</label>
        <div className="flex flex-wrap gap-2">
          {DANCE_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => toggleDanceStyle(style)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                formData.danceStyles.includes(style)
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Level */}
      <div>
        <label className="label">Skill Level</label>
        <select
          value={formData.skillLevel}
          onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
          className="input"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Social Links */}
      <div>
        <label className="label">Social Links</label>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              @
            </span>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              placeholder="instagram"
              className="input pl-8"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              @
            </span>
            <input
              type="text"
              value={formData.tiktok}
              onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
              placeholder="tiktok"
              className="input pl-8"
            />
          </div>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://yourwebsite.com"
            className="input"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-500/10 p-4 text-red-400">
          {error.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-outline flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary flex-1 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
```

---

### EventCard

Event display card with registration status.

```tsx
// src/components/dashboard/EventCard.tsx
'use client'

import { format } from 'date-fns'
import { motion } from 'motion/react'
import Link from 'next/link'

interface EventCardProps {
  event: Event
  variant?: 'default' | 'compact'
}

export function EventCard({ event, variant = 'default' }: EventCardProps) {
  const spotsLeft = event.maxCapacity - event.currentCapacity
  const isAlmostFull = spotsLeft <= 5 && spotsLeft > 0
  const isFull = spotsLeft === 0

  if (variant === 'compact') {
    return (
      <Link href={`/dashboard/events/${event.id}`}>
        <motion.div
          className="flex items-center gap-4 rounded-lg bg-gray-800 p-4 hover:bg-gray-700"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-purple-500/20">
            <span className="text-xs text-purple-400">
              {format(new Date(event.startDateTime), 'MMM')}
            </span>
            <span className="text-xl font-bold text-white">
              {format(new Date(event.startDateTime), 'd')}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-white">{event.title}</h3>
            <p className="text-sm text-gray-400">{event.locationName}</p>
          </div>
          {event.isRegistered && (
            <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
              Registered
            </span>
          )}
        </motion.div>
      </Link>
    )
  }

  return (
    <Link href={`/dashboard/events/${event.id}`}>
      <motion.div
        className="overflow-hidden rounded-xl bg-gray-800"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {/* Image */}
        <div className="relative aspect-video">
          <img
            src={event.imageUrl || '/event-placeholder.jpg'}
            alt={event.title}
            className="h-full w-full object-cover"
          />
          {event.isFeatured && (
            <span className="absolute left-3 top-3 rounded-full bg-yellow-500 px-2 py-1 text-xs font-semibold text-black">
              Featured
            </span>
          )}
          {event.category && (
            <span className="absolute right-3 top-3 rounded-full bg-gray-900/80 px-2 py-1 text-xs text-white">
              {event.category}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-2 font-semibold text-white line-clamp-1">
            {event.title}
          </h3>

          <div className="mb-3 space-y-1 text-sm text-gray-400">
            <p className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(new Date(event.startDateTime), 'EEE, MMM d • h:mm a')}
            </p>
            <p className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              {event.locationName}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div>
              {event.isFree ? (
                <span className="text-green-400">Free</span>
              ) : (
                <span className="text-white">${event.priceUsd}</span>
              )}
            </div>

            <div className="text-sm">
              {isFull ? (
                <span className="text-red-400">Sold Out</span>
              ) : isAlmostFull ? (
                <span className="text-yellow-400">{spotsLeft} spots left!</span>
              ) : (
                <span className="text-gray-400">{spotsLeft} spots</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
```

---

### AchievementCard

Achievement display with unlock status.

```tsx
// src/components/dashboard/AchievementCard.tsx
'use client'

import { motion } from 'motion/react'

interface AchievementCardProps {
  achievement: {
    achievementType: string
    title: string
    description: string
    icon: string
    xpReward: number
    isUnlocked: boolean
    currentProgress?: number
    requirement?: { count: number }
  }
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const progress = achievement.currentProgress || 0
  const total = achievement.requirement?.count || 1
  const progressPercent = Math.min((progress / total) * 100, 100)

  return (
    <motion.div
      className={`rounded-xl p-4 ${
        achievement.isUnlocked
          ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30'
          : 'bg-gray-800'
      }`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Icon */}
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
            achievement.isUnlocked
              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
              : 'bg-gray-700'
          }`}
        >
          {achievement.isUnlocked ? (
            getAchievementIcon(achievement.icon)
          ) : (
            <LockIcon className="h-6 w-6 text-gray-500" />
          )}
        </div>

        <div className="flex-1">
          <h3 className={`font-semibold ${
            achievement.isUnlocked ? 'text-white' : 'text-gray-400'
          }`}>
            {achievement.title}
          </h3>
          <p className="text-sm text-gray-500">+{achievement.xpReward} XP</p>
        </div>
      </div>

      {/* Description */}
      <p className={`mb-3 text-sm ${
        achievement.isUnlocked ? 'text-gray-300' : 'text-gray-500'
      }`}>
        {achievement.description}
      </p>

      {/* Progress Bar */}
      {!achievement.isUnlocked && (
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-gray-500">Progress</span>
            <span className="text-gray-400">{progress}/{total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-700">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}

function getAchievementIcon(icon: string) {
  const icons: Record<string, string> = {
    trophy: '🏆',
    star: '⭐',
    fire: '🔥',
    heart: '💜',
    dance: '💃',
    medal: '🥇',
  }
  return icons[icon] || '🎯'
}
```

---

### StatsGrid

Dashboard statistics overview.

```tsx
// src/components/dashboard/StatsGrid.tsx
'use client'

import { motion } from 'motion/react'

interface Stat {
  label: string
  value: number | string
  change?: number
  icon: React.ComponentType<{ className?: string }>
  color: 'purple' | 'pink' | 'blue' | 'green'
}

interface StatsGridProps {
  stats: Stat[]
}

const colorClasses = {
  purple: 'from-purple-500 to-purple-600',
  pink: 'from-pink-500 to-pink-600',
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="rounded-xl bg-gray-800 p-6"
        >
          <div className="flex items-center justify-between">
            <div
              className={`rounded-lg bg-gradient-to-r ${colorClasses[stat.color]} p-2`}
            >
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            {stat.change !== undefined && (
              <span
                className={`text-sm ${
                  stat.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stat.change >= 0 ? '+' : ''}{stat.change}%
              </span>
            )}
          </div>
          <p className="mt-4 text-3xl font-bold text-white">{stat.value}</p>
          <p className="text-sm text-gray-400">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  )
}
```

**Usage:**

```tsx
<StatsGrid
  stats={[
    { label: 'Events Attended', value: 12, change: 20, icon: CalendarIcon, color: 'purple' },
    { label: 'Dance Bonds', value: 8, change: 15, icon: HeartIcon, color: 'pink' },
    { label: 'Achievements', value: 5, icon: TrophyIcon, color: 'blue' },
    { label: 'Total XP', value: '2,500', change: 30, icon: StarIcon, color: 'green' },
  ]}
/>
```

---

### MobileNav

Bottom navigation for mobile devices.

```tsx
// src/components/dashboard/MobileNav.tsx
'use client'

import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/dashboard/events', label: 'Events', icon: CalendarIcon },
  { href: '/dashboard/feed', label: 'Feed', icon: NewspaperIcon },
  { href: '/dashboard/profile', label: 'Profile', icon: UserIcon },
]

interface MobileNavProps {
  currentPath: string
}

export function MobileNav({ currentPath }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-800 bg-gray-900 lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                isActive ? 'text-purple-400' : 'text-gray-500'
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

---

## Page Examples

### Dashboard Home

```tsx
// app/dashboard/page.tsx
import { AuthGuard } from '@/src/components/auth/AuthGuard'
import { DashboardLayout } from '@/src/components/dashboard/DashboardLayout'
import { StatsGrid } from '@/src/components/dashboard/StatsGrid'
import { EventCard } from '@/src/components/dashboard/EventCard'

export default function DashboardPage() {
  return (
    <AuthGuard requireProfile>
      <DashboardLayout>
        <h1 className="mb-6 text-2xl font-bold text-white">Dashboard</h1>

        <StatsGrid stats={...} />

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Upcoming Events
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      </DashboardLayout>
    </AuthGuard>
  )
}
```

## Next Steps

- [Auth Components](/frontend/components-auth) - Authentication UI
- [danz-web](/frontend/danz-web) - Main website
- [API Reference](/api/graphql) - GraphQL operations
