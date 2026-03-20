'use client'

import { useMutation, useQuery } from '@apollo/client'
import { useSupabaseAuth } from '@/src/providers/SupabaseAuthProvider'
import { gql } from 'graphql-tag'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  FiCamera,
  FiCheck,
  FiChevronRight,
  FiLoader,
  FiMail,
  FiMusic,
  FiUpload,
  FiUser,
  FiX,
} from 'react-icons/fi'
import {
  DANCE_STYLES,
  DANCE_STYLE_EMOJIS,
  SKILL_LEVELS,
  SKILL_LEVEL_DISPLAY,
} from '../../constants/onboardingConstants'
import { useAuth } from '../../contexts/AuthContext'

// GraphQL queries and mutations
const ME_QUERY = gql`
  query Me {
    me {
      privy_id
      username
      display_name
      avatar_url
      bio
      city
      skill_level
      dance_styles
      role
    }
  }
`

const CHECK_USERNAME = gql`
  query CheckUsername($username: String!) {
    checkUsername(username: $username)
  }
`

const GET_UPLOAD_URL = gql`
  query GetUploadUrl($fileName: String!, $mimeType: MimeType!, $uploadType: UploadType!) {
    getUploadUrl(fileName: $fileName, mimeType: $mimeType, uploadType: $uploadType) {
      success
      uploadUrl
      fields
      publicUrl
      expires
      maxSize
    }
  }
`

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      privy_id
      username
      display_name
      avatar_url
      bio
      city
      skill_level
      dance_styles
      role
    }
  }
`

const COMPLETE_REFERRAL = gql`
  mutation CompleteReferral($input: CompleteReferralInput!) {
    completeReferral(input: $input) {
      id
      referral_code
      status
    }
  }
`

// Two-page flow: 'username' (required) → 'profile' (skippable)
type OnboardingStep = 'username' | 'profile'

interface OnboardingFlowProps {
  initialStep?: OnboardingStep
}

export const OnboardingFlow = ({ initialStep = 'username' }: OnboardingFlowProps) => {
  const { isAuthenticated, login, snoozeOnboarding } = useAuth()
  const { supabaseUser } = useSupabaseAuth()
  const router = useRouter()

  // Check if user profile already exists
  const { data: meData, loading: meLoading } = useQuery(ME_QUERY, {
    skip: !isAuthenticated,
    fetchPolicy: 'network-only',
  })

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)

  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    city: '',
    danceStyles: [] as string[],
    skillLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    instagram: '',
    tiktok: '',
  })

  const [localAvatarFile, setLocalAvatarFile] = useState<File | null>(null)
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [usernameError, setUsernameError] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState(false)
  const [usernameChecked, setUsernameChecked] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [updateProfile] = useMutation(UPDATE_PROFILE, {
    refetchQueries: [{ query: ME_QUERY }],
    awaitRefetchQueries: true,
  })
  const [completeReferral] = useMutation(COMPLETE_REFERRAL)
  const { refetch: checkUsername } = useQuery(CHECK_USERNAME, { skip: true })
  const { refetch: getUploadUrl } = useQuery(GET_UPLOAD_URL, { skip: true })

  useEffect(() => {
    // If user already has a username, redirect to dashboard
    if (meData?.me?.username) {
      router.push('/dashboard')
    }
  }, [meData, router])

  // Load referral code from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const referralCode = localStorage.getItem('referral_code')
      if (referralCode) {
        setFormData(prev => ({ ...prev, invitedBy: referralCode }))
      }
    }
  }, [])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const validateUsernameFormat = (username: string) => {
    if (!username) {
      setUsernameError('')
      setUsernameAvailable(false)
      return false
    }
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      setUsernameAvailable(false)
      return false
    }
    if (/\s/.test(username)) {
      setUsernameError('Username cannot contain spaces')
      setUsernameAvailable(false)
      return false
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameError('Only lowercase letters, numbers, and underscores allowed')
      setUsernameAvailable(false)
      return false
    }
    setUsernameError('')
    return true
  }

  const checkUsernameAvailability = async (username: string) => {
    if (!validateUsernameFormat(username)) {
      setUsernameChecked(true)
      return false
    }
    try {
      setIsCheckingUsername(true)
      setUsernameError('')
      const { data } = await checkUsername({ username })
      if (!data.checkUsername) {
        setUsernameError('Username is already taken')
        setUsernameAvailable(false)
        setUsernameChecked(true)
        return false
      }
      setUsernameAvailable(true)
      setUsernameChecked(true)
      return true
    } catch (error) {
      setUsernameError('Error checking username')
      setUsernameAvailable(false)
      setUsernameChecked(true)
      return false
    } finally {
      setIsCheckingUsername(false)
    }
  }

  const handleUsernameChange = (value: string) => {
    const formatted = value.toLowerCase().replace(/\s/g, '')
    setFormData(prev => ({ ...prev, username: formatted }))
    setUsernameError('')
    setUsernameAvailable(false)
    setUsernameChecked(false)

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (!formatted || formatted.length < 3) {
      validateUsernameFormat(formatted)
      setUsernameChecked(true)
      return
    }
    debounceTimerRef.current = setTimeout(() => {
      checkUsernameAvailability(formatted)
    }, 800)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }
    setLocalAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setLocalAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async () => {
    if (!localAvatarFile) return null
    try {
      setUploadingAvatar(true)
      const { data } = await getUploadUrl({
        fileName: localAvatarFile.name,
        mimeType: 'IMAGE_JPEG',
        uploadType: 'avatar',
      })
      if (!data?.getUploadUrl?.success) throw new Error('Failed to get upload URL')
      const presignedData = data.getUploadUrl
      const fd = new FormData()
      if (typeof presignedData.fields === 'object') {
        for (const [key, value] of Object.entries(presignedData.fields)) {
          fd.append(key, value as string)
        }
      }
      fd.append('file', localAvatarFile)
      const res = await fetch(presignedData.uploadUrl, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      return presignedData.publicUrl
    } catch (error) {
      console.error('Avatar upload failed:', error)
      return null
    } finally {
      setUploadingAvatar(false)
    }
  }

  const submitProfile = async () => {
    try {
      setIsLoading(true)

      let avatarUrl = formData.avatarUrl
      if (localAvatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) avatarUrl = uploadedUrl
      }

      const input: any = {
        username: formData.username,
        display_name: formData.displayName || formData.username,
        bio: formData.bio || undefined,
        avatar_url: avatarUrl || undefined,
        city: formData.city || undefined,
        dance_styles: formData.danceStyles.length > 0 ? formData.danceStyles : undefined,
        skill_level: formData.skillLevel,
      }
      if (formData.instagram) input.instagram = formData.instagram
      if (formData.tiktok) input.tiktok = formData.tiktok

      const result = await updateProfile({ variables: { input } })

      // Complete referral if applicable
      const referralCode = localStorage.getItem('referral_code')
      if (referralCode && result.data?.updateProfile?.privy_id) {
        try {
          await completeReferral({
            variables: {
              input: {
                referral_code: referralCode,
                referee_user_id: result.data.updateProfile.privy_id,
              },
            },
          })
          localStorage.removeItem('referral_code')
        } catch {
          // Don't block on referral failure
        }
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Registration failed:', error)
      alert('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUsernameSubmit = async () => {
    const isValid = await checkUsernameAvailability(formData.username)
    if (!isValid) return
    setCurrentStep('profile')
  }

  const handleProfileSubmit = async () => {
    await submitProfile()
  }

  const handleSkipProfile = async () => {
    // Submit with just the username (minimum viable profile)
    await submitProfile()
  }

  if (meLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center p-4">
        <FiLoader className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  // If not authenticated, show a sign-in prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-4xl">💃</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Welcome to DANZ
          </h2>
          <p className="text-gray-300 text-sm max-w-sm mx-auto">
            Sign in to set up your profile and join the dance community
          </p>
          <button
            onClick={login}
            className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In to Get Started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center p-4 py-8 sm:py-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-3 h-3 rounded-full transition-colors ${currentStep === 'username' ? 'bg-purple-500' : 'bg-green-500'}`} />
          <div className="w-8 h-0.5 bg-gray-700" />
          <div className={`w-3 h-3 rounded-full transition-colors ${currentStep === 'profile' ? 'bg-purple-500' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-400 ml-2">
            Step {currentStep === 'username' ? 1 : 2} of 2
          </span>
        </div>

        <motion.div
          layout
          className="bg-black/50 backdrop-blur-md rounded-2xl border border-purple-500/20 overflow-hidden"
        >
          <div className="p-5 sm:p-8">
            <AnimatePresence mode="wait">
              {/* ═══ PAGE 1: Username (required) ═══ */}
              {currentStep === 'username' && (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      Choose your username
                    </h2>
                    <p className="text-gray-400 text-sm">This is how other dancers will find you</p>

                    {supabaseUser?.email && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-900/20 rounded-lg border border-purple-500/20 text-sm">
                        <FiMail className="text-purple-400" size={14} />
                        <span className="text-gray-300">{supabaseUser.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Username input */}
                  <div>
                    <div
                      className={`relative rounded-xl border-2 transition-all ${
                        usernameError
                          ? 'border-red-500 bg-red-500/10'
                          : usernameAvailable
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-purple-500/30 bg-black/50'
                      }`}
                    >
                      <span className="absolute left-4 top-3.5 text-gray-400">@</span>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={e => handleUsernameChange(e.target.value)}
                        className="w-full px-10 py-3 bg-transparent text-text-primary focus:outline-none pr-12"
                        placeholder="username"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        autoFocus
                      />
                      <div className="absolute right-3 top-3.5">
                        {isCheckingUsername && (
                          <FiLoader className="w-5 h-5 text-purple-400 animate-spin" />
                        )}
                        {!isCheckingUsername && usernameAvailable && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                          >
                            <FiCheck className="text-white text-sm" />
                          </motion.div>
                        )}
                        {!isCheckingUsername && usernameChecked && !usernameAvailable && formData.username && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                          >
                            <FiX className="text-white text-sm" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                    <AnimatePresence mode="wait">
                      {usernameError && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-red-400 mt-2 flex items-center gap-1"
                        >
                          <FiX size={14} /> {usernameError}
                        </motion.p>
                      )}
                      {!isCheckingUsername && usernameAvailable && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-green-400 mt-2 flex items-center gap-1"
                        >
                          <FiCheck size={14} /> Username is available
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Display name (optional) */}
                  <div>
                    <label className="block text-text-primary mb-2 text-sm">
                      Display Name <span className="text-gray-500 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-xl text-text-primary focus:border-purple-500 focus:outline-none"
                      placeholder="How should we call you?"
                    />
                  </div>

                  {/* Next button */}
                  <button
                    onClick={handleUsernameSubmit}
                    disabled={isLoading || isCheckingUsername || !usernameAvailable}
                    className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>Continue</span>
                    <FiChevronRight />
                  </button>
                </motion.div>
              )}

              {/* ═══ PAGE 2: Profile details (skippable) ═══ */}
              {currentStep === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-5"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      Personalize your profile
                    </h2>
                    <p className="text-gray-400 text-sm">You can always update these later</p>
                  </div>

                  {/* Photo upload */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-black/30 border-2 border-purple-500/30">
                        {localAvatarPreview ? (
                          <img
                            src={localAvatarPreview}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiCamera className="w-8 h-8 text-purple-400" />
                          </div>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 cursor-pointer hover:bg-purple-700 transition-colors">
                        <FiUpload className="w-4 h-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          disabled={uploadingAvatar}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-text-primary mb-1.5 text-sm">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 200) }))}
                      className="w-full px-4 py-2.5 bg-black/50 border border-purple-500/30 rounded-xl text-text-primary focus:border-purple-500 focus:outline-none resize-none text-sm"
                      rows={2}
                      placeholder="Share your dance journey..."
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-text-primary mb-1.5 text-sm">Location</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-black/50 border border-purple-500/30 rounded-xl text-text-primary focus:border-purple-500 focus:outline-none text-sm"
                      placeholder="City, Country"
                    />
                  </div>

                  {/* Dance styles */}
                  <div>
                    <label className="block text-text-primary mb-1.5 text-sm">Dance Styles</label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                      {DANCE_STYLES.map(style => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              danceStyles: prev.danceStyles.includes(style)
                                ? prev.danceStyles.filter(s => s !== style)
                                : [...prev.danceStyles, style],
                            }))
                          }}
                          className={`py-1.5 px-2 rounded-lg border transition-all text-xs ${
                            formData.danceStyles.includes(style)
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-black/30 border-purple-500/30 text-gray-300 hover:border-purple-500/50'
                          }`}
                        >
                          {DANCE_STYLE_EMOJIS[style] || '🕺'} {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skill level */}
                  <div>
                    <label className="block text-text-primary mb-1.5 text-sm">Skill Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {SKILL_LEVELS.map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, skillLevel: level }))}
                          className={`py-2 px-3 rounded-xl border transition-all text-sm ${
                            formData.skillLevel === level
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-black/30 border-purple-500/30 text-gray-300 hover:border-purple-500/50'
                          }`}
                        >
                          {SKILL_LEVEL_DISPLAY[level]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setCurrentStep('username')}
                      disabled={isLoading || uploadingAvatar}
                      className="px-4 py-3 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSkipProfile}
                      disabled={isLoading || uploadingAvatar}
                      className="flex-1 px-4 py-3 border border-purple-500/30 hover:border-purple-500/50 text-gray-300 hover:text-white rounded-xl transition-all text-sm font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : 'Skip for now'}
                    </button>
                    <button
                      onClick={handleProfileSubmit}
                      disabled={isLoading || uploadingAvatar}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                      {isLoading || uploadingAvatar ? (
                        <FiLoader className="animate-spin" />
                      ) : null}
                      {isLoading ? 'Saving...' : "Let's Dance!"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Skip entire onboarding — snooze for 1 day */}
        {currentStep === 'username' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-4"
          >
            <button
              type="button"
              onClick={() => {
                snoozeOnboarding()
                router.push('/dashboard')
              }}
              className="text-gray-400 hover:text-purple-400 transition-colors text-sm"
            >
              Skip for now — go to dashboard
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
