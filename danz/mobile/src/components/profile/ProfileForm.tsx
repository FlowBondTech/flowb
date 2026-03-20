import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import type { SkillLevel, User } from '../../generated/graphql'
import { useCheckUsernameQuery } from '../../generated/graphql'

// Extended user type for profile form
type ProfileFormUser = Partial<User> & {
  cover_image_url?: string | null
  website?: string | null
  instagram?: string | null
  tiktok?: string | null
  youtube?: string | null
  twitter?: string | null
  pronouns?: string | null
  invited_by?: string | null
}

import { DANCE_STYLES, EVENT_TYPES, PROFILE_SKILL_LEVELS } from '../../constants/eventConstants'
import { useUploadImage } from '../../hooks/graphql/useUploadQueries'
import { compressImage, formatFileSize } from '../../utils/imageUtils'
import { ImageLoader } from '../ui/ImageLoader'

interface ProfileFormProps {
  initialData?: ProfileFormUser
  onComplete: (userData: ProfileFormUser) => Promise<void>
  onDataChange?: (data: { hasChanges: boolean; data: ProfileFormUser }) => void
  isOnboarding?: boolean
  currentStep?: number
  onStepChange?: (step: number) => void
  isOrganizer?: boolean // Add flag for organizer onboarding
  hideSubmitButton?: boolean // Hide the internal submit button
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initialData = {},
  onComplete,
  onDataChange,
  isOnboarding = false,
  currentStep = 0,
  onStepChange,
  isOrganizer = false,
  hideSubmitButton = false,
}) => {
  const { theme } = useTheme()
  const [step, setStep] = useState(currentStep)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null)
  const [localCoverUri, setLocalCoverUri] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ avatar?: string; cover?: string }>({})
  const [usernameError, setUsernameError] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState(false)
  const [usernameDebounceTimer, setUsernameDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [usernameToCheck, setUsernameToCheck] = useState('')

  // Use GraphQL hooks
  const uploadImageMutation = useUploadImage()
  const { data: usernameCheckData, loading: checkingUsername } = useCheckUsernameQuery({
    variables: { username: usernameToCheck },
    skip: !usernameToCheck || usernameToCheck.length < 3 || !isOnboarding,
  })

  // Helper to remove spaces from social media handles
  const sanitizeSocialHandle = (value: string) => {
    return value.replace(/\s/g, '')
  }

  const [formData, setFormData] = useState<ProfileFormUser>({
    username: initialData.username || '',
    display_name: initialData.display_name ?? '', // Use nullish coalescing to preserve empty string
    bio: initialData.bio || '',
    avatar_url: initialData.avatar_url || '',
    cover_image_url: initialData.cover_image_url || '',
    location: initialData.location || '',
    city: initialData.city || '',
    website: initialData.website || '',
    instagram: initialData.instagram || '',
    tiktok: initialData.tiktok || '',
    youtube: initialData.youtube || '',
    twitter: initialData.twitter || '',
    dance_styles: initialData.dance_styles || [],
    skill_level: initialData.skill_level || (isOnboarding ? ('beginner' as SkillLevel) : undefined),
    pronouns: initialData.pronouns || '',
    // Organizer fields
    company_name: initialData.company_name || '',
    event_types: initialData.event_types || [],
    organizer_bio: initialData.organizer_bio || '',
    invited_by: initialData.invited_by || '',
    website_url: initialData.website_url || '',
    // Don't include role in form data - it should only be set when applying to become organizer
  })

  // Track original data for change detection
  const [originalData] = useState<Partial<User>>({
    username: initialData.username || '',
    display_name: initialData.display_name ?? '',
    bio: initialData.bio || '',
    avatar_url: initialData.avatar_url || '',
    cover_image_url: initialData.cover_image_url || '',
    location: initialData.location || '',
    city: initialData.city || '',
    website: initialData.website || '',
    instagram: initialData.instagram || '',
    tiktok: initialData.tiktok || '',
    youtube: initialData.youtube || '',
    twitter: initialData.twitter || '',
    dance_styles: initialData.dance_styles || [],
    skill_level: initialData.skill_level || null,
    pronouns: initialData.pronouns || '',
    company_name: initialData.company_name || '',
    event_types: initialData.event_types || [],
    organizer_bio: initialData.organizer_bio || '',
    invited_by: initialData.invited_by || '',
    website_url: initialData.website_url || '',
  })

  useEffect(() => {
    if (onStepChange) {
      onStepChange(step)
    }
  }, [step, onStepChange])

  // Check for changes and notify parent
  useEffect(() => {
    if (!onDataChange) return

    const hasChanges =
      formData.username !== originalData.username ||
      formData.display_name !== originalData.display_name ||
      formData.bio !== originalData.bio ||
      formData.avatar_url !== originalData.avatar_url ||
      formData.cover_image_url !== originalData.cover_image_url ||
      formData.location !== originalData.location ||
      formData.city !== originalData.city ||
      formData.website !== originalData.website ||
      formData.instagram !== originalData.instagram ||
      formData.tiktok !== originalData.tiktok ||
      formData.youtube !== originalData.youtube ||
      formData.twitter !== originalData.twitter ||
      JSON.stringify(formData.dance_styles) !== JSON.stringify(originalData.dance_styles) ||
      formData.skill_level !== originalData.skill_level ||
      formData.pronouns !== originalData.pronouns ||
      localAvatarUri !== null ||
      localCoverUri !== null

    onDataChange({ hasChanges, data: formData })
  }, [
    formData.username,
    formData.display_name,
    formData.bio,
    formData.avatar_url,
    formData.cover_image_url,
    formData.location,
    formData.city,
    formData.website,
    formData.instagram,
    formData.tiktok,
    formData.youtube,
    formData.twitter,
    formData.dance_styles,
    formData.skill_level,
    formData.pronouns,
    localAvatarUri,
    localCoverUri,
    // Don't include formData object itself or onDataChange to avoid infinite loops
  ])

  // Update form data when initialData changes (e.g., when user data loads)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        username: initialData.username || '',
        display_name: initialData.display_name ?? '',
        bio: initialData.bio || '',
        avatar_url: initialData.avatar_url || '',
        cover_image_url: initialData.cover_image_url || '',
        location: initialData.location || '',
        city: initialData.city || '',
        website: initialData.website || '',
        instagram: initialData.instagram || '',
        tiktok: initialData.tiktok || '',
        youtube: initialData.youtube || '',
        twitter: initialData.twitter || '',
        dance_styles: initialData.dance_styles || [],
        skill_level:
          initialData.skill_level || (isOnboarding ? ('beginner' as SkillLevel) : undefined),
        pronouns: initialData.pronouns || '',
        // Organizer fields - preserve these if isOrganizer is true
        company_name: initialData.company_name || '',
        event_types: initialData.event_types || [],
        organizer_bio: initialData.organizer_bio || '',
        invited_by: initialData.invited_by || '',
        website_url: initialData.website_url || '',
        // Don't include role in form data - it should only be set when applying to become organizer
      })

      // If in edit mode and images exist, set them to show preview
      if (!isOnboarding) {
        if (initialData.avatar_url) {
          setLocalAvatarUri(null) // Clear local URI to show actual uploaded image
        }
        if (initialData.cover_image_url) {
          setLocalCoverUri(null) // Clear local URI to show actual uploaded image
        }
      }
    }
  }, [initialData, isOnboarding])

  const pickImage = async (type: 'avatar' | 'cover' = 'avatar') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 1, // Get original quality, we'll compress later
      base64: false,
      exif: false,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]

      // Show local preview immediately
      if (type === 'avatar') {
        setLocalAvatarUri(asset.uri)
      } else {
        setLocalCoverUri(asset.uri)
      }

      setUploadingImage(true)
      setUploadProgress({ ...uploadProgress, [type]: 'Compressing...' })

      try {
        // Compress the image to ~1MB
        const compressed = await compressImage(asset, type)
        console.log(
          `Compressed ${type} from ${formatFileSize(asset.width * asset.height * 4)} to ~${formatFileSize(compressed.fileSize || 0)}`,
        )

        setUploadProgress({ ...uploadProgress, [type]: 'Uploading...' })

        // Create a new asset object with compressed URI
        const compressedAsset = {
          ...asset,
          uri: compressed.uri,
          width: compressed.width,
          height: compressed.height,
          type: 'image/jpeg', // Ensure proper MIME type
          name: `${type}-${Date.now()}.jpg`, // Add proper filename
        }

        // Upload the compressed image
        const uploadResult = await uploadImageMutation.mutateAsync({ file: compressedAsset, type })

        // Update form data with uploaded URL
        if (type === 'avatar') {
          setFormData((prev: ProfileFormUser) => ({ ...prev, avatar_url: uploadResult.url }))
          // Keep local preview until we confirm upload
        } else {
          setFormData((prev: ProfileFormUser) => ({ ...prev, cover_image_url: uploadResult.url }))
        }

        setUploadProgress({ ...uploadProgress, [type]: undefined })
      } catch (error) {
        // On error, remove local preview
        if (type === 'avatar') {
          setLocalAvatarUri(null)
        } else {
          setLocalCoverUri(null)
        }
        setUploadProgress({ ...uploadProgress, [type]: undefined })
        Alert.alert('Error', 'Failed to upload image. Please try again.')
        console.error('Upload error:', error)
      } finally {
        setUploadingImage(false)
      }
    }
  }

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
      setUsernameError('Username can only contain lowercase letters, numbers, and underscores')
      setUsernameAvailable(false)
      return false
    }

    return true
  }

  // Update availability status when check completes
  useEffect(() => {
    if (usernameCheckData && usernameToCheck === formData.username) {
      if (usernameCheckData.checkUsername) {
        setUsernameError('')
        setUsernameAvailable(true)
      } else {
        setUsernameError('Username is already taken')
        setUsernameAvailable(false)
      }
    }
  }, [usernameCheckData, usernameToCheck, formData.username])

  const handleNext = async () => {
    if (isOnboarding && step === 0) {
      // Validate username on first step of onboarding
      if (!formData.username || formData.username.length < 3) {
        setUsernameError('Username must be at least 3 characters')
        return
      }
      if (!usernameAvailable && !checkingUsername && usernameToCheck !== formData.username) {
        // Trigger a check if not already checked
        setUsernameToCheck(formData.username)
        return // Wait for the check to complete
      }
      if (!usernameAvailable) {
        return // Don't proceed if username is not available
      }
    }

    // Validate skill level is selected on styles step
    if (isOnboarding && step === 3 && !formData.skill_level) {
      Alert.alert('Skill Level Required', 'Please select your dance skill level')
      return
    }

    // Validate organizer fields if on organizer step
    if (isOrganizer && step === 5) {
      if (!formData.company_name?.trim()) {
        Alert.alert('Required Field', 'Please enter your company or organization name')
        return
      }
      if (!formData.event_types || formData.event_types.length === 0) {
        Alert.alert('Required Field', 'Please select at least one type of event you organize')
        return
      }
      if (!formData.organizer_bio?.trim()) {
        Alert.alert('Required Field', 'Please tell us about your events')
        return
      }
    }

    if (step < getSteps().length - 1) {
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (isOnboarding && !formData.username) {
      Alert.alert('Error', 'Username is required')
      return
    }

    // Ensure skill level is set
    if (!formData.skill_level) {
      Alert.alert('Error', 'Please select your skill level')
      return
    }

    setLoading(true)
    try {
      // The backend will automatically set role to 'organizer' when company_name is provided
      await onComplete(formData)

      // Show success message for organizer applications
      if (isOrganizer && isOnboarding) {
        Alert.alert(
          'Application Submitted',
          "Thank you for applying to become an organizer! Your application will be reviewed within 24-48 hours. You'll receive a notification once approved.",
          [{ text: 'OK' }],
        )
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.')
      console.error('Save error:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDanceStyle = (style: string) => {
    const currentStyles = formData.dance_styles || []
    if (currentStyles.includes(style)) {
      setFormData((prev: ProfileFormUser) => ({
        ...prev,
        dance_styles: currentStyles.filter((s: string) => s !== style),
      }))
    } else {
      setFormData((prev: ProfileFormUser) => ({
        ...prev,
        dance_styles: [...currentStyles, style],
      }))
    }
  }

  const getSteps = () => {
    if (isOnboarding) {
      const steps = [
        { title: 'Create Your Username', key: 'username' },
        { title: 'Add Your Photo', key: 'photo' },
        { title: 'Tell Us About You', key: 'about' },
        { title: 'Dance Styles', key: 'styles' },
        { title: 'Connect Social', key: 'social' },
      ]

      // Add organizer step if user is becoming an organizer
      if (isOrganizer) {
        steps.push({ title: 'Organizer Details', key: 'organizer' })
      }

      return steps
    }
    return [{ title: 'Profile Information', key: 'all' }]
  }

  const renderStepContent = () => {
    const steps = getSteps()
    const currentStepData = steps[step]

    if (!isOnboarding) {
      // Edit mode - show all fields in scrollable form
      return renderAllFields()
    }

    // Onboarding mode - show step by step
    switch (currentStepData.key) {
      case 'username':
        return renderUsernameStep()
      case 'photo':
        return renderPhotoStep()
      case 'about':
        return renderAboutStep()
      case 'styles':
        return renderStylesStep()
      case 'social':
        return renderSocialStep()
      case 'organizer':
        return renderOrganizerStep()
      default:
        return null
    }
  }

  const usernameInputRef = React.useRef<TextInput>(null)

  const handleUsernameChange = (text: string) => {
    // Force lowercase and remove spaces
    const formattedUsername = text.toLowerCase().replace(/\s/g, '')
    setFormData((prev: ProfileFormUser) => ({ ...prev, username: formattedUsername }))
    setUsernameError('')
    setUsernameAvailable(false)

    // Only check availability in onboarding mode
    if (isOnboarding && formattedUsername) {
      // Clear existing timer
      if (usernameDebounceTimer) {
        clearTimeout(usernameDebounceTimer)
      }

      // Set new timer for debounced check
      const timer = setTimeout(() => {
        if (validateUsernameFormat(formattedUsername)) {
          setUsernameToCheck(formattedUsername)
        }
      }, 800) // Check after 800ms of no typing (increased from 500)
      setUsernameDebounceTimer(timer)
    }
  }

  const renderUsernameStep = () => {
    const isEditMode = !isOnboarding
    const hasExistingUsername = initialData.username && initialData.username.length > 0
    const shouldDisableUsername = isEditMode && hasExistingUsername

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          {isOnboarding ? 'Choose your username' : 'Username'}
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          {isOnboarding
            ? 'This can only be set once, choose wisely!'
            : shouldDisableUsername
              ? "Username cannot be changed after it's set"
              : 'Set your username (can only be done once)'}
        </Text>

        <View style={styles.inputGroup}>
          <View
            style={[
              styles.inputWrapper,
              usernameError ? styles.inputError : null,
              usernameAvailable ? styles.inputSuccess : null,
              shouldDisableUsername ? styles.inputDisabled : null,
            ]}
          >
            <Text style={[styles.inputPrefix, { color: theme.colors.textSecondary }]}>@</Text>
            <TextInput
              ref={usernameInputRef}
              style={[styles.input, { color: theme.colors.text }]}
              value={formData.username || ''}
              onChangeText={shouldDisableUsername ? undefined : handleUsernameChange}
              placeholder="username"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={isOnboarding && step === 0}
              editable={!shouldDisableUsername}
            />
            {isOnboarding && checkingUsername && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
            {isOnboarding && !checkingUsername && usernameAvailable && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
          </View>
          {isOnboarding && usernameError ? (
            <View style={styles.feedbackContainer}>
              <Ionicons name="close-circle" size={16} color="#FF6B6B" />
              <Text style={[styles.errorText, { color: '#FF6B6B', marginLeft: 4 }]}>
                {usernameError}
              </Text>
            </View>
          ) : isOnboarding && usernameAvailable ? (
            <View style={styles.feedbackContainer}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={[styles.successText, { color: '#4CAF50', marginLeft: 4 }]}>
                Username is available!
              </Text>
            </View>
          ) : isOnboarding &&
            formData.username &&
            formData.username.length >= 3 &&
            !checkingUsername ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                Checking availability...
              </Text>
            </View>
          ) : isOnboarding &&
            formData.username &&
            formData.username.length > 0 &&
            formData.username.length < 3 ? (
            <View style={styles.feedbackContainer}>
              <Ionicons name="information-circle" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary, marginLeft: 4 }]}>
                Username must be at least 3 characters
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Display Name</Text>
          <TextInput
            style={[
              styles.textInput,
              { color: theme.colors.text, backgroundColor: theme.colors.surface },
            ]}
            value={formData.display_name || ''}
            onChangeText={text =>
              setFormData((prev: ProfileFormUser) => ({ ...prev, display_name: text }))
            }
            placeholder="How should we call you?"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      </View>
    )
  }

  const renderPhotoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        {isOnboarding ? 'Add your photos' : 'Profile Photos'}
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Let the community see your amazing moves
      </Text>

      <View style={styles.profilePreviewContainer}>
        {/* Cover Image - Full Width */}
        <TouchableOpacity
          style={styles.coverPhotoWrapper}
          onPress={() => pickImage('cover')}
          disabled={uploadingImage}
          activeOpacity={0.9}
        >
          {localCoverUri || formData.cover_image_url ? (
            <View style={styles.coverImageWrapper}>
              <ImageLoader
                source={{ uri: localCoverUri || formData.cover_image_url || '' }}
                style={styles.coverPhotoFullWidth}
                placeholderColor={theme.colors.surface}
              />
              {uploadProgress.cover ? (
                <View style={[styles.uploadOverlay, styles.coverUploadOverlayFullWidth]}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.uploadText}>{uploadProgress.cover}</Text>
                </View>
              ) : (
                <View style={[styles.imageEditOverlay, styles.coverUploadOverlayFullWidth]}>
                  <Ionicons name="camera" size={30} color="#fff" />
                  <Text style={styles.imageEditText}>Change Cover</Text>
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.coverPhotoPlaceholderFullWidth,
                { backgroundColor: theme.colors.surface, paddingBottom: 40 },
              ]}
            >
              <Ionicons name="image-outline" size={50} color={theme.colors.textSecondary} />
              <Text style={[styles.photoText, { color: theme.colors.textSecondary, fontSize: 16 }]}>
                Add cover image
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Profile Photo - Overlapping at bottom center */}
        <TouchableOpacity
          style={styles.profilePhotoOverlay}
          onPress={() => pickImage('avatar')}
          disabled={uploadingImage}
        >
          {localAvatarUri || formData.avatar_url ? (
            <View style={styles.imageContainer}>
              <ImageLoader
                source={{ uri: localAvatarUri || formData.avatar_url || '' }}
                style={styles.profilePhotoLarge}
                placeholderColor={theme.colors.surface}
              />
              {uploadProgress.avatar ? (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.uploadText}>{uploadProgress.avatar}</Text>
                </View>
              ) : (
                <View style={styles.imageEditOverlay}>
                  <Ionicons name="camera" size={24} color="#fff" />
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.profilePhotoPlaceholderLarge,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Ionicons name="camera" size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.photoText, { color: theme.colors.textSecondary, fontSize: 12 }]}>
                Add photo
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderAboutStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Tell us about yourself</Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Help the community get to know you
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Bio</Text>
        <TextInput
          style={[
            styles.textArea,
            { color: theme.colors.text, backgroundColor: theme.colors.surface },
          ]}
          value={formData.bio || ''}
          onChangeText={text => setFormData((prev: ProfileFormUser) => ({ ...prev, bio: text }))}
          placeholder="Share your dance journey..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={4}
          maxLength={200}
        />
        <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
          {formData.bio?.length || 0}/200
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Location</Text>
        <TextInput
          style={[
            styles.textInput,
            { color: theme.colors.text, backgroundColor: theme.colors.surface },
          ]}
          value={formData.city || ''}
          onChangeText={text => setFormData((prev: ProfileFormUser) => ({ ...prev, city: text }))}
          placeholder="City, Country"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Pronouns</Text>
        <TextInput
          style={[
            styles.textInput,
            { color: theme.colors.text, backgroundColor: theme.colors.surface },
          ]}
          value={formData.pronouns || ''}
          onChangeText={text =>
            setFormData((prev: ProfileFormUser) => ({ ...prev, pronouns: text.toLowerCase() }))
          }
          placeholder="he/him, she/her, they/them"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  )

  const renderStylesStep = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Your dance styles</Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Select all that apply
        </Text>

        <View style={styles.tagsContainer}>
          {DANCE_STYLES.map(style => (
            <TouchableOpacity
              key={style}
              style={[
                styles.tag,
                { backgroundColor: theme.colors.surface },
                formData.dance_styles?.includes(style) && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => toggleDanceStyle(style)}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: theme.colors.text },
                  formData.dance_styles?.includes(style) && { color: '#fff' },
                ]}
              >
                {style}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Skill Level <Text style={{ color: theme.colors.primary }}>*</Text>
          </Text>
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            {!formData.skill_level
              ? 'Please select your skill level'
              : `Selected: ${formData.skill_level}`}
          </Text>
          <View style={styles.skillLevels}>
            {PROFILE_SKILL_LEVELS.map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.skillLevel,
                  { backgroundColor: theme.colors.surface },
                  formData.skill_level === level && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() =>
                  setFormData((prev: ProfileFormUser) => ({
                    ...prev,
                    skill_level: level as SkillLevel,
                  }))
                }
              >
                <Text
                  style={[
                    styles.skillLevelText,
                    { color: theme.colors.text },
                    formData.skill_level === level && { color: '#fff' },
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  )

  const toggleEventType = (eventType: string) => {
    const currentTypes = formData.event_types || []
    if (currentTypes.includes(eventType)) {
      setFormData((prev: ProfileFormUser) => ({
        ...prev,
        event_types: currentTypes.filter((t: string) => t !== eventType),
      }))
    } else {
      setFormData((prev: ProfileFormUser) => ({
        ...prev,
        event_types: [...currentTypes, eventType],
      }))
    }
  }

  const renderOrganizerStep = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Organizer Information</Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Tell us about your events and organization
        </Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Company/Organization Name <Text style={{ color: theme.colors.primary }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { color: theme.colors.text, backgroundColor: theme.colors.surface },
            ]}
            value={formData.company_name || ''}
            onChangeText={text =>
              setFormData((prev: ProfileFormUser) => ({ ...prev, company_name: text }))
            }
            placeholder="Enter your company or organization name"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Event Types <Text style={{ color: theme.colors.primary }}>*</Text>
          </Text>
          <Text
            style={[styles.helperText, { color: theme.colors.textSecondary, marginBottom: 10 }]}
          >
            Select the types of events you organize
          </Text>
          <View style={styles.tagsContainer}>
            {EVENT_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.tag,
                  { backgroundColor: theme.colors.surface },
                  formData.event_types?.includes(type) && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => toggleEventType(type)}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: theme.colors.text },
                    formData.event_types?.includes(type) && { color: '#fff' },
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Tell us about your events <Text style={{ color: theme.colors.primary }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textArea,
              { color: theme.colors.text, backgroundColor: theme.colors.surface },
            ]}
            value={formData.organizer_bio || ''}
            onChangeText={text =>
              setFormData((prev: ProfileFormUser) => ({ ...prev, organizer_bio: text }))
            }
            placeholder="Describe your events, experience, and what makes them special..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
            {formData.organizer_bio?.length || 0}/500
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Who invited you? (optional)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { color: theme.colors.text, backgroundColor: theme.colors.surface },
            ]}
            value={formData.invited_by || ''}
            onChangeText={text =>
              setFormData((prev: ProfileFormUser) => ({ ...prev, invited_by: text }))
            }
            placeholder="Name of person or organization"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Website (optional)</Text>
          <TextInput
            style={[
              styles.textInput,
              { color: theme.colors.text, backgroundColor: theme.colors.surface },
            ]}
            value={formData.website_url || ''}
            onChangeText={text =>
              setFormData((prev: ProfileFormUser) => ({ ...prev, website_url: text }))
            }
            placeholder="https://www.example.com"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>
      </View>
    </ScrollView>
  )

  const renderSocialStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Connect your socials</Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Optional - share your other platforms
      </Text>

      {[
        { key: 'instagram', icon: 'logo-instagram', placeholder: 'Instagram username' },
        { key: 'tiktok', icon: 'logo-tiktok', placeholder: 'TikTok username' },
        { key: 'youtube', icon: 'logo-youtube', placeholder: 'YouTube channel' },
        { key: 'twitter', icon: 'logo-twitter', placeholder: 'Twitter handle' },
      ].map(social => (
        <View key={social.key} style={styles.inputGroup}>
          <View style={styles.socialInput}>
            <Ionicons name={social.icon as any} size={24} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.socialTextInput, { color: theme.colors.text }]}
              value={formData[social.key as keyof User] as string}
              onChangeText={text =>
                setFormData((prev: ProfileFormUser) => ({
                  ...prev,
                  [social.key]: sanitizeSocialHandle(text),
                }))
              }
              placeholder={social.placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      ))}
    </View>
  )

  const renderAllFields = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {renderPhotoStep()}
      <View style={styles.divider} />
      {renderUsernameStep()}
      <View style={styles.divider} />
      {renderAboutStep()}
      <View style={styles.divider} />
      {renderStylesStep()}
      <View style={styles.divider} />
      {renderSocialStep()}
    </ScrollView>
  )

  const steps = getSteps()
  const isLastStep = step === steps.length - 1

  // Check if organizer required fields are filled
  const isOrganizerFieldsValid = () => {
    if (!isOrganizer) return true
    return !!(
      formData.company_name?.trim() &&
      formData.event_types &&
      formData.event_types.length > 0 &&
      formData.organizer_bio?.trim()
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {isOnboarding && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressStep,
                  { backgroundColor: theme.colors.surface },
                  index <= step && { backgroundColor: theme.colors.primary },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            Step {step + 1} of {steps.length}
          </Text>
        </View>
      )}

      {renderStepContent()}

      {!hideSubmitButton && (
        <View style={styles.buttonContainer}>
          {isOnboarding && step > 0 && (
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
              onPress={handleBack}
            >
              <Text style={[styles.backButtonText, { color: theme.colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: theme.colors.primary },
              (!isOnboarding || step > 0) && styles.flexButton,
              ((isOnboarding &&
                step === 0 &&
                (!formData.username ||
                  !!usernameError ||
                  checkingUsername ||
                  (!usernameAvailable && formData.username.length >= 3))) ||
                uploadingImage ||
                (!isOnboarding && !formData.skill_level) ||
                (isLastStep && !isOrganizerFieldsValid())) &&
                styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={
              loading ||
              uploadingImage ||
              (!isOnboarding && !formData.skill_level) || // Disable in edit mode if no skill level
              (isOnboarding &&
                step === 0 &&
                (!formData.username ||
                  !!usernameError ||
                  checkingUsername ||
                  (!usernameAvailable && formData.username.length >= 3))) ||
              (isLastStep && !isOrganizerFieldsValid())
            }
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.nextButtonText,
                  ((isOnboarding &&
                    step === 0 &&
                    (!formData.username ||
                      !!usernameError ||
                      checkingUsername ||
                      (!usernameAvailable && formData.username.length >= 3))) ||
                    (isLastStep && !isOrganizerFieldsValid())) &&
                    styles.buttonTextDisabled,
                ]}
              >
                {isLastStep ? (isOnboarding ? "Let's Dance!" : 'Save Profile') : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollView: {
    flex: 1,
  },
  progressContainer: {
    padding: 20,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    width: '100%',
    height: 4,
    marginBottom: 12,
  },
  progressStep: {
    flex: 1,
    height: '100%',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputSuccess: {
    borderColor: '#4CAF50',
  },
  inputDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    opacity: 0.7,
  },
  inputPrefix: {
    fontSize: 18,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    marginTop: 4,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  // Profile preview layout styles for onboarding
  profilePreviewContainer: {
    marginTop: 30,
    marginBottom: 20,
    marginHorizontal: -20, // Negative margin to make full width
    position: 'relative',
  },
  coverPhotoWrapper: {
    width: '100%',
    height: 200,
  },
  coverImageWrapper: {
    width: '100%',
    height: '100%',
  },
  coverPhotoFullWidth: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholderFullWidth: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverUploadOverlayFullWidth: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  profilePhotoOverlay: {
    position: 'absolute',
    bottom: -50,
    left: '50%',
    marginLeft: -60, // Half of photo width
    zIndex: 10,
  },
  profilePhotoLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#1a0033',
  },
  profilePhotoPlaceholderLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#1a0033',
  },
  // Legacy styles for edit mode
  photosContainer: {
    marginVertical: 20,
    gap: 30,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  photoContainer: {
    alignSelf: 'center',
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageContainer: {
    alignItems: 'center',
  },
  coverPhotoContainer: {
    alignSelf: 'center',
  },
  coverPhoto: {
    width: 300,
    height: 169,
    borderRadius: 12,
  },
  coverPhotoPlaceholder: {
    width: 300,
    height: 169,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderStyle: 'dashed',
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
  },
  imageContainer: {
    position: 'relative',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverUploadOverlay: {
    borderRadius: 12,
  },
  uploadText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  imageEditOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  imageEditText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  skipText: {
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 4,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skillLevels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillLevel: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    margin: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  skillLevelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  socialInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  socialTextInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 20,
    marginTop: 'auto',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  flexButton: {
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
    opacity: 0.6,
  },
  buttonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: 20,
  },
})
