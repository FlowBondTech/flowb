import { useApolloClient } from '@apollo/client/react'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNavigation, useRoute } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useState } from 'react'
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
import { ImageLoader } from '../components/ui/ImageLoader'
import {
  DANCE_STYLES,
  EVENT_CATEGORIES,
  EVENT_CATEGORIES_DISPLAY,
  SKILL_LEVELS,
  SKILL_LEVELS_DISPLAY,
} from '../constants/eventConstants'
import {
  type EventCategory,
  GetEventDocument,
  GetEventsDocument,
  GetMyCreatedEventsDocument,
  type SkillLevel,
  type UpdateEventInput,
  useDeleteEventMutation,
  useGetEventQuery,
  useUpdateEventMutation,
} from '../generated/graphql'
import { useUploadImage } from '../hooks/graphql/useUploadQueries'
import { designSystem } from '../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../styles/responsive'
import { compressImage, formatFileSize } from '../utils/imageUtils'

type EventFormData = {
  title: string
  description: string
  start_date_time: Date
  end_date_time: Date
  location_name: string
  location_address: string
  location_city: string
  is_virtual: boolean
  virtual_link: string
  max_capacity: number
  price_usd: number
  currency: string
  category: string
  skill_level: string
  dance_styles: string[]
  requirements: string
  image_url?: string
}

export const EditEventScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { eventId } = route.params

  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalData, setOriginalData] = useState<EventFormData | null>(null)
  const [showStartDateTimePicker, setShowStartDateTimePicker] = useState(false)
  const [showEndDateTimePicker, setShowEndDateTimePicker] = useState(false)
  const [tempStartDateTime, setTempStartDateTime] = useState(new Date())
  const [tempEndDateTime, setTempEndDateTime] = useState(new Date())
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<any>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | undefined>(undefined)
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_date_time: new Date(),
    end_date_time: new Date(),
    location_name: '',
    location_address: '',
    location_city: '',
    is_virtual: false,
    virtual_link: '',
    max_capacity: 20,
    price_usd: 0,
    currency: 'USD',
    category: 'class',
    skill_level: 'all',
    dance_styles: [],
    requirements: '',
  })

  // Use GraphQL to fetch event
  const client = useApolloClient()
  const { data: eventData, loading } = useGetEventQuery({
    variables: { id: eventId },
  })
  const [updateEvent] = useUpdateEventMutation({
    refetchQueries: [
      { query: GetEventsDocument },
      { query: GetMyCreatedEventsDocument },
      { query: GetEventDocument, variables: { id: eventId } }, // Refetch the full event with participants
    ],
    onCompleted: () => {
      Toast.show({
        type: 'success',
        text1: 'Event Updated',
        text2: 'Your changes have been saved',
      })
    },
    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update event',
        text2: error.message || 'Something went wrong',
      })
    },
  })
  const [deleteEvent] = useDeleteEventMutation({
    refetchQueries: [{ query: GetEventsDocument }, { query: GetMyCreatedEventsDocument }],
    onCompleted: () => {
      // Use the eventId from route params for cache eviction
      client.cache.evict({ id: `Event:${eventId}` })
      client.cache.gc()

      Toast.show({
        type: 'success',
        text1: 'Event Deleted',
        text2: 'The event has been deleted successfully',
      })
    },
    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Failed to delete event',
        text2: error.message || 'Something went wrong',
      })
    },
  })
  const uploadImageMutation = useUploadImage()

  useEffect(() => {
    if (eventData?.event) {
      const event = eventData.event

      // Set datetime for pickers
      const startDateTime = event.start_date_time ? new Date(event.start_date_time) : new Date()
      const endDateTime = event.end_date_time ? new Date(event.end_date_time) : new Date()

      setTempStartDateTime(startDateTime)
      setTempEndDateTime(endDateTime)

      const newFormData = {
        title: event.title || '',
        description: event.description || '',
        start_date_time: startDateTime,
        end_date_time: endDateTime,
        location_name: event.location_name || '',
        location_address: event.location_address || '',
        location_city: event.location_city || '',
        is_virtual: event.is_virtual || false,
        virtual_link: event.virtual_link || '',
        max_capacity: event.max_capacity || 20,
        price_usd: event.price_usd || 0,
        currency: event.currency || 'USD',
        category: event.category || 'class',
        skill_level: event.skill_level || 'all',
        dance_styles: event.dance_styles || [],
        requirements: event.requirements || '',
        image_url: event.image_url || '',
      }
      setFormData(newFormData)
      setOriginalData(newFormData)

      // Set the current image if exists
      if (event.image_url) {
        setSelectedImage(event.image_url)
      }
    }
  }, [eventData])

  // Check for changes whenever formData or imageFile changes
  useEffect(() => {
    if (!originalData) return

    const dataChanged =
      formData.title !== originalData.title ||
      formData.description !== originalData.description ||
      formData.start_date_time.getTime() !== originalData.start_date_time.getTime() ||
      formData.end_date_time.getTime() !== originalData.end_date_time.getTime() ||
      formData.location_name !== originalData.location_name ||
      formData.location_address !== originalData.location_address ||
      formData.location_city !== originalData.location_city ||
      formData.is_virtual !== originalData.is_virtual ||
      formData.virtual_link !== originalData.virtual_link ||
      formData.max_capacity !== originalData.max_capacity ||
      formData.price_usd !== originalData.price_usd ||
      formData.category !== originalData.category ||
      formData.skill_level !== originalData.skill_level ||
      JSON.stringify(formData.dance_styles) !== JSON.stringify(originalData.dance_styles) ||
      formData.requirements !== originalData.requirements ||
      (imageFile && selectedImage !== originalData.image_url)

    setHasChanges(dataChanged)
  }, [formData, originalData, imageFile, selectedImage])

  const pickImage = async () => {
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
      setSelectedImage(asset.uri)
      setUploadingImage(true)
      setUploadProgress('Compressing...')

      try {
        // Compress the image to ~1MB
        const compressed = await compressImage(asset, 'cover')
        console.log(
          `Compressed event image from ${formatFileSize(asset.width * asset.height * 4)} to ~${formatFileSize(compressed.fileSize || 0)}`,
        )

        setUploadProgress('Processing...')

        // Set the compressed image for preview
        setSelectedImage(compressed.uri)

        // Create a new asset object with compressed URI
        const compressedAsset = {
          ...asset,
          uri: compressed.uri,
          width: compressed.width,
          height: compressed.height,
          type: 'image/jpeg', // Ensure proper MIME type
          name: `event-${Date.now()}.jpg`, // Add proper filename
        }

        setImageFile(compressedAsset)
        setUploadingImage(false)
        setUploadProgress(undefined)
      } catch (error) {
        console.error('Error compressing image:', error)
        // Fall back to original if compression fails
        setSelectedImage(asset.uri)
        setImageFile(asset)
        setUploadingImage(false)
        setUploadProgress(undefined)
      }
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Event title is required',
        position: 'top',
      })
      return
    }

    if (!formData.location_name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Location name is required',
        position: 'top',
      })
      return
    }

    try {
      setSaving(true)

      let imageUrl = formData.image_url

      // Upload new image if selected
      if (imageFile && selectedImage !== formData.image_url) {
        try {
          const uploadResult = await uploadImageMutation.mutateAsync({
            file: imageFile,
            type: 'event',
          })
          imageUrl = uploadResult.url
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError)
          Toast.show({
            type: 'error',
            text1: 'Warning',
            text2: 'Failed to upload image, but saving other changes',
            position: 'top',
          })
        }
      }

      const updateData: UpdateEventInput = {
        title: formData.title,
        description: formData.description || undefined,
        start_date_time: formData.start_date_time.toISOString(),
        end_date_time: formData.end_date_time.toISOString(),
        location_name: formData.location_name,
        location_address: formData.location_address || undefined,
        location_city: formData.location_city || undefined,
        is_virtual: formData.is_virtual,
        virtual_link: formData.is_virtual ? formData.virtual_link : undefined,
        max_capacity: formData.max_capacity || undefined,
        price_usd: formData.price_usd || undefined,
        currency: formData.currency || undefined,
        category: (formData.category as EventCategory) || undefined,
        skill_level: (formData.skill_level as SkillLevel) || undefined,
        dance_styles: formData.dance_styles.length > 0 ? formData.dance_styles : undefined,
        requirements: formData.requirements || undefined,
        image_url: imageUrl || undefined,
      }

      await updateEvent({ variables: { id: eventId, input: updateData } })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Just go back - the cache will be updated automatically
      navigation.goBack()
    } catch (error: any) {
      console.error('Error updating event:', error)
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.error || 'Failed to update event',
        position: 'top',
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setSaving(false)
    }
  }

  const formatDateTimeDisplay = (date: Date): string => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true)
              await deleteEvent({ variables: { id: eventId } })

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

              navigation.navigate('Events')
            } catch (error: any) {
              console.error('Error deleting event:', error)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            } finally {
              setSaving(false)
            }
          },
        },
      ],
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[designSystem.colors.dark, '#0a0a0a']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designSystem.colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <LinearGradient colors={[designSystem.colors.dark, '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={designSystem.colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Event</Text>
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color={designSystem.colors.error} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* Image Section */}
            <View style={styles.imageSection}>
              <Text style={styles.label}>Event Image</Text>
              <TouchableOpacity
                style={styles.imageContainer}
                onPress={pickImage}
                disabled={uploadingImage}
              >
                {selectedImage ? (
                  <>
                    <ImageLoader
                      source={{ uri: selectedImage }}
                      style={styles.eventImage}
                      placeholderColor={`${designSystem.colors.white}10`}
                    />
                    {uploadingImage ? (
                      <View style={styles.uploadOverlay}>
                        <ActivityIndicator size="small" color={designSystem.colors.white} />
                        <Text style={styles.uploadProgressText}>
                          {uploadProgress || 'Processing...'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.imageEditButton}>
                        <Ionicons name="camera" size={20} color={designSystem.colors.white} />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    {uploadingImage ? (
                      <>
                        <ActivityIndicator size="large" color={designSystem.colors.primary} />
                        <Text style={styles.imagePlaceholderText}>
                          {uploadProgress || 'Processing...'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name="image-outline"
                          size={48}
                          color={designSystem.colors.textSecondary}
                        />
                        <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Event Title *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={text => setFormData({ ...formData, title: text })}
                placeholder="Enter event title"
                placeholderTextColor={designSystem.colors.textSecondary}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={text => setFormData({ ...formData, description: text })}
                placeholder="Describe your event"
                placeholderTextColor={designSystem.colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                {EVENT_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pickerOption,
                      formData.category === cat && styles.pickerOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.category === cat && styles.pickerOptionTextActive,
                      ]}
                    >
                      {EVENT_CATEGORIES_DISPLAY[cat]?.name || cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Skill Level</Text>
              <View style={styles.pickerContainer}>
                {SKILL_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.pickerOption,
                      formData.skill_level === level && styles.pickerOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, skill_level: level })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.skill_level === level && styles.pickerOptionTextActive,
                      ]}
                    >
                      {SKILL_LEVELS_DISPLAY[level]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Dance Styles (Select Multiple)</Text>
              <View style={styles.danceStylesGrid}>
                {DANCE_STYLES.map(style => {
                  const isSelected = formData.dance_styles.includes(style)
                  return (
                    <TouchableOpacity
                      key={style}
                      style={[styles.danceStyleChip, isSelected && styles.danceStyleChipSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setFormData({
                            ...formData,
                            dance_styles: formData.dance_styles.filter(s => s !== style),
                          })
                        } else {
                          setFormData({
                            ...formData,
                            dance_styles: [...formData.dance_styles, style],
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
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Start Date & Time</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowStartDateTimePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={designSystem.colors.primary} />
                <Text style={styles.dateTimeButtonText}>
                  {formatDateTimeDisplay(formData.start_date_time)}
                </Text>
              </TouchableOpacity>
            </View>

            {showStartDateTimePicker &&
              (Platform.OS === 'ios' ? (
                <View style={styles.pickerModal}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowStartDateTimePicker(false)}>
                      <Text style={styles.pickerCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        // Ensure end time is after start time
                        if (tempStartDateTime >= formData.end_date_time) {
                          const newEndDateTime = new Date(tempStartDateTime)
                          newEndDateTime.setHours(newEndDateTime.getHours() + 1)
                          setFormData({
                            ...formData,
                            start_date_time: tempStartDateTime,
                            end_date_time: newEndDateTime,
                          })
                        } else {
                          setFormData({ ...formData, start_date_time: tempStartDateTime })
                        }
                        setShowStartDateTimePicker(false)
                      }}
                    >
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempStartDateTime}
                    mode="datetime"
                    display="spinner"
                    onChange={(_event, selectedDateTime) => {
                      if (selectedDateTime) setTempStartDateTime(selectedDateTime)
                    }}
                    minimumDate={new Date()}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={tempStartDateTime}
                  mode="datetime"
                  display="default"
                  onChange={(_event, selectedDateTime) => {
                    setShowStartDateTimePicker(false)
                    if (selectedDateTime) {
                      setTempStartDateTime(selectedDateTime)
                      // Ensure end time is after start time
                      if (selectedDateTime >= formData.end_date_time) {
                        const newEndDateTime = new Date(selectedDateTime)
                        newEndDateTime.setHours(newEndDateTime.getHours() + 1)
                        setFormData({
                          ...formData,
                          start_date_time: selectedDateTime,
                          end_date_time: newEndDateTime,
                        })
                      } else {
                        setFormData({ ...formData, start_date_time: selectedDateTime })
                      }
                    }
                  }}
                  minimumDate={new Date()}
                />
              ))}

            <View style={styles.section}>
              <Text style={styles.label}>End Date & Time</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEndDateTimePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={designSystem.colors.primary} />
                <Text style={styles.dateTimeButtonText}>
                  {formatDateTimeDisplay(formData.end_date_time)}
                </Text>
              </TouchableOpacity>
            </View>

            {showEndDateTimePicker &&
              (Platform.OS === 'ios' ? (
                <View style={styles.pickerModal}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowEndDateTimePicker(false)}>
                      <Text style={styles.pickerCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (tempEndDateTime <= formData.start_date_time) {
                          Alert.alert('Invalid Time', 'End time must be after start time')
                          return
                        }
                        setFormData({ ...formData, end_date_time: tempEndDateTime })
                        setShowEndDateTimePicker(false)
                      }}
                    >
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempEndDateTime}
                    mode="datetime"
                    display="spinner"
                    onChange={(_event, selectedDateTime) => {
                      if (selectedDateTime) setTempEndDateTime(selectedDateTime)
                    }}
                    minimumDate={formData.start_date_time}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={tempEndDateTime}
                  mode="datetime"
                  display="default"
                  onChange={(_event, selectedDateTime) => {
                    setShowEndDateTimePicker(false)
                    if (selectedDateTime) {
                      if (selectedDateTime <= formData.start_date_time) {
                        Alert.alert('Invalid Time', 'End time must be after start time')
                        return
                      }
                      setFormData({ ...formData, end_date_time: selectedDateTime })
                    }
                  }}
                  minimumDate={formData.start_date_time}
                />
              ))}

            <View style={styles.section}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Virtual Event</Text>
                <Switch
                  value={formData.is_virtual}
                  onValueChange={value => setFormData({ ...formData, is_virtual: value })}
                  trackColor={{ false: '#767577', true: designSystem.colors.primary }}
                  thumbColor={designSystem.colors.white}
                />
              </View>
            </View>

            {formData.is_virtual && (
              <View style={styles.section}>
                <Text style={styles.label}>Virtual Link</Text>
                <TextInput
                  style={styles.input}
                  value={formData.virtual_link}
                  onChangeText={text => setFormData({ ...formData, virtual_link: text })}
                  placeholder="Enter meeting link"
                  placeholderTextColor={designSystem.colors.textSecondary}
                />
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>Location Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.location_name}
                onChangeText={text => setFormData({ ...formData, location_name: text })}
                placeholder="Enter location name"
                placeholderTextColor={designSystem.colors.textSecondary}
              />
            </View>

            {!formData.is_virtual && (
              <>
                <View style={styles.section}>
                  <Text style={styles.label}>Address</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.location_address}
                    onChangeText={text => setFormData({ ...formData, location_address: text })}
                    placeholder="Enter street address"
                    placeholderTextColor={designSystem.colors.textSecondary}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.location_city}
                    onChangeText={text => setFormData({ ...formData, location_city: text })}
                    placeholder="Enter city"
                    placeholderTextColor={designSystem.colors.textSecondary}
                  />
                </View>
              </>
            )}

            <View style={styles.row}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.label}>Max Capacity</Text>
                <TextInput
                  style={styles.input}
                  value={formData.max_capacity.toString()}
                  onChangeText={text =>
                    setFormData({ ...formData, max_capacity: parseInt(text) || 0 })
                  }
                  placeholder="20"
                  placeholderTextColor={designSystem.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.section, { flex: 1, marginLeft: scale(10) }]}>
                <Text style={styles.label}>Price (USD)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.price_usd.toString()}
                  onChangeText={text =>
                    setFormData({ ...formData, price_usd: parseFloat(text || '0') || 0 })
                  }
                  placeholder="0"
                  placeholderTextColor={designSystem.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Requirements</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.requirements}
                onChangeText={text => setFormData({ ...formData, requirements: text })}
                placeholder="What should participants bring or know?"
                placeholderTextColor={designSystem.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, (!hasChanges || saving) && styles.disabledButton]}
              onPress={handleSave}
              disabled={!hasChanges || saving}
            >
              <LinearGradient
                colors={!hasChanges ? ['#666', '#444'] : designSystem.colors.gradients.primary}
                style={styles.saveButtonGradient}
              >
                {saving ? (
                  <ActivityIndicator color={designSystem.colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.dark,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(20),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(120),
  },
  section: {
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: designSystem.colors.textSecondary,
    marginBottom: verticalScale(8),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
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
  row: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  pickerOption: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    backgroundColor: `${designSystem.colors.white}10`,
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}20`,
  },
  pickerOptionActive: {
    backgroundColor: `${designSystem.colors.primary}30`,
    borderColor: designSystem.colors.primary,
  },
  pickerOptionText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
  },
  pickerOptionTextActive: {
    color: designSystem.colors.primary,
    fontWeight: '500',
  },
  danceStylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  danceStyleChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    backgroundColor: `${designSystem.colors.white}10`,
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}20`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  danceStyleChipSelected: {
    backgroundColor: `${designSystem.colors.primary}20`,
    borderColor: designSystem.colors.primary,
  },
  danceStyleText: {
    fontSize: moderateScale(13),
    color: designSystem.colors.textSecondary,
  },
  danceStyleTextSelected: {
    color: designSystem.colors.primary,
    fontWeight: '500',
  },
  danceStyleCheckmark: {
    marginLeft: scale(2),
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${designSystem.colors.white}10`,
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    gap: scale(10),
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}20`,
  },
  dateTimeButtonText: {
    fontSize: moderateScale(15),
    color: designSystem.colors.white,
    flex: 1,
  },
  pickerModal: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: moderateScale(16),
    marginHorizontal: scale(20),
    marginBottom: verticalScale(20),
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: `${designSystem.colors.white}10`,
  },
  pickerCancel: {
    fontSize: moderateScale(16),
    color: designSystem.colors.textSecondary,
  },
  pickerDone: {
    fontSize: moderateScale(16),
    color: designSystem.colors.primary,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(20),
    paddingBottom: Platform.OS === 'ios' ? verticalScale(20) : verticalScale(30),
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: `${designSystem.colors.white}10`,
  },
  saveButton: {
    borderRadius: moderateScale(24),
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  imageSection: {
    marginBottom: verticalScale(20),
  },
  imageContainer: {
    width: '100%',
    height: verticalScale(200),
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    backgroundColor: `${designSystem.colors.white}10`,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
  },
  imageEditButton: {
    position: 'absolute',
    bottom: scale(12),
    right: scale(12),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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
})
