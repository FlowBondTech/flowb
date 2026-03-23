import { Feather } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React, { useState } from 'react'
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProfileForm } from '../components/profile/ProfileForm'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { LinearGradientCompat as LinearGradient } from '../utils/platformUtils'

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation()
  const { theme } = useTheme()
  const { user, updateProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [userType, setUserType] = useState<'attendee' | 'organizer' | null>(null)
  const fadeAnim = React.useRef(new Animated.Value(1)).current

  const handleSkipOnboarding = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'TabNavigator' as never }],
    })
  }

  const handleAttendeeComplete = async (userData: any) => {
    // Complete onboarding for both attendee and organizer
    try {
      // Role is set in ProfileForm based on isOrganizer flag
      await updateProfile(userData)
      navigateToApp()
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      throw error
    }
  }

  // Organizer onboarding is now handled by ProfileForm with isOrganizer flag

  const navigateToApp = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'TabNavigator' as never }],
      })
    })
  }

  const getWelcomeMessage = () => {
    if (userType === null) {
      return "Welcome to DANZ! Let's get started"
    }
    if (userType === 'organizer' && currentStep === 5) {
      return 'Tell us about your organization'
    }
    switch (currentStep) {
      case 0:
        return "Let's set up your profile"
      case 1:
        return 'Show your best moves to the community'
      case 2:
        return 'Tell us your story'
      case 3:
        return "What's your dance style?"
      case 4:
        return 'Connect with the community'
      default:
        return 'Welcome to DANZ!'
    }
  }

  return (
    <LinearGradient
      colors={['#1a0033', '#2d1b69', '#1a0033']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={{ width: 60 }} />
              <Image
                source={require('../../assets/DANZ LOGO.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <TouchableOpacity onPress={handleSkipOnboarding} style={styles.skipButton}>
                <Text style={[styles.skipText, { color: theme.colors.primary }]}>Skip</Text>
                <Feather name="arrow-right" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
              {getWelcomeMessage()}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {userType === null ? (
              // Role Selection
              <View style={styles.roleSelection}>
                <Text style={[styles.roleTitle, { color: theme.colors.text }]}>
                  How will you use DANZ?
                </Text>
                <Text style={[styles.roleSubtitle, { color: `${theme.colors.text}80` }]}>
                  Choose your role to get started
                </Text>

                <TouchableOpacity
                  style={[styles.roleCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setUserType('attendee')}
                >
                  <Feather name="users" size={32} color={theme.colors.primary} />
                  <Text style={[styles.roleCardTitle, { color: theme.colors.text }]}>
                    I'm a Dancer
                  </Text>
                  <Text style={[styles.roleCardDescription, { color: `${theme.colors.text}80` }]}>
                    Join events, connect with dancers, and share your journey
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setUserType('organizer')}
                >
                  <Feather name="calendar" size={32} color={theme.colors.primary} />
                  <Text style={[styles.roleCardTitle, { color: theme.colors.text }]}>
                    I'm an Organizer
                  </Text>
                  <Text style={[styles.roleCardDescription, { color: `${theme.colors.text}80` }]}>
                    Create events, manage registrations, and grow your community
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Regular profile form
              <ProfileForm
                initialData={user || {}}
                onComplete={handleAttendeeComplete}
                isOnboarding={true}
                currentStep={0}
                onStepChange={setCurrentStep}
                isOrganizer={userType === 'organizer'}
              />
            )}
          </View>
        </SafeAreaView>
      </Animated.View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 60,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  formContainer: {
    flex: 1,
  },
  roleSelection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  roleSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  roleCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  roleCardDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
