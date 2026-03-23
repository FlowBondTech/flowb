# Authentication Components

React components for user authentication, registration, and onboarding flows.

## Overview

The authentication system uses Privy for identity management with custom UI components for the DANZ-specific onboarding experience.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTH COMPONENT FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐         ┌──────────────┐
     │  LoginButton │───────▶ │ Privy Modal  │
     └──────────────┘         └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  New User?   │
                              └──────┬───────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
       ┌──────────────┐       ┌──────────────┐      ┌──────────────┐
       │ Existing     │       │OnboardingFlow│      │  Dashboard   │
       │ Go to        │       │              │      │              │
       │ Dashboard    │       │ RegisterForm │      │              │
       └──────────────┘       └──────────────┘      └──────────────┘
```

## Components

### LoginButton

Simple login trigger that opens the Privy authentication modal.

```tsx
// src/components/auth/LoginButton.tsx
'use client'

import { usePrivy } from '@privy-io/react-auth'
import { motion } from 'motion/react'

interface LoginButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
}

export function LoginButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: LoginButtonProps) {
  const { login, ready, authenticated } = usePrivy()

  if (!ready) {
    return (
      <button
        disabled
        className={`btn btn-${variant} btn-${size} opacity-50 ${className}`}
      >
        Loading...
      </button>
    )
  }

  if (authenticated) {
    return null // User already logged in
  }

  return (
    <motion.button
      onClick={login}
      className={`btn btn-${variant} btn-${size} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children || 'Get Started'}
    </motion.button>
  )
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline'` | `'primary'` | Button style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `className` | `string` | `''` | Additional CSS classes |
| `children` | `React.ReactNode` | `'Get Started'` | Button content |

**Usage:**

```tsx
// Landing page
<LoginButton>Join the Dance</LoginButton>

// Navigation
<LoginButton variant="outline" size="sm">Sign In</LoginButton>

// Hero section
<LoginButton size="lg" className="w-full sm:w-auto">
  Start Dancing Today
</LoginButton>
```

---

### OnboardingFlow

Multi-step wizard for new user registration with progress tracking.

```tsx
// src/components/auth/OnboardingFlow.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useCreateUserMutation } from '@/src/generated/graphql'
import { RegisterForm } from './RegisterForm'
import { ProfileSetup } from './ProfileSetup'
import { DancePreferences } from './DancePreferences'

type OnboardingStep = 'register' | 'profile' | 'preferences' | 'complete'

interface OnboardingData {
  username: string
  displayName: string
  bio: string
  avatarUrl: string | null
  city: string
  danceStyles: string[]
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
}

export function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>('register')
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [createUser, { loading, error }] = useCreateUserMutation()

  const steps: OnboardingStep[] = ['register', 'profile', 'preferences']
  const currentIndex = steps.indexOf(step)
  const progress = ((currentIndex + 1) / steps.length) * 100

  const handleStepComplete = async (stepData: Partial<OnboardingData>) => {
    const updatedData = { ...data, ...stepData }
    setData(updatedData)

    if (step === 'register') {
      setStep('profile')
    } else if (step === 'profile') {
      setStep('preferences')
    } else if (step === 'preferences') {
      // Final step - create user
      try {
        await createUser({
          variables: {
            input: {
              username: updatedData.username!,
              displayName: updatedData.displayName,
              bio: updatedData.bio,
              avatarUrl: updatedData.avatarUrl,
              city: updatedData.city,
              danceStyles: updatedData.danceStyles,
              skillLevel: updatedData.skillLevel,
            },
          },
        })
        setStep('complete')
        setTimeout(() => router.push('/dashboard'), 2000)
      } catch (err) {
        console.error('Failed to create user:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black p-4">
      <div className="mx-auto max-w-lg">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm text-gray-400">
            <span>Step {currentIndex + 1} of {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-800">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 'register' && (
              <RegisterForm onComplete={handleStepComplete} />
            )}
            {step === 'profile' && (
              <ProfileSetup
                initialData={data}
                onComplete={handleStepComplete}
              />
            )}
            {step === 'preferences' && (
              <DancePreferences
                initialData={data}
                onComplete={handleStepComplete}
                loading={loading}
              />
            )}
            {step === 'complete' && (
              <CompletionScreen />
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 p-4 text-red-400">
            {error.message}
          </div>
        )}
      </div>
    </div>
  )
}

function CompletionScreen() {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-500"
      >
        <CheckIcon className="h-12 w-12 text-white" />
      </motion.div>
      <h2 className="text-2xl font-bold text-white">Welcome to DANZ!</h2>
      <p className="mt-2 text-gray-400">
        Redirecting to your dashboard...
      </p>
    </div>
  )
}
```

**Step Flow:**

| Step | Purpose | Required Fields |
|------|---------|-----------------|
| `register` | Username selection | `username` |
| `profile` | Basic info | `displayName`, `bio`, `city` |
| `preferences` | Dance info | `danceStyles`, `skillLevel` |
| `complete` | Success screen | - |

---

### RegisterForm

Username selection with real-time availability checking.

```tsx
// src/components/auth/RegisterForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/src/hooks/useDebounce'
import { useCheckUsernameQuery } from '@/src/generated/graphql'

interface RegisterFormProps {
  onComplete: (data: { username: string }) => void
}

export function RegisterForm({ onComplete }: RegisterFormProps) {
  const [username, setUsername] = useState('')
  const [touched, setTouched] = useState(false)
  const debouncedUsername = useDebounce(username, 300)

  const { data, loading } = useCheckUsernameQuery({
    variables: { username: debouncedUsername },
    skip: !debouncedUsername || debouncedUsername.length < 3,
  })

  const isValid = debouncedUsername.length >= 3 &&
                  /^[a-zA-Z0-9_]+$/.test(debouncedUsername)
  const isAvailable = data?.isUsernameAvailable ?? null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && isAvailable) {
      onComplete({ username })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Choose your username</h2>
        <p className="mt-2 text-gray-400">
          This is how other dancers will find you
        </p>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          @
        </span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          onBlur={() => setTouched(true)}
          placeholder="your_username"
          className="input pl-8"
          autoFocus
        />

        {/* Status indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {loading && <Spinner className="h-5 w-5" />}
          {!loading && isAvailable === true && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {!loading && isAvailable === false && (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
      </div>

      {/* Validation messages */}
      {touched && username && (
        <div className="text-sm">
          {username.length < 3 && (
            <p className="text-red-400">Username must be at least 3 characters</p>
          )}
          {!/^[a-zA-Z0-9_]+$/.test(username) && (
            <p className="text-red-400">Only letters, numbers, and underscores</p>
          )}
          {isAvailable === false && (
            <p className="text-red-400">Username is already taken</p>
          )}
          {isValid && isAvailable && (
            <p className="text-green-400">Username is available!</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid || !isAvailable}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  )
}
```

**Validation Rules:**

| Rule | Description |
|------|-------------|
| Minimum length | 3 characters |
| Maximum length | 30 characters |
| Allowed characters | Letters, numbers, underscore |
| Unique | Must not exist in database |

---

### ProfileSetup

Basic profile information collection with avatar upload.

```tsx
// src/components/auth/ProfileSetup.tsx
'use client'

import { useState } from 'react'
import { useGetUploadUrlMutation } from '@/src/generated/graphql'
import { AvatarUpload } from './AvatarUpload'

interface ProfileSetupProps {
  initialData: Partial<OnboardingData>
  onComplete: (data: Partial<OnboardingData>) => void
}

export function ProfileSetup({ initialData, onComplete }: ProfileSetupProps) {
  const [displayName, setDisplayName] = useState(initialData.displayName || '')
  const [bio, setBio] = useState(initialData.bio || '')
  const [city, setCity] = useState(initialData.city || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [getUploadUrl] = useGetUploadUrlMutation()

  const handleAvatarUpload = async (file: File) => {
    const { data } = await getUploadUrl({
      variables: {
        input: {
          filename: file.name,
          contentType: file.type,
          folder: 'avatars',
        },
      },
    })

    if (data?.getUploadUrl) {
      // Upload to S3
      await fetch(data.getUploadUrl.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      setAvatarUrl(data.getUploadUrl.fileUrl)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete({ displayName, bio, city, avatarUrl })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Set up your profile</h2>
        <p className="mt-2 text-gray-400">
          Let other dancers know who you are
        </p>
      </div>

      {/* Avatar Upload */}
      <div className="flex justify-center">
        <AvatarUpload
          currentUrl={avatarUrl}
          onUpload={handleAvatarUpload}
        />
      </div>

      {/* Display Name */}
      <div>
        <label className="label">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="input"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="label">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about your dance journey..."
          rows={3}
          className="input"
          maxLength={500}
        />
        <span className="text-xs text-gray-500">{bio.length}/500</span>
      </div>

      {/* City */}
      <div>
        <label className="label">City</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Where are you based?"
          className="input"
        />
      </div>

      <div className="flex gap-4">
        <button type="button" className="btn btn-outline flex-1">
          Back
        </button>
        <button type="submit" className="btn btn-primary flex-1">
          Continue
        </button>
      </div>
    </form>
  )
}
```

---

### DancePreferences

Dance style and skill level selection.

```tsx
// src/components/auth/DancePreferences.tsx
'use client'

import { useState } from 'react'
import { motion } from 'motion/react'

const DANCE_STYLES = [
  { id: 'salsa', label: 'Salsa', emoji: '💃' },
  { id: 'hip-hop', label: 'Hip Hop', emoji: '🕺' },
  { id: 'bachata', label: 'Bachata', emoji: '🌹' },
  { id: 'contemporary', label: 'Contemporary', emoji: '🩰' },
  { id: 'jazz', label: 'Jazz', emoji: '🎷' },
  { id: 'ballet', label: 'Ballet', emoji: '🦢' },
  { id: 'breakdance', label: 'Breakdance', emoji: '🤸' },
  { id: 'swing', label: 'Swing', emoji: '🎺' },
  { id: 'ballroom', label: 'Ballroom', emoji: '👔' },
  { id: 'kpop', label: 'K-Pop', emoji: '🇰🇷' },
  { id: 'afrobeats', label: 'Afrobeats', emoji: '🥁' },
  { id: 'latin', label: 'Latin', emoji: '🌶️' },
]

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Just starting out' },
  { id: 'intermediate', label: 'Intermediate', description: 'Comfortable with basics' },
  { id: 'advanced', label: 'Advanced', description: 'Years of experience' },
]

interface DancePreferencesProps {
  initialData: Partial<OnboardingData>
  onComplete: (data: Partial<OnboardingData>) => void
  loading?: boolean
}

export function DancePreferences({
  initialData,
  onComplete,
  loading,
}: DancePreferencesProps) {
  const [danceStyles, setDanceStyles] = useState<string[]>(
    initialData.danceStyles || []
  )
  const [skillLevel, setSkillLevel] = useState<string>(
    initialData.skillLevel || ''
  )

  const toggleStyle = (styleId: string) => {
    setDanceStyles((prev) =>
      prev.includes(styleId)
        ? prev.filter((s) => s !== styleId)
        : [...prev, styleId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (danceStyles.length > 0 && skillLevel) {
      onComplete({
        danceStyles,
        skillLevel: skillLevel as 'beginner' | 'intermediate' | 'advanced',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Your dance style</h2>
        <p className="mt-2 text-gray-400">
          Select all the styles you enjoy (at least one)
        </p>
      </div>

      {/* Dance Styles Grid */}
      <div className="grid grid-cols-3 gap-3">
        {DANCE_STYLES.map((style) => (
          <motion.button
            key={style.id}
            type="button"
            onClick={() => toggleStyle(style.id)}
            className={`rounded-xl p-4 text-center transition ${
              danceStyles.includes(style.id)
                ? 'bg-purple-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-2xl">{style.emoji}</span>
            <p className="mt-1 text-sm">{style.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Skill Level */}
      <div>
        <label className="label">Skill Level</label>
        <div className="space-y-2">
          {SKILL_LEVELS.map((level) => (
            <motion.button
              key={level.id}
              type="button"
              onClick={() => setSkillLevel(level.id)}
              className={`w-full rounded-lg p-4 text-left transition ${
                skillLevel === level.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <p className="font-semibold">{level.label}</p>
              <p className="text-sm opacity-75">{level.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={danceStyles.length === 0 || !skillLevel || loading}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Complete Setup'}
      </button>
    </form>
  )
}
```

---

### AvatarUpload

Image upload component with preview and cropping.

```tsx
// src/components/auth/AvatarUpload.tsx
'use client'

import { useRef, useState } from 'react'
import { motion } from 'motion/react'

interface AvatarUploadProps {
  currentUrl: string | null
  onUpload: (file: File) => Promise<void>
}

export function AvatarUpload({ currentUrl, onUpload }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-28 w-28 overflow-hidden rounded-full bg-gray-800"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UserIcon className="h-12 w-12 text-gray-500" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
          <CameraIcon className="h-8 w-8 text-white" />
        </div>

        {/* Loading */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <Spinner className="h-8 w-8" />
          </div>
        )}
      </motion.button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}
```

---

### AuthGuard

Route protection wrapper for authenticated pages.

```tsx
// src/components/auth/AuthGuard.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  requireProfile?: boolean
  redirectTo?: string
}

export function AuthGuard({
  children,
  requireProfile = false,
  redirectTo = '/',
}: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(redirectTo)
      } else if (requireProfile && !user?.username) {
        router.push('/register')
      }
    }
  }, [isAuthenticated, isLoading, user, requireProfile, router, redirectTo])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requireProfile && !user?.username) {
    return null
  }

  return <>{children}</>
}
```

**Usage:**

```tsx
// app/dashboard/page.tsx
import { AuthGuard } from '@/src/components/auth/AuthGuard'

export default function DashboardPage() {
  return (
    <AuthGuard requireProfile>
      <Dashboard />
    </AuthGuard>
  )
}
```

---

## Hooks

### useAuth

Primary authentication hook combining Privy and user data.

```tsx
// src/hooks/useAuth.ts
import { usePrivy } from '@privy-io/react-auth'
import { useMeQuery } from '@/src/generated/graphql'

export function useAuth() {
  const { user: privyUser, authenticated, ready, login, logout } = usePrivy()
  const { data, loading, refetch } = useMeQuery({
    skip: !authenticated,
  })

  return {
    privyUser,
    user: data?.me ?? null,
    isAuthenticated: authenticated,
    isLoading: !ready || loading,
    hasProfile: !!data?.me?.username,
    login,
    logout,
    refetch,
  }
}
```

### useRequireAuth

Redirect hook for protected pages.

```tsx
// src/hooks/useRequireAuth.ts
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './useAuth'

export function useRequireAuth(options?: {
  requireProfile?: boolean
  redirectTo?: string
}) {
  const router = useRouter()
  const { isAuthenticated, isLoading, hasProfile } = useAuth()
  const { requireProfile = false, redirectTo = '/' } = options || {}

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo)
    }
    if (!isLoading && requireProfile && !hasProfile) {
      router.push('/register')
    }
  }, [isAuthenticated, isLoading, hasProfile, requireProfile, router, redirectTo])

  return { isLoading }
}
```

## Next Steps

- [Dashboard Components](/frontend/components-dashboard) - Dashboard UI
- [danz-web](/frontend/danz-web) - Main website
- [Authentication API](/api/authentication) - Backend auth
