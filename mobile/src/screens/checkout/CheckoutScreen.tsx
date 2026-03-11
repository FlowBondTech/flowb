/**
 * CheckoutScreen
 *
 * Payment flow screen supporting multiple payment methods:
 * - Stripe (card payments)
 * - Apple Pay
 * - WalletConnect (crypto wallets)
 * - USDC direct transfer
 * - Crypto swap
 * - Telegram Stars
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassPill } from '../../components/glass/GlassPill';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';
import type { Product, PaymentMethod, PaymentNetwork, PaymentIntent } from '../../api/types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CheckoutRouteProp = RouteProp<RootStackParamList, 'Checkout'>;

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  color: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'apple_pay',
    label: 'Apple Pay',
    icon: 'logo-apple',
    description: 'Quick and secure',
    color: colors.text.primary,
  },
  {
    id: 'stripe',
    label: 'Card',
    icon: 'card-outline',
    description: 'Credit or debit card',
    color: colors.accent.primary,
  },
  {
    id: 'walletconnect',
    label: 'Wallet',
    icon: 'wallet-outline',
    description: 'Connect crypto wallet',
    color: colors.accent.cyan,
  },
  {
    id: 'usdc_direct',
    label: 'USDC',
    icon: 'logo-usd',
    description: 'Direct transfer',
    color: colors.accent.emerald,
  },
  {
    id: 'telegram_stars',
    label: 'Stars',
    icon: 'star-outline',
    description: 'Telegram Stars',
    color: colors.accent.amber,
  },
];

const NETWORKS: Array<{ id: PaymentNetwork; name: string; chainId: number }> = [
  { id: 'base', name: 'Base', chainId: 8453 },
  { id: 'ethereum', name: 'Ethereum', chainId: 1 },
  { id: 'polygon', name: 'Polygon', chainId: 137 },
  { id: 'arbitrum', name: 'Arbitrum', chainId: 42161 },
  { id: 'optimism', name: 'Optimism', chainId: 10 },
];

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<CheckoutRouteProp>();
  const { productSlug } = route.params;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<PaymentNetwork>('base');
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProduct(productSlug);
        setProduct(data.product);
      } catch (err) {
        console.error('[Checkout] Failed to load product:', err);
        Alert.alert('Error', 'Failed to load product');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [productSlug, navigation]);

  const handlePaymentSelect = useCallback((method: PaymentMethod) => {
    haptics.select();
    setSelectedPayment(method);
    setPaymentIntent(null);
  }, []);

  const handleNetworkSelect = useCallback((network: PaymentNetwork) => {
    haptics.select();
    setSelectedNetwork(network);
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!selectedPayment || !product) return;

    haptics.heavy();
    setProcessing(true);

    try {
      const intent = await api.createCheckout({
        productSlug: product.slug,
        paymentMethod: selectedPayment,
        network: ['walletconnect', 'usdc_direct', 'crypto_swap'].includes(selectedPayment)
          ? selectedNetwork
          : undefined,
      });

      setPaymentIntent(intent);

      switch (selectedPayment) {
        case 'stripe':
        case 'apple_pay':
          setTimeout(async () => {
            try {
              const result = await api.confirmCheckout({
                orderId: intent.orderId,
                paymentIntentId: intent.stripeClientSecret,
              });
              if (result.success) {
                haptics.success();
                navigation.replace('OrderConfirmation', { orderId: intent.orderId });
              }
            } catch (err) {
              Alert.alert('Payment Failed', 'Please try again');
            }
            setProcessing(false);
          }, 2000);
          break;

        case 'telegram_stars':
          if (intent.invoiceUrl) {
            await Linking.openURL(intent.invoiceUrl);
          }
          setProcessing(false);
          break;

        case 'usdc_direct':
        case 'walletconnect':
        case 'crypto_swap':
          setProcessing(false);
          break;

        default:
          setProcessing(false);
      }
    } catch (err: any) {
      console.error('[Checkout] Payment failed:', err);
      Alert.alert('Error', err.message || 'Payment failed');
      setProcessing(false);
    }
  }, [selectedPayment, product, selectedNetwork, navigation]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!product) {
    return null;
  }

  const showNetworkSelector =
    selectedPayment && ['walletconnect', 'usdc_direct', 'crypto_swap'].includes(selectedPayment);

  const showCryptoDetails =
    paymentIntent &&
    selectedPayment &&
    ['walletconnect', 'usdc_direct', 'crypto_swap'].includes(selectedPayment);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GlassHeader
        title="Checkout"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Product summary */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <GlassCard variant="subtle" style={styles.productCard}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDescription}>{product.description}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>${product.basePriceUsdc}</Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Payment method selector */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentGrid}>
            {PAYMENT_OPTIONS.map((option) => (
              <GlassCard
                key={option.id}
                variant={selectedPayment === option.id ? 'medium' : 'subtle'}
                onPress={() => handlePaymentSelect(option.id)}
                style={[
                  styles.paymentOption,
                  selectedPayment === option.id && styles.paymentOptionSelected,
                ]}
              >
                <View style={[styles.paymentIconWrap, { backgroundColor: option.color + '20' }]}>
                  <Ionicons name={option.icon} size={24} color={option.color} />
                </View>
                <Text style={styles.paymentLabel}>{option.label}</Text>
                <Text style={styles.paymentDesc}>{option.description}</Text>
              </GlassCard>
            ))}
          </View>
        </Animated.View>

        {/* Network selector for crypto */}
        {showNetworkSelector && (
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={styles.sectionTitle}>Network</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.networkRow}
            >
              {NETWORKS.map((network) => (
                <GlassPill
                  key={network.id}
                  label={network.name}
                  active={selectedNetwork === network.id}
                  onPress={() => handleNetworkSelect(network.id)}
                  color={selectedNetwork === network.id ? colors.accent.cyan : undefined}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Crypto payment details */}
        {showCryptoDetails && paymentIntent && (
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <GlassCard variant="medium" style={styles.cryptoDetails}>
              <Text style={styles.cryptoTitle}>Send USDC to:</Text>
              <View style={styles.addressWrap}>
                <Text style={styles.address} selectable>
                  {paymentIntent.recipientAddress}
                </Text>
                <Ionicons
                  name="copy-outline"
                  size={20}
                  color={colors.text.secondary}
                  onPress={() => {
                    haptics.tap();
                  }}
                />
              </View>
              <View style={styles.cryptoRow}>
                <Text style={styles.cryptoLabel}>Amount:</Text>
                <Text style={styles.cryptoValue}>
                  {(parseInt(paymentIntent.amountRaw || '0') / 1e6).toFixed(2)} USDC
                </Text>
              </View>
              <View style={styles.cryptoRow}>
                <Text style={styles.cryptoLabel}>Network:</Text>
                <Text style={styles.cryptoValue}>
                  {NETWORKS.find((n) => n.chainId === paymentIntent.chainId)?.name || 'Unknown'}
                </Text>
              </View>

              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={16} color={colors.semantic.warning} />
                <Text style={styles.warningText}>
                  Only send USDC on the selected network. Other tokens or networks will be lost.
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        )}
      </ScrollView>

      {/* Checkout button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <GlassButton
          title={processing ? 'Processing...' : `Pay $${product.basePriceUsdc}`}
          onPress={handleCheckout}
          disabled={!selectedPayment || processing}
          loading={processing}
          variant="primary"
          size="lg"
        />
        <View style={styles.securityRow}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.text.tertiary} />
          <Text style={styles.securityText}>Secure payment powered by FlowBond</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  productCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  productName: {
    ...typography.title,
    color: colors.text.primary,
  },
  productDescription: {
    ...typography.body,
    color: colors.text.secondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  priceLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  priceValue: {
    ...typography.hero,
    fontSize: 28,
    color: colors.accent.primary,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paymentOption: {
    width: '48%',
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentOptionSelected: {
    borderColor: colors.accent.primary,
    borderWidth: 1,
  },
  paymentIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  paymentDesc: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  networkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cryptoDetails: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  cryptoTitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  addressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.subtle,
    padding: spacing.md,
    borderRadius: 8,
  },
  address: {
    fontFamily: 'monospace',
    color: colors.text.primary,
    flex: 1,
    fontSize: 12,
  },
  cryptoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cryptoLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  cryptoValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.semantic.warning + '15',
    padding: spacing.md,
    borderRadius: 8,
  },
  warningText: {
    ...typography.caption,
    color: colors.semantic.warning,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  securityText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
