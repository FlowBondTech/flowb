import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSupabaseAuth } from '../providers/SupabaseAuthProvider'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useWalletManager } from '../hooks/useWalletManager'
import { useStripePayments } from '../services/stripePayments'
import { designSystem } from '../styles/designSystem'

type SubscriptionTier = 'free' | 'pro'
type PaymentMethod = 'card' | 'wallet' | 'danz'

export const SubscriptionScreen: React.FC = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const navigation = useNavigation()
  const { getAccessToken } = useSupabaseAuth()
  const { totalBalanceUsd, getDefaultWallet } = useWalletManager()
  const { subscribe } = useStripePayments()
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('free')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Get user's DANZ token balance (TODO: integrate with actual token balance)
  const danzBalance = 0 // Placeholder - would come from wallet/token balance

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.goBack()
  }

  const tiers = [
    {
      id: 'free' as SubscriptionTier,
      name: 'Free',
      price: 0,
      priceUSD: '$0',
      color: '#94a3b8',
      icon: '🌱',
      benefits: [
        'Join 3 events per month',
        'Earn up to 100 DANZ/month',
        'Community feed access',
        'Basic achievements',
      ],
      limitations: ['Limited events', 'Basic rewards'],
    },
    {
      id: 'pro' as SubscriptionTier,
      name: 'Pro',
      price: 9.99,
      priceUSD: '$9.99',
      color: designSystem.colors.primary,
      icon: '💃',
      popular: true,
      benefits: [
        'Unlimited events',
        'Unlimited DANZ earning',
        '2x reward multiplier',
        'Priority booking',
        'Exclusive challenges',
        'Pro badge',
      ],
      limitations: [],
    },
  ]

  const faqs = [
    {
      question: 'Can I change my subscription anytime?',
      answer:
        'Yes! You can upgrade or downgrade your subscription at any time. Changes take effect at the next billing cycle.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept credit/debit cards via Stripe, crypto payments from your embedded wallet (ETH, SOL), or you can pay with your earned $DANZ tokens.',
    },
    {
      question: 'Do unused benefits roll over?',
      answer:
        'Event passes and monthly DANZ earning limits reset each month. Earned DANZ tokens remain in your wallet forever.',
    },
    {
      question: 'Can I pay with my earned $DANZ?',
      answer:
        'Yes! Use your earned $DANZ tokens to pay for subscriptions. This is a great way to level up while dancing more!',
    },
  ]

  const handleSelectTier = (tier: SubscriptionTier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedTier(tier)
  }

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    if (selectedTier === 'free') {
      Alert.alert('Already Free', "You're already on the free tier!")
      return
    }

    const tier = tiers.find(t => t.id === selectedTier)
    if (!tier) return

    // Check if user is already on this tier
    // TODO: Get current subscription tier from user profile
    const currentTier = 'free' as string
    if (currentTier === selectedTier) {
      Alert.alert('Current Plan', `You're already on the ${selectedTier} plan!`)
      return
    }

    // Payment method specific validation
    if (paymentMethod === 'wallet') {
      const defaultWallet = getDefaultWallet('ethereum') || getDefaultWallet('solana')
      if (!defaultWallet || parseFloat(defaultWallet.balanceUsd) < tier.price) {
        Toast.show({
          type: 'error',
          text1: 'Insufficient Balance',
          text2: `You need at least $${tier.price} in your wallet`,
        })
        return
      }
    }

    if (paymentMethod === 'danz') {
      // TODO: Calculate DANZ required based on current token price
      const danzRequired = tier.price * 10 // Example: 1 DANZ = $0.10
      if (danzBalance < danzRequired) {
        Toast.show({
          type: 'error',
          text1: 'Insufficient $DANZ',
          text2: `You need ${danzRequired} $DANZ tokens`,
        })
        return
      }
    }

    // Confirm and process
    const paymentLabel =
      paymentMethod === 'card'
        ? 'credit card'
        : paymentMethod === 'wallet'
          ? 'wallet'
          : '$DANZ tokens'

    Alert.alert(`Subscribe to ${tier.name}`, `Pay $${tier.price}/month with ${paymentLabel}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Subscribe',
        onPress: async () => {
          setIsProcessing(true)
          try {
            if (paymentMethod === 'card') {
              // Get auth token for API call
              const authToken = await getAccessToken()
              if (!authToken) {
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Please log in to subscribe',
                })
                return
              }

              // Process subscription with Stripe Checkout
              const result = await subscribe('monthly', authToken)

              if (result.success) {
                Toast.show({
                  type: 'success',
                  text1: 'Checkout Started',
                  text2: 'Complete payment in browser to activate subscription',
                })
                navigation.goBack()
              } else if (result.error !== 'Checkout cancelled') {
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: result.error || 'Subscription failed',
                })
              }
            } else if (paymentMethod === 'wallet') {
              // Process with embedded wallet
              // TODO: Implement wallet payment via BasePay or direct transfer
              Toast.show({
                type: 'info',
                text1: 'Wallet Payment',
                text2: 'Coming soon with BasePay integration',
              })
            } else if (paymentMethod === 'danz') {
              // Process with $DANZ tokens
              // TODO: Implement token-based subscription payment
              Toast.show({
                type: 'info',
                text1: '$DANZ Payment',
                text2: 'Token payments coming soon!',
              })
            }
          } catch (error) {
            console.error('Subscription error:', error)
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Something went wrong. Please try again.',
            })
          } finally {
            setIsProcessing(false)
          }
        },
      },
    ])
  }

  const renderTier = (tier: (typeof tiers)[0]) => {
    const isSelected = selectedTier === tier.id
    // TODO: Get current subscription tier from user profile
    const isCurrent = 'free' === tier.id

    return (
      <TouchableOpacity
        key={tier.id}
        style={[
          styles.tierCard,
          isSelected && styles.tierCardSelected,
          tier.popular && styles.tierCardPopular,
        ]}
        onPress={() => handleSelectTier(tier.id)}
        activeOpacity={0.8}
      >
        {tier.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}

        {isCurrent && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>CURRENT</Text>
          </View>
        )}

        <View style={styles.tierHeader}>
          <Text style={styles.tierIcon}>{tier.icon}</Text>
          <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
          <Text style={styles.tierPrice}>{tier.priceUSD}</Text>
          <Text style={styles.tierPriceLabel}>per month</Text>
        </View>

        <View style={styles.tierBenefits}>
          {tier.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={tier.color} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}

          {tier.limitations.map((limitation, index) => (
            <View key={`limit-${index}`} style={styles.benefitRow}>
              <Ionicons name="close-circle" size={16} color={designSystem.colors.textSecondary} />
              <Text style={styles.limitationText}>{limitation}</Text>
            </View>
          ))}
        </View>

        {isSelected && (
          <LinearGradient
            colors={[`${tier.color}20`, `${tier.color}10`]}
            style={styles.selectedGlow}
          />
        )}
      </TouchableOpacity>
    )
  }

  const renderPaymentMethods = () => {
    const defaultWallet = getDefaultWallet('ethereum') || getDefaultWallet('solana')
    const hasWalletBalance = defaultWallet && parseFloat(defaultWallet.balanceUsd) > 0
    const hasDanzBalance = danzBalance > 0

    return (
      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Payment Method</Text>

        <View style={styles.paymentMethodsGrid}>
          {/* Credit Card via Stripe */}
          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              paymentMethod === 'card' && styles.paymentMethodSelected,
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <FontAwesome5 name="credit-card" size={24} color={designSystem.colors.text} />
            <Text style={styles.paymentMethodText}>Card</Text>
            <Text style={styles.paymentMethodSubtext}>Visa, MC, Amex</Text>
          </TouchableOpacity>

          {/* Crypto Wallet via Privy */}
          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              paymentMethod === 'wallet' && styles.paymentMethodSelected,
              !hasWalletBalance && styles.paymentMethodDisabled,
            ]}
            onPress={() => hasWalletBalance && setPaymentMethod('wallet')}
            disabled={!hasWalletBalance}
          >
            <Ionicons
              name="wallet"
              size={24}
              color={
                hasWalletBalance ? designSystem.colors.text : designSystem.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.paymentMethodText,
                !hasWalletBalance && styles.paymentMethodTextDisabled,
              ]}
            >
              Wallet
            </Text>
            <Text style={styles.paymentMethodSubtext}>
              {hasWalletBalance ? `$${totalBalanceUsd}` : 'No balance'}
            </Text>
          </TouchableOpacity>

          {/* $DANZ Token Balance */}
          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              paymentMethod === 'danz' && styles.paymentMethodSelected,
              !hasDanzBalance && styles.paymentMethodDisabled,
            ]}
            onPress={() => hasDanzBalance && setPaymentMethod('danz')}
            disabled={!hasDanzBalance}
          >
            <Text
              style={[
                styles.paymentMethodEmoji,
                !hasDanzBalance && styles.paymentMethodTextDisabled,
              ]}
            >
              💃
            </Text>
            <Text
              style={[
                styles.paymentMethodText,
                !hasDanzBalance && styles.paymentMethodTextDisabled,
              ]}
            >
              $DANZ
            </Text>
            <Text style={styles.paymentMethodSubtext}>
              {hasDanzBalance ? `${danzBalance} tokens` : 'Earn more!'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderFAQ = () => (
    <View style={styles.faqSection}>
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

      {faqs.map((faq, index) => (
        <TouchableOpacity
          key={index}
          style={styles.faqItem}
          onPress={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
        >
          <View style={styles.faqHeader}>
            <Text style={styles.faqQuestion}>{faq.question}</Text>
            <Ionicons
              name={expandedFAQ === index ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={designSystem.colors.textSecondary}
            />
          </View>

          {expandedFAQ === index && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.modalHeader}>
        <View style={styles.dragIndicator} />
        <View style={styles.headerRow}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Subscription Plans</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Unlock your full dance potential with premium benefits
          </Text>
        </View>

        <View style={styles.tiersContainer}>{tiers.map(renderTier)}</View>

        {renderPaymentMethods()}

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            (selectedTier === 'free' || isProcessing) && styles.subscribeButtonDisabled,
          ]}
          onPress={handleSubscribe}
          disabled={selectedTier === 'free' || isProcessing}
        >
          <LinearGradient
            colors={[designSystem.colors.primary, designSystem.colors.secondary]}
            style={styles.subscribeButtonGradient}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {selectedTier === 'free'
                  ? 'Already on Free Tier'
                  : `Subscribe to ${tiers.find(t => t.id === selectedTier)?.name}`}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {renderFAQ()}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    padding: 4,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  tiersContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  tierCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  tierCardSelected: {
    borderColor: designSystem.colors.primary,
    backgroundColor: 'rgba(255, 110, 199, 0.05)',
  },
  tierCardPopular: {
    borderColor: designSystem.colors.accent,
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: 20,
    backgroundColor: designSystem.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  currentBadge: {
    position: 'absolute',
    top: -1,
    left: 20,
    backgroundColor: designSystem.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  tierHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tierIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tierPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: designSystem.colors.text,
  },
  tierPriceLabel: {
    fontSize: 14,
    color: designSystem.colors.textSecondary,
  },
  tierBenefits: {
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: designSystem.colors.text,
    flex: 1,
  },
  limitationText: {
    fontSize: 14,
    color: designSystem.colors.textSecondary,
    flex: 1,
  },
  selectedGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  paymentSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designSystem.colors.text,
    marginBottom: 16,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 100,
  },
  paymentMethodSelected: {
    borderColor: designSystem.colors.primary,
    backgroundColor: 'rgba(255, 110, 199, 0.05)',
  },
  paymentMethodDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '600',
    color: designSystem.colors.text,
    marginTop: 8,
  },
  paymentMethodTextDisabled: {
    color: designSystem.colors.textSecondary,
  },
  paymentMethodSubtext: {
    fontSize: 11,
    color: designSystem.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  paymentMethodEmoji: {
    fontSize: 24,
  },
  subscribeButton: {
    marginHorizontal: 24,
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  faqSection: {
    paddingHorizontal: 24,
    marginTop: 48,
  },
  faqItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: designSystem.colors.text,
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    color: designSystem.colors.textSecondary,
    marginTop: 12,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 100,
  },
})
