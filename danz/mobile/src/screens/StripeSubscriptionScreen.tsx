import { Ionicons } from '@expo/vector-icons'
import { useSupabaseAuth } from '../providers/SupabaseAuthProvider'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { GradientButton } from '../components/ui/AnimatedComponents'
import { subscriptionTiers } from '../config/stripe'
import { useAuth } from '../contexts/AuthContext'
import { useStripePayments } from '../services/stripePayments'
import { designSystem } from '../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../styles/responsive'

interface StripeSubscriptionScreenProps {
  navigation: any
}

export const StripeSubscriptionScreen: React.FC<StripeSubscriptionScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth()
  const { getAccessToken } = useSupabaseAuth()
  const [selectedTier, setSelectedTier] = useState<keyof typeof subscriptionTiers>('monthly')
  const [isProcessing, setIsProcessing] = useState(false)

  const { subscribe, manageSubscription } = useStripePayments()

  const currentTier: keyof typeof subscriptionTiers = 'free' // TODO: Get from user profile
  const isPremium = currentTier !== 'free'

  const handleSubscribe = async () => {
    if (!user?.privy_id) {
      Alert.alert('Error', 'Please log in to subscribe')
      return
    }

    if (selectedTier === 'free') {
      Alert.alert('Info', "Free tier doesn't require payment")
      return
    }

    try {
      setIsProcessing(true)
      const authToken = await getAccessToken()
      if (!authToken) {
        Alert.alert('Error', 'Please log in to subscribe')
        return
      }

      // Pass the selected tier (monthly or yearly) to subscribe
      const plan = selectedTier as 'monthly' | 'yearly'
      const result = await subscribe(plan, authToken)

      if (result.success) {
        Alert.alert(
          'Checkout Started',
          'Complete payment in browser to activate your subscription.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        )
      } else if (result.error !== 'Checkout cancelled') {
        Alert.alert('Subscription Failed', result.error || 'Something went wrong. Please try again.')
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      Alert.alert('Subscription Failed', error.message || 'Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      setIsProcessing(true)
      const authToken = await getAccessToken()
      if (!authToken) {
        Alert.alert('Error', 'Please log in to manage subscription')
        return
      }

      const result = await manageSubscription(authToken)
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to open subscription portal')
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to open subscription portal')
    } finally {
      setIsProcessing(false)
    }
  }

  const renderTierCard = (tierKey: keyof typeof subscriptionTiers) => {
    const tier = subscriptionTiers[tierKey]
    const isCurrentTier = currentTier === tierKey
    const isSelected = selectedTier === tierKey

    return (
      <TouchableOpacity
        key={tierKey}
        style={[
          styles.tierCard,
          isSelected && styles.selectedTierCard,
          isCurrentTier && styles.currentTierCard,
        ]}
        onPress={() => setSelectedTier(tierKey)}
        disabled={isCurrentTier}
      >
        {isCurrentTier && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>CURRENT</Text>
          </View>
        )}

        <View style={styles.tierHeader}>
          <Text style={styles.tierName}>{tier.name}</Text>
          <Text style={styles.tierPrice}>{tier.price === 0 ? 'Free' : `$${tier.price}/mo`}</Text>
        </View>

        <View style={styles.tierFeatures}>
          {tier.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={designSystem.colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isSelected && !isCurrentTier && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[designSystem.colors.background, designSystem.colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={designSystem.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Unlock Your Full Potential</Text>
          <Text style={styles.introSubtitle}>Choose the plan that fits your dance journey</Text>
        </View>

        {/* Tier Cards */}
        <View style={styles.tiersContainer}>
          {Object.keys(subscriptionTiers).map(tierKey =>
            renderTierCard(tierKey as keyof typeof subscriptionTiers),
          )}
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>All Plans Include</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark" size={20} color={designSystem.colors.primary} />
              <Text style={styles.benefitText}>Secure payment processing</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="refresh" size={20} color={designSystem.colors.primary} />
              <Text style={styles.benefitText}>Cancel anytime</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="star" size={20} color={designSystem.colors.primary} />
              <Text style={styles.benefitText}>Instant access to features</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      <View style={styles.footer}>
        {isPremium && (
          <TouchableOpacity
            style={styles.manageSubscriptionButton}
            onPress={handleManageSubscription}
            disabled={isProcessing}
          >
            <Text style={styles.manageSubscriptionText}>Manage Subscription</Text>
          </TouchableOpacity>
        )}

        {selectedTier !== 'free' && (
          <GradientButton
            title={isProcessing ? 'Processing...' : `Subscribe to ${subscriptionTiers[selectedTier].name}`}
            onPress={handleSubscribe}
            disabled={isProcessing}
            style={styles.subscribeButton}
          />
        )}
      </View>
    </View>
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
    paddingTop: verticalScale(50),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: designSystem.colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(100),
  },
  intro: {
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  introTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: designSystem.colors.text,
    marginBottom: verticalScale(8),
  },
  introSubtitle: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    textAlign: 'center',
  },
  tiersContainer: {
    marginBottom: verticalScale(30),
  },
  tierCard: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: verticalScale(16),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTierCard: {
    borderColor: designSystem.colors.primary,
  },
  currentTierCard: {
    opacity: 0.7,
  },
  currentBadge: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    backgroundColor: designSystem.colors.success,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(4),
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(10),
    fontWeight: 'bold',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  tierName: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: designSystem.colors.text,
  },
  tierPrice: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: designSystem.colors.primary,
  },
  tierFeatures: {
    marginTop: verticalScale(8),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  featureText: {
    fontSize: moderateScale(13),
    color: designSystem.colors.textSecondary,
    marginLeft: scale(8),
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: scale(10),
    right: scale(10),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: designSystem.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitsSection: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: scale(16),
    padding: scale(20),
  },
  benefitsTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: designSystem.colors.text,
    marginBottom: verticalScale(16),
  },
  benefitsList: {
    gap: verticalScale(12),
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: moderateScale(13),
    color: designSystem.colors.textSecondary,
    marginLeft: scale(12),
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(30),
    paddingTop: verticalScale(10),
    backgroundColor: designSystem.colors.background,
  },
  subscribeButton: {
    marginTop: verticalScale(10),
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  manageSubscriptionButton: {
    alignItems: 'center',
    padding: verticalScale(10),
    marginBottom: verticalScale(10),
  },
  manageSubscriptionText: {
    color: designSystem.colors.primary,
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
})
