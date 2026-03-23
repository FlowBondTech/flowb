import { Ionicons } from '@expo/vector-icons'
import { useLoginWithOAuth, usePrivy } from '@privy-io/expo'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { GradientButton } from '../components/ui/AnimatedComponents'
import { useAuth } from '../contexts/AuthContext'
import { designSystem } from '../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../styles/responsive'
import { EmailLoginScreen } from './EmailLoginScreen'

// const { height } = Dimensions.get('window');

interface AuthScreenProps {
  navigation?: any
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const { isAuthenticated, user } = useAuth()

  const { isReady } = usePrivy()

  // OAuth login hook (Privy will handle provider selection)
  const { login: oauthLogin } = useLoginWithOAuth()

  const handlePrivyAuthentication = useCallback(async () => {
    try {
      setIsLoading(true)

      // Privy SDK handles token management internally
      // We just need to sync with our app state
      // The user object from Privy is already available

      if (user) {
        // Navigate to onboarding or main app based on user state
        if (navigation) {
          // Check if user needs onboarding
          if (!user || !(user as any).username) {
            navigation.navigate('Onboarding')
          } else {
            navigation.navigate('TabNavigator')
          }
        }
      }
    } catch (error) {
      console.error('Error during authentication sync:', error)
      Alert.alert('Error', 'Failed to complete authentication. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [user, navigation])

  // Auto-sync with backend when Privy auth changes
  useEffect(() => {
    if (user && !isAuthenticated) {
      // Only sync if Privy user exists but app state is not authenticated
      handlePrivyAuthentication()
    } else if (user && isAuthenticated) {
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'TabNavigator' }],
        })
      }
    }
  }, [user, isAuthenticated, navigation, handlePrivyAuthentication])

  const handleEmailLogin = () => {
    setShowEmailLogin(true)
  }

  const handleEmailLoginSuccess = async () => {
    setShowEmailLogin(false)
    // The Privy authentication will trigger the useEffect that calls handlePrivyAuthentication
  }

  const handleOAuthLogin = async (provider: 'google' | 'twitter' | 'discord') => {
    try {
      setIsLoading(true)
      await oauthLogin({ provider })
    } catch (error) {
      console.error('OAuth login error details:', error)
      Alert.alert(
        'Login Failed',
        (error as any)?.message ||
          `Failed to login with ${provider}. Please check your app configuration.`,
        [{ text: 'OK' }],
      )
    } finally {
      setIsLoading(false)
    }
  }

  // const handleWalletConnect = async () => {
  //   try {
  //     setIsLoading(true)
  //     // For wallet connection, we'd use the OAuth flow
  //     await oauthLogin({ provider: 'google' })
  //   } catch (error) {
  //     console.error('Wallet connection error details:', error)
  //     Alert.alert(
  //       'Connection Failed',
  //       (error as any)?.message || 'Failed to connect wallet. Please check your app configuration.',
  //       [{ text: 'OK' }],
  //     )
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  if (showEmailLogin) {
    return (
      <EmailLoginScreen
        onSuccess={handleEmailLoginSuccess}
        onBack={() => setShowEmailLogin(false)}
      />
    )
  }

  if (!isReady) {
    return (
      <LinearGradient
        colors={[designSystem.colors.background, designSystem.colors.surface]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designSystem.colors.primary} />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={[designSystem.colors.background, designSystem.colors.surface]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo and Branding */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/DANZ LOGO.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>DANZ</Text>
          <Text style={styles.subtitle}>Move. Connect. Earn.</Text>
        </View>

        {/* Auth Options */}
        <View style={styles.authContainer}>
          <Text style={styles.sectionTitle}>Get Started</Text>

          {/* Primary Login Button */}
          <GradientButton
            title="Continue with Email"
            onPress={handleEmailLogin}
            disabled={isLoading}
            style={styles.primaryButton}
            icon={<Ionicons name="mail" size={20} color="#FFFFFF" />}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Options */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleOAuthLogin('google')}
            disabled={isLoading}
          >
            <Image
              source={{ uri: 'https://www.google.com/favicon.ico' }}
              style={styles.socialIcon}
            />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Wallet Connect */}
          {/* <TouchableOpacity
            style={[styles.walletButton, isLoading && styles.disabledButton]}
            onPress={handleWalletConnect}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['rgba(255, 110, 199, 0.1)', 'rgba(185, 103, 255, 0.1)']}
              style={styles.walletButtonGradient}
            >
              <Ionicons name="wallet" size={20} color={designSystem.colors.primary} />
              <Text style={styles.walletButtonText}>Connect Wallet</Text>
            </LinearGradient>
          </TouchableOpacity> */}
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>💃</Text>
            <Text style={styles.benefitText}>Dance & Earn</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>🎯</Text>
            <Text style={styles.benefitText}>Join Events</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>💰</Text>
            <Text style={styles.benefitText}>Get Rewards</Text>
          </View>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: designSystem.colors.textSecondary,
    fontSize: moderateScale(14),
    marginTop: verticalScale(10),
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(60),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(40),
  },
  logo: {
    width: scale(80),
    height: scale(80),
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: designSystem.colors.text,
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: designSystem.colors.textSecondary,
  },
  authContainer: {
    marginBottom: verticalScale(30),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: designSystem.colors.text,
    marginBottom: verticalScale(20),
  },
  primaryButton: {
    marginBottom: verticalScale(16),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: scale(8),
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(20),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: (designSystem.colors as any).border || designSystem.colors.textSecondary,
    opacity: 0.2,
  },
  dividerText: {
    color: designSystem.colors.textSecondary,
    fontSize: moderateScale(12),
    marginHorizontal: scale(16),
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surface,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: (designSystem.colors as any).border || designSystem.colors.textSecondary,
    opacity: 0.9,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: scale(8),
  },
  socialButtonText: {
    color: designSystem.colors.text,
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  walletButton: {
    marginTop: verticalScale(8),
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  walletButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(14),
  },
  walletButtonText: {
    color: designSystem.colors.primary,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  disabledButton: {
    opacity: 0.5,
  },
  benefitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(30),
  },
  benefit: {
    alignItems: 'center',
  },
  benefitIcon: {
    fontSize: moderateScale(24),
    marginBottom: verticalScale(4),
  },
  benefitText: {
    color: designSystem.colors.textSecondary,
    fontSize: moderateScale(12),
  },
  terms: {
    color: designSystem.colors.textSecondary,
    fontSize: moderateScale(11),
    textAlign: 'center',
    lineHeight: moderateScale(16),
  },
})
