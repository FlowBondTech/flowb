import { Feather } from '@expo/vector-icons'
import type React from 'react'
import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { SkillLevel, useUpdateProfileMutation } from '../../generated/graphql'
import { useThemedStyles } from '../../hooks/useThemedStyles'

interface OrganizerOnboardingProps {
  onComplete: () => void
  initialData?: {
    username?: string
    display_name?: string
    bio?: string
    dance_styles?: string[]
    skill_level?: string
  }
}

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

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram' as const },
  { key: 'tiktok', label: 'TikTok', icon: 'music' as const },
  { key: 'youtube', label: 'YouTube', icon: 'youtube' as const },
  { key: 'twitter', label: 'Twitter', icon: 'twitter' as const },
  { key: 'facebook', label: 'Facebook', icon: 'facebook' as const },
]

export const OrganizerOnboarding: React.FC<OrganizerOnboardingProps> = ({
  onComplete,
  initialData,
}) => {
  const { styles, colors } = useThemedStyles()
  const [updateProfile] = useUpdateProfileMutation()

  const [formData, setFormData] = useState({
    // Basic info from attendee onboarding
    username: initialData?.username || '',
    display_name: initialData?.display_name || '',
    bio: initialData?.bio || '',
    dance_styles: initialData?.dance_styles || [],
    skill_level: (initialData?.skill_level || SkillLevel.Intermediate) as SkillLevel,

    // Organizer specific fields
    company_name: '',
    invited_by: '',
    event_types: [] as string[],
    website_url: '',
    organizer_bio: '',
    social_media_links: {} as Record<string, string>,
  })

  const [loading, setLoading] = useState(false)

  const handleEventTypeToggle = (eventType: string) => {
    setFormData(prev => ({
      ...prev,
      event_types: prev.event_types.includes(eventType)
        ? prev.event_types.filter(t => t !== eventType)
        : [...prev.event_types, eventType],
    }))
  }

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_media_links: {
        ...prev.social_media_links,
        [platform]: value,
      },
    }))
  }

  // Check if all required fields are filled
  const isFormValid = () => {
    return (
      formData.company_name.trim() !== '' &&
      formData.event_types.length > 0 &&
      formData.organizer_bio.trim() !== ''
    )
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.company_name) {
      Alert.alert('Required Field', 'Please enter your company or organization name')
      return
    }

    // Invited by is now optional - removed validation

    if (formData.event_types.length === 0) {
      Alert.alert('Required Field', 'Please select at least one type of event you organize')
      return
    }

    if (!formData.organizer_bio) {
      Alert.alert('Required Field', 'Please tell us about your organization')
      return
    }

    setLoading(true)
    try {
      // Update profile with organizer information
      // Note: The backend will automatically set role to 'organizer' when company_name is provided
      await updateProfile({
        variables: { input: formData },
      })

      Toast.show({
        type: 'success',
        text1: 'Application Submitted',
        text2: 'Your application will be reviewed within 24-48 hours',
      })

      Alert.alert(
        'Application Submitted',
        "Thank you for applying to become an organizer! Your role has been updated to 'Organizer (Pending Approval)'. Your application will be reviewed by our team within 24-48 hours. You'll receive a notification once approved, after which you can start creating events.",
        [{ text: 'OK', onPress: onComplete }],
      )
    } catch (error) {
      console.error('Error submitting organizer application:', error)
      Alert.alert('Error', 'Failed to submit your application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20 }}>
          <Text style={[styles.text, { fontSize: 28, fontWeight: 'bold', marginBottom: 10 }]}>
            Organizer Application
          </Text>
          <Text style={[styles.text, { marginBottom: 30, opacity: 0.7 }]}>
            Tell us about your events and organization
          </Text>

          {/* Company/Organization Name */}
          <View style={{ marginBottom: 25 }}>
            <Text style={[styles.text, { fontSize: 16, fontWeight: '600', marginBottom: 10 }]}>
              Company/Organization Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 15,
                },
              ]}
              value={formData.company_name}
              onChangeText={(text: string) =>
                setFormData(prev => ({ ...prev, company_name: text }))
              }
              placeholder="Enter your company or organization name"
              placeholderTextColor={`${colors.text}50`}
            />
          </View>

          {/* Who Invited You */}
          <View style={{ marginBottom: 25 }}>
            <Text style={[styles.text, { fontSize: 16, fontWeight: '600', marginBottom: 10 }]}>
              Who invited you to DANZ? (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 15,
                },
              ]}
              value={formData.invited_by}
              onChangeText={(text: string) => setFormData(prev => ({ ...prev, invited_by: text }))}
              placeholder="Name of person or organization"
              placeholderTextColor={`${colors.text}50`}
            />
          </View>

          {/* Event Types */}
          <View style={{ marginBottom: 25 }}>
            <Text style={[styles.text, { fontSize: 16, fontWeight: '600', marginBottom: 10 }]}>
              What types of events do you organize? *
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {EVENT_TYPE_OPTIONS.map(eventType => (
                <TouchableOpacity
                  key={eventType}
                  onPress={() => handleEventTypeToggle(eventType)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: formData.event_types.includes(eventType)
                      ? colors.primary
                      : colors.border,
                    backgroundColor: formData.event_types.includes(eventType)
                      ? `${colors.primary}20`
                      : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      color: formData.event_types.includes(eventType)
                        ? colors.primary
                        : colors.text,
                      fontSize: 14,
                    }}
                  >
                    {eventType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Website */}
          <View style={{ marginBottom: 25 }}>
            <Text style={[styles.text, { fontSize: 16, fontWeight: '600', marginBottom: 10 }]}>
              Website (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 15,
                },
              ]}
              value={formData.website_url}
              onChangeText={(text: string) => setFormData(prev => ({ ...prev, website_url: text }))}
              placeholder="https://www.example.com"
              placeholderTextColor={`${colors.text}50`}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Social Media Links */}
          <View style={{ marginBottom: 25 }}>
            <Text style={[styles.text, { fontSize: 16, fontWeight: '600', marginBottom: 10 }]}>
              Social Media (optional)
            </Text>
            {SOCIAL_PLATFORMS.map(platform => (
              <View key={platform.key} style={{ marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <Feather name={platform.icon} size={16} color={colors.text} />
                  <Text style={[styles.text, { marginLeft: 8 }]}>{platform.label}</Text>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                    },
                  ]}
                  value={formData.social_media_links[platform.key] || ''}
                  onChangeText={(text: string) => handleSocialMediaChange(platform.key, text)}
                  placeholder={`@username or profile URL`}
                  placeholderTextColor={`${colors.text}50`}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>

          {/* Organizer Bio */}
          <View style={{ marginBottom: 25 }}>
            <Text style={[styles.text, { fontSize: 16, fontWeight: '600', marginBottom: 10 }]}>
              Tell us about your events *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 15,
                  minHeight: 100,
                  textAlignVertical: 'top',
                },
              ]}
              value={formData.organizer_bio}
              onChangeText={(text: string) =>
                setFormData(prev => ({ ...prev, organizer_bio: text }))
              }
              placeholder="Describe your events, experience, and what makes them special..."
              placeholderTextColor={`${colors.text}50`}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                opacity: loading || !isFormValid() ? 0.5 : 1,
                marginTop: 20,
                marginBottom: 40,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading || !isFormValid()}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
