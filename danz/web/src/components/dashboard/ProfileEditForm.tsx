'use client'

import { ToastContainer } from '@/src/components/ui/Toast'
import { useToast } from '@/src/hooks/useToast'
import { useMutation } from '@apollo/client'
import { gql } from 'graphql-tag'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { FaTiktok } from 'react-icons/fa'
import {
  FiActivity,
  FiAward,
  FiCalendar,
  FiCheck,
  FiClock,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiInstagram,
  FiLink,
  FiLock,
  FiMail,
  FiMapPin,
  FiMusic,
  FiPlus,
  FiShield,
  FiStar,
  FiTrash2,
  FiTwitter,
  FiUser,
  FiX,
  FiYoutube,
} from 'react-icons/fi'
import UsernameChangeModal from './UsernameChangeModal'

export interface ProfileEditFormRef {
  triggerAvatarUpload: () => void
  triggerCoverUpload: () => void
}

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      privy_id
      username
      display_name
      bio
      avatar_url
      cover_image_url
      location
      city
      website
      website_url
      instagram
      tiktok
      youtube
      twitter
      dance_styles
      skill_level
      favorite_music
      age
      pronouns
      is_public
      allow_messages
      show_location
      role
      xp
      level
      subscription_tier
      is_premium
      social_media_links
      total_dance_time
      total_sessions
      longest_streak
      total_events_attended
      total_events_created
      upcoming_events_count
      total_achievements
      dance_bonds_count
      created_at
      updated_at
    }
  }
`

const DANCE_STYLES = [
  'Hip Hop',
  'Contemporary',
  'Jazz',
  'Ballet',
  'Breaking',
  'Popping',
  'Locking',
  'House',
  'Salsa',
  'Bachata',
  'Ballroom',
  'Tap',
  'Krump',
  'Waacking',
  'Voguing',
  'Afrobeats',
  'Dancehall',
  'K-Pop',
]

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', description: 'Comfortable with basics' },
  { value: 'advanced', label: 'Advanced', description: 'Highly skilled' },
  { value: 'professional', label: 'Professional', description: 'Teaching or performing' },
]

const MUSIC_GENRES = [
  'Hip Hop',
  'R&B',
  'Pop',
  'Electronic',
  'House',
  'Techno',
  'Afrobeats',
  'Dancehall',
  'Reggaeton',
  'Latin',
  'Salsa',
  'Bachata',
  'K-Pop',
  'J-Pop',
  'Funk',
  'Soul',
  'Jazz',
  'Classical',
  'EDM',
  'Drum & Bass',
  'Trap',
  'Dubstep',
  'Disco',
  'Rock',
  'Indie',
  'Alternative',
  'World Music',
  'Gospel',
  'Country',
  'Bollywood',
]

interface ProfileEditFormProps {
  user: any
  onSave?: () => void
  onCancel?: () => void
}

const ProfileEditForm = forwardRef<ProfileEditFormRef, ProfileEditFormProps>(
  ({ user, onSave, onCancel }, ref) => {
    const toast = useToast()
    const [formData, setFormData] = useState({
      username: '',
      display_name: '',
      bio: '',
      avatar_url: '',
      cover_image_url: '',
      location: '',
      city: '',
      website: '',
      website_url: '',
      instagram: '',
      tiktok: '',
      youtube: '',
      twitter: '',
      dance_styles: [] as string[],
      skill_level: '',
      favorite_music: [] as string[],
      age: null as number | null,
      pronouns: '',
      is_public: true,
      allow_messages: true,
      show_location: true,
      additional_websites: [] as { label: string; url: string }[],
    })

    // Check if user is premium
    const isPremium =
      user?.is_premium === 'active' ||
      user?.subscription_tier === 'premium' ||
      user?.subscription_tier === 'pro'
    const [hasChanges, setHasChanges] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [uploadingCover, setUploadingCover] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<{ avatar?: number; cover?: number }>({})
    const [newMusicTag, setNewMusicTag] = useState('')
    const [showPreview, setShowPreview] = useState(false)
    const [showUsernameModal, setShowUsernameModal] = useState(false)
    const [showMusicSuggestions, setShowMusicSuggestions] = useState(false)
    const musicInputRef = useRef<HTMLInputElement>(null)
    const musicDropdownRef = useRef<HTMLDivElement>(null)

    const avatarInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      triggerAvatarUpload: () => avatarInputRef.current?.click(),
      triggerCoverUpload: () => coverInputRef.current?.click(),
    }))

    const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE, {
      update(cache, { data }) {
        if (data?.updateProfile) {
          // Update the me query cache with the new profile data
          cache.modify({
            fields: {
              me() {
                return data.updateProfile
              },
            },
          })
        }
      },
      onCompleted: () => {
        setHasChanges(false)
        toast.success('Profile updated successfully!')
        if (onSave) onSave()
      },
      onError: error => {
        console.error('Error updating profile:', error)
        toast.error('Failed to update profile. Please try again.')
        setErrors({ submit: 'Failed to update profile. Please try again.' })
      },
    })

    useEffect(() => {
      if (user) {
        // Parse additional websites from social_media_links
        let additionalWebsites: { label: string; url: string }[] = []
        if (user.social_media_links?.additional_websites) {
          additionalWebsites = user.social_media_links.additional_websites
        }

        setFormData({
          username: user.username || '',
          display_name: user.display_name || '',
          bio: user.bio || '',
          avatar_url: user.avatar_url || '',
          cover_image_url: user.cover_image_url || '',
          location: user.location || '',
          city: user.city || '',
          website: user.website || '',
          website_url: user.website_url || '',
          instagram: user.instagram || '',
          tiktok: user.tiktok || '',
          youtube: user.youtube || '',
          twitter: user.twitter || '',
          dance_styles: user.dance_styles || [],
          skill_level: user.skill_level || '',
          favorite_music: user.favorite_music || [],
          age: user.age || null,
          pronouns: user.pronouns || '',
          is_public: user.is_public ?? true,
          allow_messages: user.allow_messages ?? true,
          show_location: user.show_location ?? true,
          additional_websites: additionalWebsites,
        })
      }
    }, [user])

    useEffect(() => {
      // Check if any field has changed
      const changed =
        formData.display_name !== (user?.display_name || '') ||
        formData.bio !== (user?.bio || '') ||
        formData.avatar_url !== (user?.avatar_url || '') ||
        formData.cover_image_url !== (user?.cover_image_url || '') ||
        formData.location !== (user?.location || '') ||
        formData.city !== (user?.city || '') ||
        formData.website !== (user?.website || '') ||
        formData.instagram !== (user?.instagram || '') ||
        formData.tiktok !== (user?.tiktok || '') ||
        formData.youtube !== (user?.youtube || '') ||
        formData.twitter !== (user?.twitter || '') ||
        formData.pronouns !== (user?.pronouns || '') ||
        formData.skill_level !== (user?.skill_level || '') ||
        JSON.stringify(formData.dance_styles) !== JSON.stringify(user?.dance_styles || [])

      setHasChanges(changed)
    }, [formData, user])

    // Helper to remove spaces from social media handles
    const sanitizeSocialHandle = (value: string) => {
      return value.replace(/\s/g, '')
    }

    const handleDanceStyleToggle = (style: string) => {
      setFormData(prev => ({
        ...prev,
        dance_styles: prev.dance_styles.includes(style)
          ? prev.dance_styles.filter(s => s !== style)
          : [...prev.dance_styles, style],
      }))
    }

    const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
      const isAvatar = type === 'avatar'
      const setUploading = isAvatar ? setUploadingAvatar : setUploadingCover
      const maxSize = isAvatar ? 5 * 1024 * 1024 : 10 * 1024 * 1024

      // Validate file
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      if (file.size > maxSize) {
        toast.error(`File size must be less than ${isAvatar ? '5MB' : '10MB'}`)
        return
      }

      try {
        setUploading(true)
        setUploadProgress({ ...uploadProgress, [type]: 0 })

        // Get upload URL from GraphQL
        const response = await fetch(
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/graphql',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `
            query GetUploadUrl($fileName: String!, $mimeType: MimeType!, $uploadType: UploadType!) {
              getUploadUrl(fileName: $fileName, mimeType: $mimeType, uploadType: $uploadType) {
                uploadUrl
                fields
                publicUrl
              }
            }
          `,
              variables: {
                fileName: file.name,
                mimeType: file.type.replace('/', '_').replace('-', '_').toUpperCase(),
                uploadType: type.toUpperCase(),
              },
            }),
          },
        )

        const { data } = await response.json()
        if (!data?.getUploadUrl) {
          throw new Error('Failed to get upload URL')
        }

        const { uploadUrl, fields, publicUrl } = data.getUploadUrl

        setUploadProgress({ ...uploadProgress, [type]: 50 })

        // Upload to S3
        const formData = new FormData()
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value as string)
        })
        formData.append('file', file)

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to S3')
        }

        setUploadProgress({ ...uploadProgress, [type]: 100 })

        // Update form data with new URL
        setFormData(prev => ({
          ...prev,
          [isAvatar ? 'avatar_url' : 'cover_image_url']: publicUrl,
        }))

        toast.success(`${isAvatar ? 'Avatar' : 'Cover image'} uploaded successfully!`)
      } catch (err: any) {
        console.error('Upload error:', err)
        toast.error(err.message || 'Failed to upload image')
      } finally {
        setUploading(false)
        setUploadProgress({ ...uploadProgress, [type]: undefined })
      }
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleImageUpload(file, 'avatar')
      }
    }

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleImageUpload(file, 'cover')
      }
    }

    // Calculate profile completion percentage
    const calculateCompletion = () => {
      const fields = [
        formData.display_name,
        formData.bio,
        formData.avatar_url,
        formData.cover_image_url,
        formData.city,
        formData.location,
        formData.skill_level,
        formData.dance_styles.length > 0,
        formData.age,
        formData.pronouns,
        formData.website ||
          formData.instagram ||
          formData.tiktok ||
          formData.youtube ||
          formData.twitter,
      ]
      const completed = fields.filter(Boolean).length
      return Math.round((completed / fields.length) * 100)
    }

    // Normalize website URL (add https:// if missing)
    const normalizeWebsiteUrl = (url: string) => {
      if (!url) return ''
      if (url.startsWith('http://') || url.startsWith('https://')) return url
      return `https://${url}`
    }

    // Validate social media handle
    const validateSocialHandle = (handle: string, platform: string) => {
      if (!handle) return true
      // Remove @ if present
      const cleaned = handle.replace('@', '')
      // Check for invalid characters
      if (!/^[a-zA-Z0-9._-]+$/.test(cleaned)) {
        toast.warning(`${platform} handle contains invalid characters`)
        return false
      }
      return true
    }

    // Close music suggestions when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          musicDropdownRef.current &&
          !musicDropdownRef.current.contains(event.target as Node) &&
          musicInputRef.current &&
          !musicInputRef.current.contains(event.target as Node)
        ) {
          setShowMusicSuggestions(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Filter music suggestions based on input
    const filteredMusicSuggestions = MUSIC_GENRES.filter(
      genre =>
        !formData.favorite_music.includes(genre) &&
        genre.toLowerCase().includes(newMusicTag.toLowerCase()),
    )

    // Handle music tag addition
    const addMusicTag = (genre?: string) => {
      const tagToAdd = genre || newMusicTag.trim()
      if (!tagToAdd) {
        // If empty, show suggestions dropdown
        setShowMusicSuggestions(true)
        musicInputRef.current?.focus()
        return
      }
      if (formData.favorite_music.includes(tagToAdd)) {
        toast.warning('This music genre is already added')
        return
      }
      setFormData(prev => ({
        ...prev,
        favorite_music: [...prev.favorite_music, tagToAdd],
      }))
      setNewMusicTag('')
      setShowMusicSuggestions(false)
    }

    const removeMusicTag = (tag: string) => {
      setFormData(prev => ({
        ...prev,
        favorite_music: prev.favorite_music.filter(t => t !== tag),
      }))
    }

    // Additional websites management (premium feature)
    const addAdditionalWebsite = () => {
      if (!isPremium) {
        toast.info('Upgrade to Premium to add multiple websites!')
        return
      }
      if (formData.additional_websites.length >= 5) {
        toast.warning('Maximum 5 additional websites allowed')
        return
      }
      setFormData(prev => ({
        ...prev,
        additional_websites: [...prev.additional_websites, { label: '', url: '' }],
      }))
    }

    const updateAdditionalWebsite = (index: number, field: 'label' | 'url', value: string) => {
      setFormData(prev => ({
        ...prev,
        additional_websites: prev.additional_websites.map((site, i) =>
          i === index ? { ...site, [field]: value } : site,
        ),
      }))
    }

    const removeAdditionalWebsite = (index: number) => {
      setFormData(prev => ({
        ...prev,
        additional_websites: prev.additional_websites.filter((_, i) => i !== index),
      }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      // Validate social handles
      if (!validateSocialHandle(formData.instagram, 'Instagram')) return
      if (!validateSocialHandle(formData.tiktok, 'TikTok')) return
      if (!validateSocialHandle(formData.youtube, 'YouTube')) return
      if (!validateSocialHandle(formData.twitter, 'Twitter')) return

      // Validate age
      if (formData.age !== null && (formData.age < 13 || formData.age > 120)) {
        toast.error('Please enter a valid age between 13 and 120')
        return
      }

      // Only send changed fields
      const changedFields: any = {}

      if (formData.display_name !== user?.display_name)
        changedFields.display_name = formData.display_name
      if (formData.bio !== user?.bio) changedFields.bio = formData.bio
      if (formData.avatar_url !== user?.avatar_url) changedFields.avatar_url = formData.avatar_url
      if (formData.cover_image_url !== user?.cover_image_url)
        changedFields.cover_image_url = formData.cover_image_url
      if (formData.location !== user?.location) changedFields.location = formData.location
      if (formData.city !== user?.city) changedFields.city = formData.city

      // Normalize website URL
      const normalizedWebsite = normalizeWebsiteUrl(formData.website)
      if (normalizedWebsite !== user?.website) changedFields.website = normalizedWebsite

      if (formData.instagram !== user?.instagram) changedFields.instagram = formData.instagram
      if (formData.tiktok !== user?.tiktok) changedFields.tiktok = formData.tiktok
      if (formData.youtube !== user?.youtube) changedFields.youtube = formData.youtube
      if (formData.twitter !== user?.twitter) changedFields.twitter = formData.twitter
      if (formData.pronouns !== user?.pronouns) changedFields.pronouns = formData.pronouns
      if (formData.skill_level !== user?.skill_level)
        changedFields.skill_level = formData.skill_level
      if (formData.age !== user?.age) changedFields.age = formData.age
      if (formData.is_public !== user?.is_public) changedFields.is_public = formData.is_public
      if (formData.allow_messages !== user?.allow_messages)
        changedFields.allow_messages = formData.allow_messages
      if (formData.show_location !== user?.show_location)
        changedFields.show_location = formData.show_location

      if (JSON.stringify(formData.dance_styles) !== JSON.stringify(user?.dance_styles)) {
        changedFields.dance_styles = formData.dance_styles
      }
      if (JSON.stringify(formData.favorite_music) !== JSON.stringify(user?.favorite_music)) {
        changedFields.favorite_music = formData.favorite_music
      }

      // Save additional websites to social_media_links (premium feature)
      const currentAdditionalWebsites = user?.social_media_links?.additional_websites || []
      const validAdditionalWebsites = formData.additional_websites.filter(site => site.url.trim())
      if (JSON.stringify(validAdditionalWebsites) !== JSON.stringify(currentAdditionalWebsites)) {
        changedFields.social_media_links = {
          ...(user?.social_media_links || {}),
          additional_websites: validAdditionalWebsites.map(site => ({
            label: site.label || 'Website',
            url: normalizeWebsiteUrl(site.url),
          })),
        }
      }

      if (Object.keys(changedFields).length === 0) {
        toast.info('No changes to save')
        return
      }

      await updateProfile({
        variables: {
          input: changedFields,
        },
      })
    }

    const completion = calculateCompletion()

    return (
      <>
        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sticky Save Header */}
          <div className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {hasChanges ? (
                  <span className="text-amber-400 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    Unsaved changes
                  </span>
                ) : (
                  <span className="text-text-secondary text-sm flex items-center gap-2">
                    <FiCheck className="text-green-500" />
                    All changes saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || !hasChanges}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    hasChanges
                      ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white hover:opacity-90'
                      : 'bg-white/10 text-text-secondary cursor-not-allowed'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            {errors.submit && (
              <div className="mt-2 p-2 bg-red-400/10 border border-red-400/20 rounded-lg">
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Profile Completion Badge */}
          <div className="bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-xl border border-neon-purple/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FiAward className="text-neon-purple" size={20} />
                <h3 className="text-sm font-semibold text-text-primary">Profile Completion</h3>
              </div>
              <span className="text-lg font-bold text-neon-purple">{completion}%</span>
            </div>
            <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-purple to-neon-pink transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            {completion < 100 && (
              <p className="text-xs text-text-secondary mt-2">
                Complete your profile to unlock all features and increase your visibility!
              </p>
            )}
          </div>

          {/* Profile Stats Display */}
          {user && (
            <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6">
              <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <FiActivity className="text-neon-purple" />
                Your Stats
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-neon-purple">{user.level || 1}</div>
                  <div className="text-xs text-text-secondary">Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-neon-pink">{user.xp || 0}</div>
                  <div className="text-xs text-text-secondary">XP</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {user.longest_streak || 0}
                  </div>
                  <div className="text-xs text-text-secondary">Best Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{user.total_sessions || 0}</div>
                  <div className="text-xs text-text-secondary">Sessions</div>
                </div>
              </div>
            </div>
          )}

          {/* Last Updated */}
          {user?.updated_at && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <FiClock size={14} />
              <span>Last updated: {new Date(user.updated_at).toLocaleDateString()}</span>
            </div>
          )}

          {/* Hidden file inputs for image uploads */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleCoverChange}
            className="hidden"
          />

          {/* Basic Information */}
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-6">Basic Information</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="username" className="block text-text-secondary text-sm mb-2">
                  Username
                </label>
                {user?.username_minted ? (
                  /* Minted Username Display */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <FiCheck className="text-green-500" size={18} />
                      <span className="text-green-400 font-bold text-lg">
                        {formData.username}.danz.eth
                      </span>
                      <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                        <FiLock size={10} />
                        Minted
                      </span>
                    </div>
                    <p className="text-text-secondary text-xs flex items-center gap-1">
                      <FiLock size={12} />
                      Your username is permanently minted on-chain and cannot be changed
                    </p>
                  </div>
                ) : (
                  /* Non-minted Username Display */
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                          @
                        </div>
                        <input
                          id="username"
                          type="text"
                          value={formData.username}
                          disabled
                          className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-secondary cursor-not-allowed"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowUsernameModal(true)}
                        className="px-4 py-3 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 rounded-lg text-neon-purple transition-colors flex items-center gap-2"
                        title="Request username change"
                      >
                        <FiEdit3 size={16} />
                        <span className="hidden sm:inline">Change</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-text-secondary text-xs">
                        Username changes require approval after the first change
                      </p>
                    </div>
                    {/* Mint Username CTA - Coming Soon */}
                    <div className="mt-3 p-4 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 border border-neon-purple/30 rounded-xl opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-neon-purple/20 rounded-lg">
                          <FiShield className="text-neon-purple" size={20} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-text-primary font-semibold text-sm">
                            Mint your username forever
                          </h4>
                          <p className="text-text-secondary text-xs mt-1">
                            Secure{' '}
                            <span className="text-neon-purple font-medium">
                              {formData.username}.danz.eth
                            </span>{' '}
                            as your permanent on-chain identity
                          </p>
                        </div>
                        <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-text-secondary text-sm font-medium whitespace-nowrap">
                          Coming Soon
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label htmlFor="display-name" className="block text-text-secondary text-sm mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="display-name"
                    type="text"
                    value={formData.display_name}
                    onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                    placeholder="How should we display your name?"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="bio-field" className="block text-text-secondary text-sm mb-2">
                  Bio
                </label>
                <textarea
                  id="bio-field"
                  value={formData.bio}
                  onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors resize-none"
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label htmlFor="pronouns" className="block text-text-secondary text-sm mb-2">
                  Pronouns
                </label>
                <input
                  id="pronouns"
                  type="text"
                  value={formData.pronouns}
                  onChange={e => setFormData(prev => ({ ...prev, pronouns: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                  placeholder="e.g., she/her, he/him, they/them"
                />
              </div>

              <div>
                <label htmlFor="age" className="block text-text-secondary text-sm mb-2">
                  Age
                </label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="age"
                    type="number"
                    min="13"
                    max="120"
                    value={formData.age || ''}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        age: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                    placeholder="Your age"
                  />
                </div>
                <p className="text-text-secondary text-xs mt-1">Must be 13 or older</p>
              </div>

              <div>
                <label htmlFor="skill-level" className="block text-text-secondary text-sm mb-2">
                  Skill Level
                </label>
                <select
                  id="skill-level"
                  value={formData.skill_level}
                  onChange={e => setFormData(prev => ({ ...prev, skill_level: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                >
                  <option value="">Select skill level</option>
                  {SKILL_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label} - {level.description}
                    </option>
                  ))}
                </select>
                {formData.skill_level && (
                  <p className="text-text-secondary text-xs mt-1">
                    {SKILL_LEVELS.find(l => l.value === formData.skill_level)?.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-6">Location</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="city" className="block text-text-secondary text-sm mb-2">
                  City
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                    placeholder="e.g., Los Angeles"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-text-secondary text-sm mb-2">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                  placeholder="e.g., California, USA"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-6">Social Links</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="website" className="block text-text-secondary text-sm">
                    Primary Website
                  </label>
                  {isPremium && (
                    <span className="flex items-center gap-1 text-xs text-neon-purple">
                      <FiStar size={12} />
                      Premium
                    </span>
                  )}
                </div>
                <div className="relative">
                  <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              {/* Additional Websites (Premium Feature) */}
              {formData.additional_websites.length > 0 && (
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-text-secondary text-sm">Additional Websites</label>
                  {formData.additional_websites.map((site, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={site.label}
                        onChange={e => updateAdditionalWebsite(index, 'label', e.target.value)}
                        className="w-32 px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors text-sm"
                        placeholder="Label"
                      />
                      <div className="relative flex-1">
                        <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input
                          type="url"
                          value={site.url}
                          onChange={e => updateAdditionalWebsite(index, 'url', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                          placeholder="https://..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAdditionalWebsite(index)}
                        className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors"
                        title="Remove website"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Website Button */}
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={addAdditionalWebsite}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm ${
                    isPremium
                      ? 'bg-neon-purple/10 hover:bg-neon-purple/20 border-neon-purple/30 text-neon-purple'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-secondary'
                  }`}
                >
                  <FiPlus size={16} />
                  {isPremium ? 'Add Another Website' : 'Add More Websites'}
                  {!isPremium && (
                    <span className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-neon-purple/20 rounded-full text-xs text-neon-purple">
                      <FiStar size={10} />
                      Premium
                    </span>
                  )}
                </button>
                {!isPremium && formData.additional_websites.length === 0 && (
                  <p className="text-xs text-text-secondary mt-2">
                    Upgrade to Premium to add multiple website links to your profile
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="instagram" className="block text-text-secondary text-sm mb-2">
                  Instagram
                </label>
                <div className="relative">
                  <FiInstagram className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="instagram"
                    type="text"
                    value={formData.instagram}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        instagram: sanitizeSocialHandle(e.target.value),
                      }))
                    }
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tiktok" className="block text-text-secondary text-sm mb-2">
                  TikTok
                </label>
                <div className="relative">
                  <FaTiktok className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="tiktok"
                    type="text"
                    value={formData.tiktok}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        tiktok: sanitizeSocialHandle(e.target.value),
                      }))
                    }
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="youtube" className="block text-text-secondary text-sm mb-2">
                  YouTube
                </label>
                <div className="relative">
                  <FiYoutube className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="youtube"
                    type="text"
                    value={formData.youtube}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        youtube: sanitizeSocialHandle(e.target.value),
                      }))
                    }
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                    placeholder="@channel"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="twitter" className="block text-text-secondary text-sm mb-2">
                  Twitter
                </label>
                <div className="relative">
                  <FiTwitter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="twitter"
                    type="text"
                    value={formData.twitter}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        twitter: sanitizeSocialHandle(e.target.value),
                      }))
                    }
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dance Styles */}
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-6">Dance Styles</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {DANCE_STYLES.map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => handleDanceStyleToggle(style)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    formData.dance_styles.includes(style)
                      ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                      : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {formData.dance_styles.includes(style) && <FiCheck size={16} />}
                    {style}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Favorite Music */}
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
              <FiMusic className="text-neon-purple" />
              Favorite Music Genres
            </h3>
            <div className="space-y-4">
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={musicInputRef}
                    type="text"
                    value={newMusicTag}
                    onChange={e => {
                      setNewMusicTag(e.target.value)
                      setShowMusicSuggestions(true)
                    }}
                    onFocus={() => setShowMusicSuggestions(true)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addMusicTag())}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:border-neon-purple transition-colors"
                    placeholder="Add a music genre..."
                  />
                  <button
                    type="button"
                    onClick={() => addMusicTag()}
                    className="px-6 py-3 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-lg text-neon-purple transition-all"
                  >
                    Add
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {showMusicSuggestions && filteredMusicSuggestions.length > 0 && (
                  <div
                    ref={musicDropdownRef}
                    className="absolute z-20 w-full mt-2 bg-bg-secondary border border-neon-purple/30 rounded-lg shadow-xl max-h-64 overflow-y-auto"
                  >
                    <div className="p-2">
                      <p className="text-xs text-text-secondary px-2 py-1 mb-1">
                        {newMusicTag ? 'Matching genres' : 'Suggested genres'}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {filteredMusicSuggestions.slice(0, 12).map(genre => (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => addMusicTag(genre)}
                            className="px-3 py-2 text-left text-sm text-text-primary hover:bg-neon-purple/20 rounded-lg transition-colors truncate"
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                      {filteredMusicSuggestions.length > 12 && (
                        <p className="text-xs text-text-secondary px-2 pt-2 border-t border-white/10 mt-2">
                          +{filteredMusicSuggestions.length - 12} more - type to filter
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {formData.favorite_music.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.favorite_music.map(tag => (
                    <div
                      key={tag}
                      className="flex items-center gap-2 px-3 py-1.5 bg-neon-pink/20 border border-neon-pink/30 rounded-full text-neon-pink text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeMusicTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
              <FiLock className="text-neon-purple" />
              Privacy Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    {formData.is_public ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                    <span>Public Profile</span>
                  </div>
                  <p className="text-text-secondary text-sm mt-1">
                    Make your profile visible to everyone
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_public: !prev.is_public }))}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    formData.is_public ? 'bg-neon-purple' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      formData.is_public ? 'translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    <FiMail size={18} />
                    <span>Allow Messages</span>
                  </div>
                  <p className="text-text-secondary text-sm mt-1">
                    Let other users send you messages
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData(prev => ({ ...prev, allow_messages: !prev.allow_messages }))
                  }
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    formData.allow_messages ? 'bg-neon-purple' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      formData.allow_messages ? 'translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    <FiMapPin size={18} />
                    <span>Show Location</span>
                  </div>
                  <p className="text-text-secondary text-sm mt-1">
                    Display your city on your profile
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData(prev => ({ ...prev, show_location: !prev.show_location }))
                  }
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    formData.show_location ? 'bg-neon-purple' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      formData.show_location ? 'translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Username Change Modal */}
        <UsernameChangeModal
          isOpen={showUsernameModal}
          onClose={() => setShowUsernameModal(false)}
          currentUsername={formData.username}
          isMinted={user?.username_minted}
          onSuccess={() => {
            toast.success('Username changed successfully!')
            // Refetch user data
            window.location.reload()
          }}
        />
      </>
    )
  },
)

ProfileEditForm.displayName = 'ProfileEditForm'

export default ProfileEditForm
