import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { AddressAutocomplete, type PlaceDetails } from '../components/AddressAutocomplete'
import { ImageLoader } from '../components/ui/ImageLoader'
import {
  DANCE_STYLES,
  EVENT_CATEGORIES_DISPLAY,
  SKILL_LEVELS_DISPLAY,
} from '../constants/eventConstants'
import { useAuth } from '../contexts/AuthContext'
import {
  type CreateEventInput,
  EventCategory,
  RecurrenceType,
  SkillLevel,
  useCreateEventMutation,
} from '../generated/graphql'
import { useUploadImage } from '../hooks/graphql/useUploadQueries'
import { designSystem } from '../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../styles/responsive'
import { compressImage, formatFileSize } from '../utils/imageUtils'
import { getCoverUrl } from '../utils/supabaseTransforms'

// Map string keys to EventCategory enum values
const categoryMap: Record<string, EventCategory> = {
  class: EventCategory.Class,
  social: EventCategory.Other, // No 'social' in enum, using Other
  workshop: EventCategory.Other, // No 'workshop' in enum, using Other
  performance: EventCategory.Other, // No 'performance' in enum, using Other
  battle: EventCategory.Battle,
  cultural: EventCategory.Cultural,
  fitness: EventCategory.Fitness,
  other: EventCategory.Other,
}

// Map string keys to SkillLevel enum values
const skillLevelMap: Record<string, SkillLevel> = {
  all: SkillLevel.All,
  beginner: SkillLevel.Beginner,
  intermediate: SkillLevel.Intermediate,
  advanced: SkillLevel.Advanced,
}

// Weekdays for recurring event selection
const WEEKDAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
]

// Recurrence type options
const RECURRENCE_OPTIONS = [
  { value: RecurrenceType.Weekly, label: 'Weekly' },
  { value: RecurrenceType.Biweekly, label: 'Bi-weekly' },
  { value: RecurrenceType.Monthly, label: 'Monthly' },
]

export const CreateEventScreen: React.FC = () => {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const [createEvent] = useCreateEventMutation({
    onCompleted: () => {
      Toast.show({
        type: 'success',
        text1: 'Event Created',
        text2: 'Your event has been created successfully',
      })
    },
    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Failed to create event',
        text2: error.message || 'Something went wrong',
      })
    },
  })
  const uploadImageMutation = useUploadImage()

  // Check if user has permission - include approved organizers
  const canCreateEvents =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    (user?.role === 'organizer' && user?.is_organizer_approved === true)

  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [showStartDateTimePicker, setShowStartDateTimePicker] = useState(false)
  const [showEndDateTimePicker, setShowEndDateTimePicker] = useState(false)

  // Temporary date/time values for confirmation
  const [tempStartDateTime, setTempStartDateTime] = useState(new Date())
  const [tempEndDateTime, setTempEndDateTime] = useState(new Date())

  // Local state for form data - updated for datetime support
  const [eventData, setEventData] = useState<{
    title: string
    description: string
    category: EventCategory
    skill_level: SkillLevel
    dance_styles: string[]
    start_date_time: Date // Combined date and time
    end_date_time: Date // Combined date and time
    location_name: string
    location_address: string
    location_city: string
    location_latitude?: number
    location_longitude?: number
    is_virtual: boolean
    virtual_link: string
    max_capacity: number
    price_usd: number
    currency: string
    image_url: string
    tags: string[]
    requirements: string
    uploadingImage: boolean
    is_recurring: boolean
    recurrence_type: RecurrenceType
    recurrence_end_date: Date | null
    recurrence_days: string[]
    recurrence_count: number | null
  }>(() => {
    const startDateTime = new Date()
    const endDateTime = new Date()

    // Set default start time to next hour
    startDateTime.setHours(startDateTime.getHours() + 1, 0, 0, 0)

    // Set default end time to 1 hour after start time
    endDateTime.setTime(startDateTime.getTime() + 60 * 60 * 1000)

    return {
      title: '',
      description: '',
      category: EventCategory.Class,
      skill_level: SkillLevel.All,
      dance_styles: [],
      start_date_time: startDateTime,
      end_date_time: endDateTime,
      location_name: '',
      location_address: '',
      location_city: '',
      is_virtual: false,
      virtual_link: '',
      max_capacity: 50,
      price_usd: 0,
      currency: 'USD',
      image_url: '',
      tags: [],
      requirements: '',
      uploadingImage: false,
      is_recurring: false,
      recurrence_type: RecurrenceType.Weekly,
      recurrence_end_date: null,
      recurrence_days: [],
      recurrence_count: null,
    }
  })

  // State for recurrence end date picker
  const [showRecurrenceEndDatePicker, setShowRecurrenceEndDatePicker] = useState(false)
  const [tempRecurrenceEndDate, setTempRecurrenceEndDate] = useState(new Date())

  const [localImageUri, setLocalImageUri] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | undefined>(undefined)

  React.useEffect(() => {
    if (!canCreateEvents) {
      let message = `You need permission to create events. Your current role is: ${user?.role || 'user'}.`

      if (user?.role === 'organizer' && !user?.is_organizer_approved) {
        message =
          'Your organizer application is pending approval. Once approved, you will be able to create events.'
      } else if (user?.role === 'user') {
        message = 'To create events, you need to become an organizer. Go to your profile to apply.'
      }

      Alert.alert('Permission Required', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    }
  }, [canCreateEvents, navigation, user?.role, user?.is_organizer_approved])

  const categories = Object.entries(EVENT_CATEGORIES_DISPLAY).map(([id, data]) => ({
    id,
    title: data.name,
    emoji: data.emoji,
  }))

  const skillLevels = Object.entries(SKILL_LEVELS_DISPLAY).map(([id, title]) => ({
    id,
    title,
    color:
      id === 'all'
        ? designSystem.colors.primary
        : id === 'beginner'
          ? designSystem.colors.success
          : id === 'intermediate'
            ? designSystem.colors.accentYellow
            : id === 'advanced'
              ? designSystem.colors.error
              : designSystem.colors.primary,
  }))

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1, // Get original quality, we'll compress later
      base64: false,
      exif: false,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]

      // Show local preview immediately
      setLocalImageUri(asset.uri)

      // Show uploading state
      setEventData(prev => ({ ...prev, uploadingImage: true }))
      setUploadProgress('Compressing...')

      try {
        // Compress the image to ~1MB
        const compressed = await compressImage(asset, 'cover')
        console.log(
          `Compressed event image from ${formatFileSize(asset.width * asset.height * 4)} to ~${formatFileSize(compressed.fileSize || 0)}`,
        )

        setUploadProgress('Uploading...')

        // Create a new asset object with compressed URI
        const compressedAsset = {
          ...asset,
          uri: compressed.uri,
          width: compressed.width,
          height: compressed.height,
          type: 'image/jpeg', // Ensure proper MIME type
          name: `event-${Date.now()}.jpg`, // Add proper filename
        }

        // Upload the compressed image
        const response = await uploadImageMutation.mutateAsync({
          file: compressedAsset,
          type: 'event',
        })

        setEventData(prev => ({
          ...prev,
          image_url: response.url,
          uploadingImage: false,
        }))

        setUploadProgress(undefined)
        // Keep local preview to show the uploaded image
        // setLocalImageUri(null)

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch (error) {
        console.error('Error uploading image:', error)
        Alert.alert('Error', 'Failed to upload image. Please try again.')

        // Remove local preview on error
        setLocalImageUri(null)
        setEventData(prev => ({ ...prev, uploadingImage: false }))
        setUploadProgress(undefined)

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!eventData.title.trim()) {
          Alert.alert('Required', 'Please enter an event title')
          return false
        }
        if (!eventData.category) {
          Alert.alert('Required', 'Please select a category')
          return false
        }
        return true

      case 2:
        if (!eventData.is_virtual && !eventData.location_name.trim()) {
          Alert.alert('Required', 'Please enter a location name')
          return false
        }
        // Allow proceeding if we have coordinates, even without city name
        if (!eventData.is_virtual && !eventData.location_address.trim()) {
          Alert.alert('Required', 'Please select a location address')
          return false
        }
        if (eventData.is_virtual && !eventData.virtual_link.trim()) {
          Alert.alert('Required', 'Please enter a virtual event link')
          return false
        }
        return true

      case 3:
        // Date and time are always set
        return true

      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentStep(currentStep - 1)
  }

  const handleCreateEvent = async () => {
    if (!validateStep(currentStep)) return

    setLoading(true)

    try {
      // Format the data for backend - using ISO 8601 datetime format
      const formattedData: CreateEventInput = {
        title: eventData.title,
        description: eventData.description || undefined,
        category: eventData.category,
        skill_level: eventData.skill_level,
        dance_styles: eventData.dance_styles.length > 0 ? eventData.dance_styles : undefined,
        start_date_time: eventData.start_date_time.toISOString(),
        end_date_time: eventData.end_date_time.toISOString(),
        location_name: eventData.location_name,
        location_address: eventData.location_address || undefined,
        location_city: eventData.location_city || undefined,
        location_latitude: eventData.location_latitude || undefined,
        location_longitude: eventData.location_longitude || undefined,
        is_virtual: eventData.is_virtual,
        virtual_link: eventData.is_virtual ? eventData.virtual_link : undefined,
        max_capacity: eventData.max_capacity,
        price_usd: eventData.price_usd || undefined,
        currency: eventData.currency,
        image_url: eventData.image_url || undefined,
        tags: eventData.tags.length > 0 ? eventData.tags : undefined,
        requirements: eventData.requirements || undefined,
        is_recurring: eventData.is_recurring || undefined,
        recurrence_type: eventData.is_recurring ? eventData.recurrence_type : undefined,
        recurrence_end_date:
          eventData.is_recurring && eventData.recurrence_end_date
            ? eventData.recurrence_end_date.toISOString()
            : undefined,
        recurrence_days:
          eventData.is_recurring && eventData.recurrence_days.length > 0
            ? eventData.recurrence_days
            : undefined,
        recurrence_count:
          eventData.is_recurring && eventData.recurrence_count
            ? eventData.recurrence_count
            : undefined,
      }

      console.log('formatttedData event', formattedData)

      const response = await createEvent({ variables: { input: formattedData } })

      console.log('response createEvent', response?.data)
      const eventId = response.data?.createEvent?.id

      if (!eventId) {
        throw new Error('Event created but no ID returned')
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Navigate to the event details page
      // Using reset to ensure the Events tab refreshes when user goes back
      setTimeout(() => {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'TabNavigator', params: { screen: 'Events' } },
            { name: 'EventDetails', params: { eventId } },
          ],
        })
      }, 500)
    } catch (error: any) {
      console.error('Error creating event:', error)
      console.error('Error details:', error.response || error.message)

      // More detailed error message
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create event'
      Alert.alert('Error', `Failed to create event: ${errorMessage}`)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Basic Information</Text>

            <Text style={styles.label}>Event Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Sunset Salsa Session"
              placeholderTextColor={designSystem.colors.textSecondary}
              value={eventData.title}
              onChangeText={text => setEventData({ ...eventData, title: text })}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your event..."
              placeholderTextColor={designSystem.colors.textSecondary}
              value={eventData.description}
              onChangeText={text => setEventData({ ...eventData, description: text })}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    eventData.category === (categoryMap[cat.id] || EventCategory.Other) &&
                      styles.selectedOption,
                  ]}
                  onPress={() =>
                    setEventData({
                      ...eventData,
                      category: categoryMap[cat.id] || EventCategory.Other,
                    })
                  }
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryText,
                      eventData.category === (categoryMap[cat.id] || EventCategory.Other) &&
                        styles.selectedText,
                    ]}
                  >
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Skill Level</Text>
            <View style={styles.skillLevelRow}>
              {skillLevels.map(level => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.skillOption,
                    eventData.skill_level === (skillLevelMap[level.id] || SkillLevel.All) && {
                      backgroundColor: `${level.color}20`,
                    },
                  ]}
                  onPress={() =>
                    setEventData({
                      ...eventData,
                      skill_level: skillLevelMap[level.id] || SkillLevel.All,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.skillText,
                      eventData.skill_level === (skillLevelMap[level.id] || SkillLevel.All) && {
                        color: level.color,
                      },
                    ]}
                  >
                    {level.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Dance Styles (Select Multiple)</Text>
            <View style={styles.danceStylesGrid}>
              {DANCE_STYLES.map(style => {
                const isSelected = eventData.dance_styles.includes(style)
                return (
                  <TouchableOpacity
                    key={style}
                    style={[styles.danceStyleChip, isSelected && styles.danceStyleChipSelected]}
                    onPress={() => {
                      if (isSelected) {
                        setEventData({
                          ...eventData,
                          dance_styles: eventData.dance_styles.filter(s => s !== style),
                        })
                      } else {
                        setEventData({
                          ...eventData,
                          dance_styles: [...eventData.dance_styles, style],
                        })
                      }
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    }}
                  >
                    <Text
                      style={[styles.danceStyleText, isSelected && styles.danceStyleTextSelected]}
                    >
                      {style}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={designSystem.colors.primary}
                        style={styles.danceStyleCheckmark}
                      />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.imageSection}>
              <Text style={styles.label}>Cover Image</Text>
            </View>
            <TouchableOpacity
              style={styles.imageUploadBox}
              onPress={handleImagePick}
              disabled={eventData.uploadingImage}
              activeOpacity={0.8}
            >
              {eventData.image_url || localImageUri ? (
                <View style={styles.imageContainer}>
                  <ImageLoader
                    source={{
                      uri:
                        localImageUri ||
                        (eventData.image_url ? getCoverUrl(eventData.image_url, 'thumbnail') : ''),
                    }}
                    style={styles.uploadedImage}
                    placeholderColor={`${designSystem.colors.white}10`}
                  />
                  {eventData.uploadingImage ? (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator size="small" color={designSystem.colors.white} />
                      <Text style={styles.uploadProgressText}>
                        {uploadProgress || 'Processing...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.imageEditOverlay}>
                      <Ionicons name="camera" size={30} color={designSystem.colors.white} />
                      <Text style={styles.imageEditText}>Change Cover</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  {eventData.uploadingImage ? (
                    <>
                      <ActivityIndicator size="large" color={designSystem.colors.primary} />
                      <Text style={styles.uploadText}>{uploadProgress || 'Processing...'}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="image-outline"
                        size={40}
                        color={designSystem.colors.textSecondary}
                      />
                      <Text style={styles.uploadText}>Tap to upload cover image</Text>
                      <Text style={styles.uploadHint}>16:9 aspect ratio recommended</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        )

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Location Details</Text>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Virtual Event</Text>
              <Switch
                value={eventData.is_virtual}
                onValueChange={value => setEventData({ ...eventData, is_virtual: value })}
                trackColor={{ false: '#767577', true: designSystem.colors.primary }}
                thumbColor={eventData.is_virtual ? designSystem.colors.white : '#f4f3f4'}
              />
            </View>

            {eventData.is_virtual ? (
              <>
                <Text style={styles.label}>Virtual Link</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., https://zoom.us/..."
                  placeholderTextColor={designSystem.colors.textSecondary}
                  value={eventData.virtual_link}
                  onChangeText={text => setEventData({ ...eventData, virtual_link: text })}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Venue Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Dance Studio Central"
                  placeholderTextColor={designSystem.colors.textSecondary}
                  value={eventData.location_name}
                  onChangeText={text => setEventData({ ...eventData, location_name: text })}
                />

                <Text style={styles.label}>Location</Text>
                <AddressAutocomplete
                  value={eventData.location_address}
                  onSelect={(place: PlaceDetails) => {
                    setEventData({
                      ...eventData,
                      location_address: place.address,
                      location_city: place.city || '',
                      location_latitude: place.coordinates?.latitude,
                      location_longitude: place.coordinates?.longitude,
                    })
                  }}
                  placeholder="Search for address..."
                  style={styles.input}
                />

                {eventData.location_address && (
                  <View style={styles.locationInfoContainer}>
                    {eventData.location_city ? (
                      <Text style={styles.selectedCity}>City: {eventData.location_city}</Text>
                    ) : null}
                    {eventData.location_latitude && eventData.location_longitude ? (
                      <Text style={styles.coordinatesText}>📍 Location coordinates saved</Text>
                    ) : null}
                  </View>
                )}
              </>
            )}
          </View>
        )

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Date & Time</Text>

            <Text style={styles.label}>Start Date & Time</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => {
                setTempStartDateTime(eventData.start_date_time)
                setShowStartDateTimePicker(true)
              }}
            >
              <Ionicons name="calendar-outline" size={20} color={designSystem.colors.primary} />
              <Text style={styles.dateTimeText}>
                {eventData.start_date_time.toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </TouchableOpacity>

            {showStartDateTimePicker &&
              (Platform.OS === 'ios' ? (
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity
                      onPress={() => setShowStartDateTimePicker(false)}
                      style={styles.pickerButton}
                    >
                      <Text style={styles.pickerButtonCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        // Ensure end time is after start time
                        if (tempStartDateTime >= eventData.end_date_time) {
                          const newEndDateTime = new Date(tempStartDateTime)
                          newEndDateTime.setHours(newEndDateTime.getHours() + 1)
                          setEventData({
                            ...eventData,
                            start_date_time: tempStartDateTime,
                            end_date_time: newEndDateTime,
                          })
                        } else {
                          setEventData({ ...eventData, start_date_time: tempStartDateTime })
                        }
                        setShowStartDateTimePicker(false)
                      }}
                      style={styles.pickerButton}
                    >
                      <Text style={styles.pickerButtonConfirm}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempStartDateTime}
                    mode="datetime"
                    display="spinner"
                    onChange={(_event, date) => {
                      if (date) setTempStartDateTime(date)
                    }}
                    minimumDate={new Date()}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={tempStartDateTime}
                  mode="datetime"
                  display="default"
                  onChange={(_event, date) => {
                    setShowStartDateTimePicker(false)
                    if (date) {
                      // Ensure end time is after start time
                      if (date >= eventData.end_date_time) {
                        const newEndDateTime = new Date(date)
                        newEndDateTime.setHours(newEndDateTime.getHours() + 1)
                        setEventData({
                          ...eventData,
                          start_date_time: date,
                          end_date_time: newEndDateTime,
                        })
                      } else {
                        setEventData({ ...eventData, start_date_time: date })
                      }
                    }
                  }}
                  minimumDate={new Date()}
                />
              ))}

            <Text style={styles.label}>End Date & Time</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => {
                setTempEndDateTime(eventData.end_date_time)
                setShowEndDateTimePicker(true)
              }}
            >
              <Ionicons name="calendar-outline" size={20} color={designSystem.colors.primary} />
              <Text style={styles.dateTimeText}>
                {eventData.end_date_time.toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </TouchableOpacity>

            {showEndDateTimePicker &&
              (Platform.OS === 'ios' ? (
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity
                      onPress={() => setShowEndDateTimePicker(false)}
                      style={styles.pickerButton}
                    >
                      <Text style={styles.pickerButtonCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        // Validate that end time is after start time
                        if (tempEndDateTime <= eventData.start_date_time) {
                          Alert.alert('Invalid Time', 'End time must be after start time')
                          return
                        }
                        setEventData({ ...eventData, end_date_time: tempEndDateTime })
                        setShowEndDateTimePicker(false)
                      }}
                      style={styles.pickerButton}
                    >
                      <Text style={styles.pickerButtonConfirm}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempEndDateTime}
                    mode="datetime"
                    display="spinner"
                    onChange={(_event, date) => {
                      if (date) setTempEndDateTime(date)
                    }}
                    minimumDate={eventData.start_date_time}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={tempEndDateTime}
                  mode="datetime"
                  display="default"
                  onChange={(_event, date) => {
                    setShowEndDateTimePicker(false)
                    if (date) {
                      // Validate that end time is after start time
                      if (date <= eventData.start_date_time) {
                        Alert.alert('Invalid Time', 'End time must be after start time')
                        return
                      }
                      setEventData({ ...eventData, end_date_time: date })
                    }
                  }}
                  minimumDate={eventData.start_date_time}
                />
              ))}

            {/* Recurring Event Section */}
            <View style={styles.recurringSection}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.label}>Recurring Event</Text>
                  <Text style={styles.recurringHint}>Create multiple instances of this event</Text>
                </View>
                <Switch
                  value={eventData.is_recurring}
                  onValueChange={value => setEventData({ ...eventData, is_recurring: value })}
                  trackColor={{ false: '#767577', true: designSystem.colors.primary }}
                  thumbColor={eventData.is_recurring ? designSystem.colors.white : '#f4f3f4'}
                />
              </View>

              {eventData.is_recurring && (
                <>
                  <Text style={styles.label}>Frequency</Text>
                  <View style={styles.recurrenceOptions}>
                    {RECURRENCE_OPTIONS.map(option => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.recurrenceOption,
                          eventData.recurrence_type === option.value &&
                            styles.recurrenceOptionSelected,
                        ]}
                        onPress={() => {
                          setEventData({ ...eventData, recurrence_type: option.value })
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        }}
                      >
                        <Text
                          style={[
                            styles.recurrenceOptionText,
                            eventData.recurrence_type === option.value &&
                              styles.recurrenceOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {eventData.recurrence_type === RecurrenceType.Weekly && (
                    <>
                      <Text style={styles.label}>Repeat On</Text>
                      <View style={styles.weekdaysRow}>
                        {WEEKDAYS.map(day => {
                          const isSelected = eventData.recurrence_days.includes(day.value)
                          return (
                            <TouchableOpacity
                              key={day.value}
                              style={[
                                styles.weekdayButton,
                                isSelected && styles.weekdayButtonSelected,
                              ]}
                              onPress={() => {
                                if (isSelected) {
                                  setEventData({
                                    ...eventData,
                                    recurrence_days: eventData.recurrence_days.filter(
                                      d => d !== day.value,
                                    ),
                                  })
                                } else {
                                  setEventData({
                                    ...eventData,
                                    recurrence_days: [...eventData.recurrence_days, day.value],
                                  })
                                }
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                              }}
                            >
                              <Text
                                style={[
                                  styles.weekdayText,
                                  isSelected && styles.weekdayTextSelected,
                                ]}
                              >
                                {day.label}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>End Date (optional)</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => {
                      const defaultDate = new Date()
                      defaultDate.setMonth(defaultDate.getMonth() + 3)
                      setTempRecurrenceEndDate(eventData.recurrence_end_date || defaultDate)
                      setShowRecurrenceEndDatePicker(true)
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={designSystem.colors.primary}
                    />
                    <Text style={styles.dateTimeText}>
                      {eventData.recurrence_end_date
                        ? eventData.recurrence_end_date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'No end date (continues indefinitely)'}
                    </Text>
                    {eventData.recurrence_end_date && (
                      <TouchableOpacity
                        onPress={() => setEventData({ ...eventData, recurrence_end_date: null })}
                        style={styles.clearDateButton}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={designSystem.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  {showRecurrenceEndDatePicker &&
                    (Platform.OS === 'ios' ? (
                      <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                          <TouchableOpacity
                            onPress={() => setShowRecurrenceEndDatePicker(false)}
                            style={styles.pickerButton}
                          >
                            <Text style={styles.pickerButtonCancel}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setEventData({
                                ...eventData,
                                recurrence_end_date: tempRecurrenceEndDate,
                              })
                              setShowRecurrenceEndDatePicker(false)
                            }}
                            style={styles.pickerButton}
                          >
                            <Text style={styles.pickerButtonConfirm}>Confirm</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={tempRecurrenceEndDate}
                          mode="date"
                          display="spinner"
                          onChange={(_event, date) => {
                            if (date) setTempRecurrenceEndDate(date)
                          }}
                          minimumDate={eventData.start_date_time}
                        />
                      </View>
                    ) : (
                      <DateTimePicker
                        value={tempRecurrenceEndDate}
                        mode="date"
                        display="default"
                        onChange={(_event, date) => {
                          setShowRecurrenceEndDatePicker(false)
                          if (date) {
                            setEventData({ ...eventData, recurrence_end_date: date })
                          }
                        }}
                        minimumDate={eventData.start_date_time}
                      />
                    ))}
                </>
              )}
            </View>
          </View>
        )

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Capacity & Pricing</Text>

            <Text style={styles.label}>Max Participants</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 50"
              placeholderTextColor={designSystem.colors.textSecondary}
              value={eventData.max_capacity.toString()}
              onChangeText={text =>
                setEventData({ ...eventData, max_capacity: parseInt(text, 10) || 0 })
              }
              keyboardType="numeric"
            />

            <Text style={styles.label}>Price (USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="0 for free events"
              placeholderTextColor={designSystem.colors.textSecondary}
              value={eventData.price_usd.toString()}
              onChangeText={text =>
                setEventData({ ...eventData, price_usd: parseFloat(text) || 0 })
              }
              keyboardType="numeric"
            />

            <Text style={styles.label}>Requirements/Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What participants should bring or know..."
              placeholderTextColor={designSystem.colors.textSecondary}
              value={eventData.requirements}
              onChangeText={text => setEventData({ ...eventData, requirements: text })}
              multiline
              numberOfLines={3}
            />
          </View>
        )

      default:
        return null
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[designSystem.colors.dark, '#0a0a0a']} style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={designSystem.colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Event</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.progressBar}>
            {[1, 2, 3, 4].map(step => (
              <View
                key={step}
                style={[styles.progressStep, step <= currentStep && styles.progressStepActive]}
              />
            ))}
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderStep()}
          </ScrollView>

          <View style={styles.footer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            {currentStep < 4 ? (
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <LinearGradient
                  colors={designSystem.colors.gradients.primary}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Next</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleCreateEvent}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? ['#666', '#444'] : designSystem.colors.gradients.primary}
                  style={styles.primaryButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={designSystem.colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create Event</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.dark,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(20),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  placeholder: {
    width: scale(40),
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    gap: scale(8),
    marginBottom: verticalScale(20),
  },
  progressStep: {
    flex: 1,
    height: verticalScale(4),
    backgroundColor: `${designSystem.colors.white}20`,
    borderRadius: moderateScale(2),
  },
  progressStepActive: {
    backgroundColor: designSystem.colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(120), // Increased padding to prevent overlap with footer buttons
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: designSystem.colors.white,
    marginBottom: verticalScale(24),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: designSystem.colors.textSecondary,
    marginBottom: verticalScale(8),
    marginTop: verticalScale(16),
  },
  input: {
    backgroundColor: `${designSystem.colors.white}10`,
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    color: designSystem.colors.white,
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}20`,
  },
  textArea: {
    minHeight: verticalScale(100),
    textAlignVertical: 'top',
  },
  optionsRow: {
    marginTop: verticalScale(8),
    marginHorizontal: scale(-20),
    paddingHorizontal: scale(20),
  },
  categoryOption: {
    alignItems: 'center',
    padding: moderateScale(12),
    borderRadius: moderateScale(12),
    backgroundColor: `${designSystem.colors.white}10`,
    marginRight: scale(12),
    minWidth: scale(80),
  },
  selectedOption: {
    backgroundColor: `${designSystem.colors.primary}30`,
    borderWidth: 1,
    borderColor: designSystem.colors.primary,
  },
  categoryEmoji: {
    fontSize: moderateScale(24),
    marginBottom: verticalScale(4),
  },
  categoryText: {
    fontSize: moderateScale(12),
    color: designSystem.colors.textSecondary,
  },
  selectedText: {
    color: designSystem.colors.primary,
    fontWeight: '600',
  },
  skillLevelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  skillOption: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    backgroundColor: `${designSystem.colors.white}10`,
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}20`,
  },
  skillText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(16),
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${designSystem.colors.white}10`,
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    gap: scale(12),
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}20`,
  },
  dateTimeText: {
    fontSize: moderateScale(16),
    color: designSystem.colors.white,
  },
  pickerContainer: {
    backgroundColor: `${designSystem.colors.white}10`,
    borderRadius: moderateScale(12),
    marginTop: verticalScale(8),
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: `${designSystem.colors.white}20`,
  },
  pickerButton: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  pickerButtonCancel: {
    fontSize: moderateScale(16),
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  pickerButtonConfirm: {
    fontSize: moderateScale(16),
    color: designSystem.colors.primary,
    fontWeight: '600',
  },
  imageUploadBox: {
    height: verticalScale(200),
    backgroundColor: `${designSystem.colors.white}10`,
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: `${designSystem.colors.white}20`,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(8),
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(12),
  },
  uploadPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    marginTop: verticalScale(8),
  },
  uploadHint: {
    fontSize: moderateScale(12),
    color: `${designSystem.colors.textSecondary}80`,
    marginTop: verticalScale(4),
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(12),
  },
  uploadProgressText: {
    color: designSystem.colors.white,
    fontSize: moderateScale(14),
    marginTop: verticalScale(8),
    fontWeight: '600',
  },
  imageEditOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(12),
  },
  imageEditText: {
    color: designSystem.colors.white,
    fontSize: moderateScale(14),
    marginTop: verticalScale(8),
    fontWeight: '600',
  },
  selectedCity: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
  },
  locationInfoContainer: {
    marginTop: verticalScale(8),
    marginBottom: verticalScale(16),
    gap: verticalScale(4),
  },
  coordinatesText: {
    fontSize: moderateScale(13),
    color: designSystem.colors.success,
    marginTop: verticalScale(4),
  },
  imageSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
    paddingBottom: verticalScale(40),
    backgroundColor: designSystem.colors.dark,
    gap: scale(12),
  },
  primaryButton: {
    flex: 1,
    borderRadius: moderateScale(24),
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  secondaryButton: {
    flex: 0.4,
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    borderRadius: moderateScale(24),
    backgroundColor: `${designSystem.colors.white}10`,
  },
  secondaryButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  disabledButton: {
    opacity: 0.6,
  },
  danceStylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  danceStyleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    backgroundColor: `${designSystem.colors.white}10`,
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}20`,
    gap: scale(6),
  },
  danceStyleChipSelected: {
    backgroundColor: `${designSystem.colors.primary}20`,
    borderColor: designSystem.colors.primary,
  },
  danceStyleText: {
    fontSize: moderateScale(13),
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  danceStyleTextSelected: {
    color: designSystem.colors.primary,
  },
  danceStyleCheckmark: {
    marginLeft: scale(2),
  },
  // Recurring event styles
  recurringSection: {
    marginTop: verticalScale(24),
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: `${designSystem.colors.white}20`,
  },
  recurringHint: {
    fontSize: moderateScale(12),
    color: designSystem.colors.textSecondary,
    marginTop: verticalScale(2),
  },
  recurrenceOptions: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  recurrenceOption: {
    flex: 1,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(12),
    backgroundColor: `${designSystem.colors.white}10`,
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}20`,
    alignItems: 'center',
  },
  recurrenceOptionSelected: {
    backgroundColor: `${designSystem.colors.primary}20`,
    borderColor: designSystem.colors.primary,
  },
  recurrenceOptionText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  recurrenceOptionTextSelected: {
    color: designSystem.colors.primary,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(8),
    gap: scale(4),
  },
  weekdayButton: {
    flex: 1,
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(4),
    borderRadius: moderateScale(8),
    backgroundColor: `${designSystem.colors.white}10`,
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}20`,
    alignItems: 'center',
  },
  weekdayButtonSelected: {
    backgroundColor: `${designSystem.colors.primary}20`,
    borderColor: designSystem.colors.primary,
  },
  weekdayText: {
    fontSize: moderateScale(12),
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  weekdayTextSelected: {
    color: designSystem.colors.primary,
  },
  clearDateButton: {
    marginLeft: 'auto',
    padding: scale(4),
  },
})
