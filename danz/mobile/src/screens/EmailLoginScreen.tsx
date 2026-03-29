import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { designSystem } from '../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../styles/responsive'

interface EmailLoginScreenProps {
  onSuccess: () => void
  onBack: () => void
}

export const EmailLoginScreen: React.FC<EmailLoginScreenProps> = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // Supabase OTP auth replaces Privy's useLoginWithEmail

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const codeInputRefs = useRef<TextInput[]>([])

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const trimmed = email.trim()
    // Basic email regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(trimmed)
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, slideAnim])

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleSendCode = async () => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address')
      return
    }

    try {
      setIsLoading(true)

      const { error } = await supabase.auth.signInWithOtp({ email: trimmedEmail })
      if (error) throw error

      // Update email to trimmed version
      setEmail(trimmedEmail)
      setStep('code')
      setResendTimer(60)

      // Animate transition to code screen
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          // Focus first code input after animation
          setTimeout(() => {
            codeInputRefs.current[0]?.focus()
          }, 100)
        })
      })
    } catch (error) {
      console.error('Failed to send code:', error)
      const errorMessage =
        (error as any)?.message || 'Failed to send verification code. Please try again.'
      Alert.alert('Error', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (codeToVerify?: string) => {
    const trimmedCode = (codeToVerify || code).trim()
    if (!trimmedCode || trimmedCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter all 6 digits of the verification code')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: trimmedCode,
        type: 'email',
      })
      if (error) throw error

      // Auth state change will propagate via SupabaseAuthProvider
      onSuccess()
    } catch (error) {
      console.error('Failed to verify code:', error)
      const errorMessage = (error as any)?.message || 'Invalid verification code. Please try again.'
      Alert.alert('Verification Failed', errorMessage)

      // Clear the code for retry
      setCode('')
      // Focus first input for retry
      setTimeout(() => {
        codeInputRefs.current[0]?.focus()
      }, 500)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendTimer > 0) return

    try {
      setIsLoading(true)

      // Clear the existing code
      setCode('')

      // Send new code
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
      if (error) throw error
      setResendTimer(60)

      Alert.alert('Success', 'A new verification code has been sent to your email')

      // Focus the first input field
      setTimeout(() => {
        codeInputRefs.current[0]?.focus()
      }, 500)
    } catch (error) {
      console.error('Failed to resend code:', error)
      const errorMessage = (error as any)?.message || 'Failed to resend code. Please try again.'
      Alert.alert('Error', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeInput = (value: string, index: number) => {
    // Check if user pasted a full code
    if (value.length > 1) {
      // User pasted multiple digits, fill all inputs
      const pastedCode = value.replace(/\D/g, '').slice(0, 6)
      setCode(pastedCode)

      // Auto-submit if full code is pasted
      if (pastedCode.length === 6) {
        Keyboard.dismiss()
        setIsLoading(true)
        handleVerifyCode(pastedCode)
      } else if (pastedCode.length > 0) {
        codeInputRefs.current[pastedCode.length - 1]?.focus()
      }
      return
    }

    // Single digit input - build the complete code from existing code array
    const codeArray = code.padEnd(6, ' ').split('')
    codeArray[index] = value
    const newCode = codeArray.join('').trim()
    setCode(newCode)

    // Auto-focus next input or auto-submit when complete
    if (value) {
      if (index < 5) {
        codeInputRefs.current[index + 1]?.focus()
      } else if (index === 5 && newCode.length === 6) {
        Keyboard.dismiss()
        setIsLoading(true)
        handleVerifyCode(newCode)
      }
    }
  }

  const renderEmailStep = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[designSystem.colors.primary, designSystem.colors.secondary]}
          style={styles.iconGradient}
        >
          <Ionicons name="mail" size={40} color="#FFFFFF" />
        </LinearGradient>
      </View>

      <Text style={styles.title}>Enter Your Email</Text>
      <Text style={styles.subtitle}>We'll send you a verification code to sign in</Text>

      <View style={styles.inputContainer}>
        <View style={styles.emailInputWrapper}>
          <TextInput
            style={[
              styles.emailInput,
              email && isValidEmail(email) && styles.emailInputValid,
              email && !isValidEmail(email) && styles.emailInputInvalid,
            ]}
            placeholder="your@email.com"
            placeholderTextColor={designSystem.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isLoading}
          />
          {email && (
            <View style={styles.emailValidationIcon}>
              {isValidEmail(email) ? (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              ) : (
                <Ionicons name="close-circle" size={20} color={designSystem.colors.textSecondary} />
              )}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          (!isValidEmail(email) || isLoading) && styles.disabledButton,
        ]}
        onPress={handleSendCode}
        disabled={!isValidEmail(email) || isLoading}
      >
        <LinearGradient
          colors={[designSystem.colors.primary, designSystem.colors.secondary]}
          style={styles.buttonGradient}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.buttonText}>Send Verification Code</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  )

  const renderCodeStep = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[designSystem.colors.primary, designSystem.colors.secondary]}
          style={styles.iconGradient}
        >
          <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
        </LinearGradient>
      </View>

      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
      <Text style={styles.emailDisplay}>{email}</Text>

      <View style={styles.codeInputContainer}>
        {[0, 1, 2, 3, 4, 5].map(index => (
          <TextInput
            key={index}
            ref={ref => {
              if (ref) codeInputRefs.current[index] = ref
            }}
            style={[
              styles.codeInput,
              code[index] && styles.codeInputFilled,
              isLoading && styles.codeInputDisabled,
            ]}
            maxLength={1}
            keyboardType="number-pad"
            value={code[index] || ''}
            onChangeText={value => handleCodeInput(value, index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
                // Move to previous input and clear it
                const prevIndex = index - 1
                const codeArray = code.padEnd(6, ' ').split('')
                codeArray[prevIndex] = ''
                setCode(codeArray.join('').trim())
                codeInputRefs.current[prevIndex]?.focus()
              }
            }}
            editable={!isLoading}
            selectTextOnFocus
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          (code.trim().length !== 6 || isLoading) && styles.disabledButton,
        ]}
        onPress={() => handleVerifyCode()}
        disabled={code.trim().length !== 6 || isLoading}
      >
        <LinearGradient
          colors={[designSystem.colors.primary, designSystem.colors.secondary]}
          style={styles.buttonGradient}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.buttonText}>Verify & Sign In</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResendCode}
        disabled={resendTimer > 0 || isLoading}
      >
        <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
          {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend verification code'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.changeEmailButton}
        onPress={() => {
          setStep('email')
          setCode('')
          setResendTimer(0)
        }}
        disabled={isLoading}
      >
        <Text style={styles.changeEmailText}>Change email address</Text>
      </TouchableOpacity>
    </Animated.View>
  )

  return (
    <LinearGradient
      colors={[designSystem.colors.background, designSystem.colors.surface]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={isLoading}>
          <Ionicons name="arrow-back" size={24} color={designSystem.colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          {step === 'email' ? renderEmailStep() : renderCodeStep()}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: verticalScale(60),
    left: scale(20),
    zIndex: 10,
    padding: scale(8),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: verticalScale(30),
  },
  iconGradient: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: designSystem.colors.text,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: designSystem.colors.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  emailDisplay: {
    fontSize: moderateScale(16),
    color: designSystem.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: verticalScale(30),
  },
  inputContainer: {
    marginTop: verticalScale(30),
    marginBottom: verticalScale(24),
    width: '100%',
  },
  emailInputWrapper: {
    position: 'relative',
    width: '100%',
  },
  emailInput: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: scale(12),
    padding: scale(16),
    paddingRight: scale(45),
    fontSize: moderateScale(16),
    color: designSystem.colors.text,
    borderWidth: 1,
    borderColor: `${designSystem.colors.textSecondary}20`,
    width: '100%',
  },
  emailInputValid: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  emailInputInvalid: {
    borderColor: `${designSystem.colors.textSecondary}40`,
  },
  emailValidationIcon: {
    position: 'absolute',
    right: scale(15),
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(8),
    marginVertical: verticalScale(30),
  },
  codeInput: {
    width: scale(45),
    height: scale(50),
    backgroundColor: designSystem.colors.surface,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: `${designSystem.colors.textSecondary}20`,
    fontSize: moderateScale(20),
    textAlign: 'center',
    color: designSystem.colors.text,
  },
  codeInputFilled: {
    borderColor: designSystem.colors.primary,
    borderWidth: 2,
    backgroundColor: `${designSystem.colors.primary}10`,
  },
  codeInputDisabled: {
    opacity: 0.5,
  },
  continueButton: {
    width: '100%',
    marginTop: verticalScale(12),
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  resendButton: {
    marginTop: verticalScale(20),
    padding: scale(12),
  },
  resendText: {
    color: designSystem.colors.primary,
    fontSize: moderateScale(14),
    textAlign: 'center',
  },
  resendTextDisabled: {
    color: designSystem.colors.textSecondary,
  },
  changeEmailButton: {
    marginTop: verticalScale(8),
    padding: scale(12),
  },
  changeEmailText: {
    color: designSystem.colors.textSecondary,
    fontSize: moderateScale(14),
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
})
