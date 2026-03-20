import { gql, useMutation } from '@apollo/client'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { useTheme } from '../contexts/ThemeContext'
import { designSystem } from '../styles/designSystem'

const SUBMIT_FEEDBACK = gql`
  mutation SubmitFeedback($input: SubmitFeedbackInput!) {
    submitFeedback(input: $input) {
      id
      message
      status
      created_at
    }
  }
`

export const FeedbackScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { theme } = useTheme()
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [submitFeedback] = useMutation(SUBMIT_FEEDBACK)

  const getDeviceInfo = () => {
    return `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'} - ${Platform.OS} ${Platform.Version}`
  }

  const getAppVersion = () => {
    return Constants.expoConfig?.version || '1.0.0'
  }

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: false,
    })

    if (!result.canceled && result.assets[0]) {
      setScreenshot(result.assets[0].uri)
    }
  }

  const handleTakeScreenshot = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Camera permission required',
        text2: 'Please enable camera access in settings',
      })
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    })

    if (!result.canceled && result.assets[0]) {
      setScreenshot(result.assets[0].uri)
    }
  }

  const handleRemoveScreenshot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setScreenshot(null)
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Message required',
        text2: 'Please describe your feedback',
      })
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsSubmitting(true)

    try {
      // TODO: If screenshot exists, upload to S3 first and get URL
      const screenshotUrl = screenshot ? null : null // Placeholder - implement S3 upload

      await submitFeedback({
        variables: {
          input: {
            message: message.trim(),
            screenshot_url: screenshotUrl,
            device_info: getDeviceInfo(),
            app_version: getAppVersion(),
          },
        },
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Toast.show({
        type: 'success',
        text1: 'Feedback Sent!',
        text2: 'Thank you for helping us improve DANZ',
      })

      navigation.goBack()
    } catch (error) {
      console.error('[FeedbackScreen] Submit error:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Toast.show({
        type: 'error',
        text1: 'Failed to send feedback',
        text2: 'Please try again later',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: designSystem.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            navigation.goBack()
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#B967FF" />
            <Text style={styles.infoText}>
              Your feedback helps us make DANZ better for everyone. Tell us about bugs, feature
              requests, or anything else!
            </Text>
          </View>

          {/* Message Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Your Feedback</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your feedback, bug report, or feature request..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{message.length} / 2000</Text>
          </View>

          {/* Screenshot Section */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Screenshot (Optional)</Text>

            {screenshot ? (
              <View style={styles.screenshotContainer}>
                <Image source={{ uri: screenshot }} style={styles.screenshotImage} />
                <TouchableOpacity style={styles.removeButton} onPress={handleRemoveScreenshot}>
                  <Ionicons name="close-circle" size={28} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.screenshotButtons}>
                <TouchableOpacity style={styles.screenshotButton} onPress={handlePickImage}>
                  <Ionicons name="image-outline" size={24} color="#B967FF" />
                  <Text style={styles.screenshotButtonText}>Choose Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.screenshotButton} onPress={handleTakeScreenshot}>
                  <Ionicons name="camera-outline" size={24} color="#B967FF" />
                  <Text style={styles.screenshotButtonText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Device Info */}
          <View style={styles.deviceInfoCard}>
            <Text style={styles.deviceInfoLabel}>Device Info (auto-attached)</Text>
            <Text style={styles.deviceInfoText}>{getDeviceInfo()}</Text>
            <Text style={styles.deviceInfoText}>App Version: {getAppVersion()}</Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting || !message.trim()}
          >
            <LinearGradient
              colors={message.trim() ? ['#B967FF', '#FF1493'] : ['#444', '#333']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text style={styles.submitText}>Send Feedback</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: designSystem.colors.text,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(185, 103, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: designSystem.colors.textSecondary,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: designSystem.colors.text,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    fontSize: 16,
    color: designSystem.colors.text,
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    color: designSystem.colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  screenshotContainer: {
    position: 'relative',
  },
  screenshotImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
  },
  screenshotButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  screenshotButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(185, 103, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(185, 103, 255, 0.3)',
    borderStyle: 'dashed',
    paddingVertical: 20,
  },
  screenshotButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B967FF',
  },
  deviceInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  deviceInfoLabel: {
    fontSize: 12,
    color: designSystem.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceInfoText: {
    fontSize: 13,
    color: designSystem.colors.text,
    marginBottom: 4,
  },
  submitContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})
