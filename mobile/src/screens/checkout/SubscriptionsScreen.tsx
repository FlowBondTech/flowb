/**
 * SubscriptionsScreen
 *
 * Displays active subscriptions and purchase history.
 * Allows users to manage and cancel subscriptions.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassPill } from '../../components/glass/GlassPill';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';
import type { Subscription, Order } from '../../api/types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function SubscriptionCard({
  subscription,
  index,
  onCancel,
}: {
  subscription: Subscription;
  index: number;
  onCancel: () => void;
}) {
  const product = subscription.product;
  const isActive = subscription.status === 'active';
  const endDate = new Date(subscription.currentPeriodEnd);

  const statusColor = (): string => {
    switch (subscription.status) {
      case 'active':
        return colors.semantic.success;
      case 'cancelled':
        return colors.text.tertiary;
      case 'past_due':
        return colors.semantic.warning;
      case 'paused':
        return colors.accent.amber;
      default:
        return colors.text.tertiary;
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).springify()}>
      <GlassCard variant="subtle" style={styles.subCard}>
        <View style={styles.subHeader}>
          <View style={styles.subIconWrap}>
            <Ionicons
              name={isActive ? 'star' : 'star-outline'}
              size={24}
              color={isActive ? colors.accent.primary : colors.text.tertiary}
            />
          </View>
          <View style={styles.subInfo}>
            <Text style={styles.subName}>{product?.name || 'Subscription'}</Text>
            <GlassPill
              label={subscription.status}
              color={statusColor()}
            />
          </View>
        </View>

        <View style={styles.subDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Billing</Text>
            <Text style={styles.detailValue}>
              ${product?.basePriceUsdc}/{product?.subscriptionInterval || 'month'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {subscription.cancelAtPeriodEnd ? 'Ends on' : 'Next billing'}
            </Text>
            <Text style={styles.detailValue}>
              {endDate.toLocaleDateString()}
            </Text>
          </View>
        </View>

        {isActive && !subscription.cancelAtPeriodEnd && (
          <View style={styles.subActions}>
            <GlassButton
              title="Cancel Subscription"
              onPress={onCancel}
              variant="ghost"
              size="sm"
            />
          </View>
        )}

        {subscription.cancelAtPeriodEnd && (
          <View style={styles.cancelNotice}>
            <Ionicons name="information-circle-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.cancelText}>
              Your subscription will end on {endDate.toLocaleDateString()}
            </Text>
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );
}

function OrderCard({ order, index }: { order: Order; index: number }) {
  const product = order.product;
  const date = new Date(order.createdAt);

  const statusColor = (): string => {
    switch (order.status) {
      case 'completed':
        return colors.semantic.success;
      case 'pending':
      case 'processing':
        return colors.accent.amber;
      case 'failed':
      case 'cancelled':
        return colors.semantic.error;
      case 'refunded':
        return colors.text.tertiary;
      default:
        return colors.text.tertiary;
    }
  };

  const statusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (order.status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
      case 'processing':
        return 'time-outline';
      case 'failed':
      case 'cancelled':
        return 'close-circle';
      case 'refunded':
        return 'return-down-back';
      default:
        return 'ellipse-outline';
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 40).springify()}>
      <GlassCard variant="subtle" style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderName}>{product?.name || 'Product'}</Text>
            <Text style={styles.orderDate}>{date.toLocaleDateString()}</Text>
          </View>
          <View style={styles.orderRight}>
            <Text style={styles.orderAmount}>${order.totalUsdc}</Text>
            <View style={styles.orderStatus}>
              <Ionicons name={statusIcon()} size={14} color={statusColor()} />
              <Text style={[styles.orderStatusText, { color: statusColor() }]}>
                {order.status}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [subsData, ordersData] = await Promise.all([
        api.getSubscriptions(),
        api.getOrders(20),
      ]);
      setSubscriptions(subsData);
      setOrders(ordersData);
    } catch (err) {
      console.error('[Subscriptions] Failed to load data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleCancelSubscription = useCallback(
    async (subscription: Subscription) => {
      Alert.alert(
        'Cancel Subscription',
        `Are you sure you want to cancel ${subscription.product?.name || 'this subscription'}? You will still have access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`,
        [
          { text: 'Keep Subscription', style: 'cancel' },
          {
            text: 'Cancel',
            style: 'destructive',
            onPress: async () => {
              haptics.error();
              try {
                await api.cancelSubscription(subscription.id, false);
                loadData();
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to cancel subscription');
              }
            },
          },
        ]
      );
    },
    [loadData]
  );

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === 'active' || s.status === 'past_due'
  );
  const pastSubscriptions = subscriptions.filter(
    (s) => s.status === 'cancelled' || s.status === 'paused'
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GlassHeader
        title="My Purchases"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text.secondary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {/* Active subscriptions */}
            {activeSubscriptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Subscriptions</Text>
                {activeSubscriptions.map((sub, index) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    index={index}
                    onCancel={() => handleCancelSubscription(sub)}
                  />
                ))}
              </View>
            )}

            {/* Past subscriptions */}
            {pastSubscriptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past Subscriptions</Text>
                {pastSubscriptions.map((sub, index) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    index={index}
                    onCancel={() => {}}
                  />
                ))}
              </View>
            )}

            {/* Purchase history */}
            {orders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Purchase History</Text>
                {orders.map((order, index) => (
                  <OrderCard key={order.id} order={order} index={index} />
                ))}
              </View>
            )}

            {/* Empty state */}
            {subscriptions.length === 0 && orders.length === 0 && (
              <View style={styles.emptyWrap}>
                <Ionicons name="bag-outline" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>No Purchases Yet</Text>
                <Text style={styles.emptyText}>
                  Explore our products to enhance your FlowB experience
                </Text>
                <GlassButton
                  title="Browse Products"
                  onPress={() => navigation.navigate('Products')}
                  variant="primary"
                  size="md"
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  subCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  subIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  subName: {
    ...typography.headline,
    color: colors.text.primary,
  },
  subDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.text.primary,
  },
  subActions: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  cancelNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.subtle,
    padding: spacing.md,
    borderRadius: 8,
  },
  cancelText: {
    ...typography.caption,
    color: colors.text.tertiary,
    flex: 1,
  },
  orderCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  orderDate: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  orderAmount: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  orderStatusText: {
    ...typography.caption,
    textTransform: 'capitalize',
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
