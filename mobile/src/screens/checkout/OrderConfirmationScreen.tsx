/**
 * OrderConfirmationScreen
 *
 * Success screen displayed after successful payment.
 * Shows order details, receipt, and next steps.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';
import type { Order, Product } from '../../api/types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ConfirmRouteProp = RouteProp<RootStackParamList, 'OrderConfirmation'>;

function SuccessAnimation() {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    haptics.success();
    scale.value = withSequence(
      withTiming(1.2, { duration: 300 }),
      withTiming(1, { duration: 200 })
    );
    opacity.value = withTiming(1, { duration: 300 });
    rotation.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(10, { duration: 100 }),
          withTiming(-10, { duration: 100 }),
          withTiming(0, { duration: 100 })
        ),
        2,
        false
      )
    );
  }, [scale, rotation, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.successCircle, animatedStyle]}>
      <Ionicons name="checkmark" size={64} color={colors.text.inverse} />
    </Animated.View>
  );
}

export default function OrderConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ConfirmRouteProp>();
  const { orderId } = route.params;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getOrder(orderId);
        setOrder(data.order);
        setProduct(data.product);
      } catch (err) {
        console.error('[OrderConfirmation] Failed to load order:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const handleDone = () => {
    haptics.tap();
    navigation.popToTop();
  };

  const handleViewOrders = () => {
    haptics.tap();
    navigation.replace('Subscriptions');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  const paymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'stripe':
        return 'Card';
      case 'apple_pay':
        return 'Apple Pay';
      case 'walletconnect':
        return 'Wallet';
      case 'usdc_direct':
        return 'USDC';
      case 'crypto_swap':
        return 'Crypto';
      case 'telegram_stars':
        return 'Telegram Stars';
      default:
        return method;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.content}>
        {/* Success animation */}
        <SuccessAnimation />

        {/* Success message */}
        <Animated.View entering={FadeIn.delay(400).duration(400)}>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>Thank you for your purchase</Text>
        </Animated.View>

        {/* Order details */}
        {order && product && (
          <Animated.View entering={FadeInDown.delay(600).springify()}>
            <GlassCard variant="subtle" style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <Ionicons name="receipt-outline" size={20} color={colors.text.secondary} />
                <Text style={styles.receiptTitle}>Receipt</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Product</Text>
                <Text style={styles.receiptValue}>{product.name}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Order ID</Text>
                <Text style={[styles.receiptValue, styles.orderId]}>
                  {orderId.slice(0, 8)}...
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment</Text>
                <Text style={styles.receiptValue}>
                  {paymentMethodLabel(order.paymentMethod)}
                </Text>
              </View>

              {order.paymentNetwork && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Network</Text>
                  <Text style={styles.receiptValue}>
                    {order.paymentNetwork.charAt(0).toUpperCase() +
                      order.paymentNetwork.slice(1)}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.receiptRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${order.totalUsdc}</Text>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* What's next */}
        <Animated.View
          entering={FadeInDown.delay(800).springify()}
          style={styles.nextSteps}
        >
          <Text style={styles.nextTitle}>What's next?</Text>
          {product?.category === 'boost' && (
            <View style={styles.nextItem}>
              <Ionicons name="rocket-outline" size={20} color={colors.accent.amber} />
              <Text style={styles.nextText}>
                Your event boost is now active. Check your event for increased visibility!
              </Text>
            </View>
          )}
          {product?.category === 'agent' && (
            <View style={styles.nextItem}>
              <Ionicons name="sparkles-outline" size={20} color={colors.accent.cyan} />
              <Text style={styles.nextText}>
                FlowB Agent is ready! Open the chat to start your AI-powered flow assistant.
              </Text>
            </View>
          )}
          {product?.category === 'skills' && (
            <View style={styles.nextItem}>
              <Ionicons name="extension-puzzle-outline" size={20} color={colors.accent.emerald} />
              <Text style={styles.nextText}>
                Your new skill is installed. Ask FlowB Agent to use it in chat!
              </Text>
            </View>
          )}
          {product?.isSubscription && (
            <View style={styles.nextItem}>
              <Ionicons name="star-outline" size={20} color={colors.accent.primary} />
              <Text style={styles.nextText}>
                Welcome to Premium! All features are now unlocked. Enjoy the full FlowB experience.
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Actions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <GlassButton
          title="Done"
          onPress={handleDone}
          variant="primary"
          size="lg"
        />
        <GlassButton
          title="View My Orders"
          onPress={handleViewOrders}
          variant="ghost"
          size="md"
        />
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.semantic.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    ...typography.hero,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  receiptCard: {
    width: '100%',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  receiptTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  receiptValue: {
    ...typography.body,
    color: colors.text.primary,
  },
  orderId: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    ...typography.headline,
    color: colors.text.primary,
  },
  totalValue: {
    ...typography.title,
    color: colors.accent.primary,
  },
  nextSteps: {
    marginTop: spacing.xl,
    width: '100%',
    gap: spacing.md,
  },
  nextTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  nextItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.glass.subtle,
    padding: spacing.md,
    borderRadius: 12,
  },
  nextText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
});
