import { Feather, Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { OrganizerOnboarding } from '../components/onboarding/OrganizerOnboarding'
import { ProfileForm } from '../components/profile/ProfileForm'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { LinearGradientCompat as LinearGradient } from '../utils/platformUtils'

// Event types that organizers can host
const EVENT_TYPE_OPTIONS = [
  'Social Dance',
  'Classes',
  'Workshops',
  'Festivals',
  'Competitions',
  'Performances',
  'Practice Sessions',
  'Flash Mobs',
  'Dance Battles',
  'Other',
]

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation()
  const { theme } = useTheme()
  const { user, updateProfile } = useAuth()
  const [showOrganizerForm, setShowOrganizerForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [profileFormData, setProfileFormData] = useState<any>(null)
  const [organizerData, setOrganizerData] = useState({
    company_name: user?.company_name || '',
    website_url: user?.website_url || '',
    organizer_bio: user?.organizer_bio || '',
    event_types: user?.event_types || [],
  })
  const [originalOrganizerData] = useState({
    company_name: user?.company_name || '',
    website_url: user?.website_url || '',
    organizer_bio: user?.organizer_bio || '',
    event_types: user?.event_types || [],
  })

  const handleSave = async () => {
    if (!profileFormData?.data) return

    try {
      setSaving(true)

      // Only include fields that have actually changed
      const changedFields: any = {}

      // Compare each field with original user data and only include changed ones
      if (user) {
        const formData = profileFormData.data

        // Check each field for changes
        if (formData.username !== user.username) changedFields.username = formData.username
        if (formData.display_name !== user.display_name)
          changedFields.display_name = formData.display_name
        if (formData.bio !== user.bio) changedFields.bio = formData.bio
        if (formData.avatar_url !== user.avatar_url) changedFields.avatar_url = formData.avatar_url
        if (formData.cover_image_url !== user.cover_image_url)
          changedFields.cover_image_url = formData.cover_image_url
        if (formData.location !== user.location) changedFields.location = formData.location
        if (formData.city !== user.city) changedFields.city = formData.city
        if (formData.website !== user.website) changedFields.website = formData.website
        if (formData.website_url !== user.website_url)
          changedFields.website_url = formData.website_url
        if (formData.instagram !== user.instagram) changedFields.instagram = formData.instagram
        if (formData.instagram_handle !== user.instagram_handle)
          changedFields.instagram_handle = formData.instagram_handle
        if (formData.tiktok !== user.tiktok) changedFields.tiktok = formData.tiktok
        if (formData.youtube !== user.youtube) changedFields.youtube = formData.youtube
        if (formData.twitter !== user.twitter) changedFields.twitter = formData.twitter
        if (formData.twitter_handle !== user.twitter_handle)
          changedFields.twitter_handle = formData.twitter_handle
        if (formData.pronouns !== user.pronouns) changedFields.pronouns = formData.pronouns
        if (formData.skill_level !== user.skill_level)
          changedFields.skill_level = formData.skill_level

        // Check array fields with proper comparison
        if (JSON.stringify(formData.dance_styles) !== JSON.stringify(user.dance_styles)) {
          changedFields.dance_styles = formData.dance_styles
        }

        // Include organizer data if user is an organizer and fields have changed
        if (user.role === 'organizer') {
          if (organizerData.company_name !== user.company_name) {
            changedFields.company_name = organizerData.company_name
          }
          if (organizerData.website_url !== user.website_url) {
            changedFields.website_url = organizerData.website_url
          }
          if (organizerData.organizer_bio !== user.organizer_bio) {
            changedFields.organizer_bio = organizerData.organizer_bio
          }
          if (JSON.stringify(organizerData.event_types) !== JSON.stringify(user.event_types)) {
            changedFields.event_types = organizerData.event_types
          }
        }
      }

      // Only update if there are changes
      if (Object.keys(changedFields).length === 0) {
        navigation.goBack()
        return
      }

      // Update profile with only changed fields
      await updateProfile(changedFields)

      // Navigate back after successful update
      navigation.goBack()
    } catch (error) {
      console.error('Failed to update profile:', error)
      Alert.alert('Error', 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleBecomeOrganizer = () => {
    if (user?.role === 'organizer') {
      if (user.is_organizer_approved) {
        Alert.alert('Already an Organizer', 'You are already an approved organizer.')
      } else if (user.organizer_rejection_reason) {
        Alert.alert(
          'Application Status',
          `Your organizer application was rejected. Reason: ${user.organizer_rejection_reason}\n\nYou can submit a new application.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Apply Again', onPress: () => setShowOrganizerForm(true) },
          ],
        )
      } else {
        Alert.alert(
          'Application Pending',
          'Your organizer application is currently under review. We will notify you once it has been processed.',
        )
      }
    } else {
      setShowOrganizerForm(true)
    }
  }

  const handleOrganizerComplete = () => {
    setShowOrganizerForm(false)
    navigation.goBack()
  }

  // Check for changes in organizer data
  useEffect(() => {
    if (user?.role === 'organizer') {
      const organizerChanged =
        organizerData.company_name !== originalOrganizerData.company_name ||
        organizerData.website_url !== originalOrganizerData.website_url ||
        organizerData.organizer_bio !== originalOrganizerData.organizer_bio ||
        JSON.stringify(organizerData.event_types) !==
          JSON.stringify(originalOrganizerData.event_types)

      setHasChanges(organizerChanged || (profileFormData?.hasChanges ?? false))
    } else {
      setHasChanges(profileFormData?.hasChanges ?? false)
    }
  }, [organizerData, originalOrganizerData, profileFormData?.hasChanges, user?.role])

  // Stable callback for ProfileForm
  const handleProfileDataChange = useCallback((data: any) => {
    setProfileFormData(data)
  }, [])

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                showOrganizerForm ? setShowOrganizerForm(false) : navigation.goBack()
              }
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {showOrganizerForm ? 'Become an Organizer' : 'Edit Profile'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {showOrganizerForm ? (
            <OrganizerOnboarding
              onComplete={handleOrganizerComplete}
              initialData={{
                username: user?.username,
                display_name: user?.display_name,
                bio: user?.bio,
                dance_styles: user?.dance_styles,
                skill_level: user?.skill_level,
              }}
            />
          ) : (
            <>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {/* Organizer Section - show for regular users who want to become organizers */}
                {user?.role === 'user' && (
                  <View style={styles.organizerSection}>
                    <TouchableOpacity
                      style={[styles.organizerCard, { backgroundColor: theme.colors.surface }]}
                      onPress={handleBecomeOrganizer}
                    >
                      <Feather name="calendar" size={24} color={theme.colors.primary} />
                      <View style={styles.organizerCardContent}>
                        <Text style={[styles.organizerCardTitle, { color: theme.colors.text }]}>
                          Become an Event Organizer
                        </Text>
                        <Text
                          style={[
                            styles.organizerCardDescription,
                            { color: `${theme.colors.text}80` },
                          ]}
                        >
                          Create and manage dance events on DANZ
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={`${theme.colors.text}60`} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Organizer Information - Show fields for all organizers */}
                {user?.role === 'organizer' && (
                  <View style={styles.statusSection}>
                    <View
                      style={[
                        styles.organizerFieldsCard,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <View style={styles.organizerFieldsHeader}>
                        <Feather name="award" size={20} color={theme.colors.primary} />
                        <Text style={[styles.organizerFieldsTitle, { color: theme.colors.text }]}>
                          Organizer Information
                        </Text>
                        {!user.is_organizer_approved && (
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: user.organizer_rejection_reason
                                  ? `${theme.colors.error}20`
                                  : `${theme.colors.warning}20`,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                {
                                  color: user.organizer_rejection_reason
                                    ? theme.colors.error
                                    : theme.colors.warning,
                                },
                              ]}
                            >
                              {user.organizer_rejection_reason ? 'Rejected' : 'Pending'}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.organizerFields}>
                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: theme.colors.text }]}>
                            Company/Organization Name
                          </Text>
                          <TextInput
                            style={[
                              styles.input,
                              {
                                color: theme.colors.text,
                                backgroundColor: theme.colors.background,
                              },
                            ]}
                            value={organizerData.company_name}
                            onChangeText={(text: string) =>
                              setOrganizerData({ ...organizerData, company_name: text })
                            }
                            placeholder="Your company or organization name"
                            placeholderTextColor={`${theme.colors.text}60`}
                          />
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: theme.colors.text }]}>Website</Text>
                          <TextInput
                            style={[
                              styles.input,
                              {
                                color: theme.colors.text,
                                backgroundColor: theme.colors.background,
                              },
                            ]}
                            value={organizerData.website_url}
                            onChangeText={(text: string) =>
                              setOrganizerData({ ...organizerData, website_url: text })
                            }
                            placeholder="https://your-website.com"
                            placeholderTextColor={`${theme.colors.text}60`}
                            autoCapitalize="none"
                            keyboardType="url"
                          />
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: theme.colors.text }]}>
                            Event Types You Organize
                          </Text>
                          <View style={styles.eventTypesGrid}>
                            {EVENT_TYPE_OPTIONS.map(eventType => {
                              const isSelected = organizerData.event_types.includes(eventType)
                              return (
                                <TouchableOpacity
                                  key={eventType}
                                  style={[
                                    styles.eventTypeChip,
                                    {
                                      backgroundColor: isSelected
                                        ? theme.colors.primary
                                        : theme.colors.surface,
                                      borderColor: isSelected
                                        ? theme.colors.primary
                                        : `${theme.colors.text}20`,
                                    },
                                  ]}
                                  onPress={() => {
                                    setOrganizerData({
                                      ...organizerData,
                                      event_types: isSelected
                                        ? organizerData.event_types.filter(t => t !== eventType)
                                        : [...organizerData.event_types, eventType],
                                    })
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.eventTypeText,
                                      { color: isSelected ? '#fff' : theme.colors.text },
                                    ]}
                                  >
                                    {eventType}
                                  </Text>
                                </TouchableOpacity>
                              )
                            })}
                          </View>
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: theme.colors.text }]}>
                            About Your Organization
                          </Text>
                          <TextInput
                            style={[
                              styles.textArea,
                              {
                                color: theme.colors.text,
                                backgroundColor: theme.colors.background,
                              },
                            ]}
                            value={organizerData.organizer_bio}
                            onChangeText={(text: string) =>
                              setOrganizerData({ ...organizerData, organizer_bio: text })
                            }
                            placeholder="Tell dancers about your organization and what makes your events special..."
                            placeholderTextColor={`${theme.colors.text}60`}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                          />
                        </View>

                        {user.organizer_rejection_reason && (
                          <View
                            style={[
                              styles.rejectionNotice,
                              { backgroundColor: `${theme.colors.error}10` },
                            ]}
                          >
                            <Feather name="alert-circle" size={16} color={theme.colors.error} />
                            <Text
                              style={[styles.rejectionNoticeText, { color: theme.colors.error }]}
                            >
                              Previous application was rejected: {user.organizer_rejection_reason}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                <ProfileForm
                  initialData={user || {}}
                  onComplete={async () => {
                    // This won't be called since we're hiding the internal save button
                    // All saves go through the handleSave function
                  }}
                  onDataChange={handleProfileDataChange}
                  isOnboarding={false}
                  hideSubmitButton={true}
                />
                <View style={{ height: 120 }} />
              </ScrollView>
              {/* Sticky Save Button */}
              {!showOrganizerForm && (
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={[styles.saveButton, (!hasChanges || saving) && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={!hasChanges || saving}
                  >
                    <LinearGradient
                      colors={
                        !hasChanges
                          ? [theme.colors.surface, theme.colors.background]
                          : [theme.colors.primary, theme.colors.secondary]
                      }
                      style={styles.saveButtonGradient}
                    >
                      {saving ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  organizerSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  organizerCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  organizerCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  organizerCardDescription: {
    fontSize: 14,
  },
  statusSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
  },
  rejectionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  rejectionText: {
    fontSize: 14,
    marginBottom: 12,
  },
  reapplyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  organizerFieldsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  organizerFieldsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  organizerFieldsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  organizerFields: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  textArea: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 100,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rejectionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  rejectionNoticeText: {
    fontSize: 13,
    flex: 1,
  },
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  eventTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  eventTypeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  saveButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})
