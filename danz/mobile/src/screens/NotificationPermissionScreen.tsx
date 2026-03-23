import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { theme } from '../styles/theme'

export const NotificationPermissionScreen = () => {
  const navigation = useNavigation()
  const [isLoading, setIsLoading] = useState(false)

  const requestPermissions = async () => {
    setIsLoading(true)

    // Simulate permission request for now
    setTimeout(() => {
      Alert.alert(
        'Notifications Enabled!',
        'You will receive updates about rewards and challenges.',
        [{ text: 'Continue', onPress: () => navigation.navigate('Subscription' as never) }],
      )
      setIsLoading(false)
    }, 1000)
  }

  const skipNotifications = () => {
    navigation.navigate('Subscription' as never)
  }

  return (
    <LinearGradient colors={[theme.colors.background, '#0f0f1e']} style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Text style={styles.icon}>🔔</Text>
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>Stay in the Loop</Text>
        <Text style={styles.subtitle}>Get notified about rewards, challenges, and events</Text>

        {/* Features */}
        <View style={styles.features}>
          {[
            { icon: '💰', text: 'Instant reward notifications' },
            { icon: '🎯', text: 'Daily challenge reminders' },
            { icon: '🎉', text: 'Exclusive event invites' },
            { icon: '📈', text: 'Earning milestones' },
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity onPress={requestPermissions} disabled={isLoading} activeOpacity={0.8}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Setting up...' : 'Enable Notifications'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={skipNotifications}
            style={styles.secondaryButton}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>

        {/* Note */}
        <Text style={styles.note}>You can change this anytime in settings</Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    color: theme.colors.text,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  features: {
    width: '100%',
    marginBottom: theme.spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 103, 255, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  buttons: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  primaryButton: {
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  note: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    opacity: 0.7,
    textAlign: 'center',
  },
})
