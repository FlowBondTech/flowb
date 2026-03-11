/**
 * ProductsScreen
 *
 * Product catalog displaying available services, boosts, and subscriptions.
 * Filters by category and shows flow-purpose-aware recommendations.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
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
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AnimatedHeader } from '../../components/glass/AnimatedHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassPill } from '../../components/glass/GlassPill';
import { haptics } from '../../utils/haptics';
import * as api from '../../api/client';
import type { Product } from '../../api/types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'boost', label: 'Boosts', icon: 'rocket-outline' },
  { id: 'agent', label: 'Agent', icon: 'sparkles-outline' },
  { id: 'skills', label: 'Skills', icon: 'extension-puzzle-outline' },
  { id: 'subscription', label: 'Premium', icon: 'star-outline' },
] as const;

function ProductCard({
  product,
  index,
  onPress,
}: {
  product: Product;
  index: number;
  onPress: () => void;
}) {
  const categoryIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (product.category) {
      case 'boost':
        return 'rocket-outline';
      case 'agent':
        return 'sparkles-outline';
      case 'skills':
        return 'extension-puzzle-outline';
      case 'subscription':
        return 'star-outline';
      default:
        return 'cube-outline';
    }
  };

  const categoryColor = (): string => {
    switch (product.category) {
      case 'boost':
        return colors.accent.amber;
      case 'agent':
        return colors.accent.cyan;
      case 'skills':
        return colors.accent.emerald;
      case 'subscription':
        return colors.accent.primary;
      default:
        return colors.accent.secondary;
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).springify()}>
      <GlassCard variant="subtle" onPress={onPress} style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={[styles.productIconWrap, { backgroundColor: categoryColor() + '20' }]}>
            <Ionicons name={categoryIcon()} size={24} color={categoryColor()} />
          </View>
          <View style={styles.productTitleWrap}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.isSubscription && (
              <GlassPill
                label={`$${product.basePriceUsdc}/${product.subscriptionInterval}`}
                color={colors.accent.primary}
              />
            )}
          </View>
        </View>

        <Text style={styles.productDescription} numberOfLines={2}>
          {product.description}
        </Text>

        {product.features && product.features.length > 0 && (
          <View style={styles.featureList}>
            {product.features.slice(0, 3).map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.semantic.success} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.productFooter}>
          {!product.isSubscription && (
            <Text style={styles.price}>${product.basePriceUsdc}</Text>
          )}
          <View style={styles.paymentHints}>
            <Ionicons name="card-outline" size={14} color={colors.text.tertiary} />
            <Ionicons name="logo-apple" size={14} color={colors.text.tertiary} />
            <Ionicons name="wallet-outline" size={14} color={colors.text.tertiary} />
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const scrollOffset = useSharedValue(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollOffset.value = e.contentOffset.y;
    },
  });

  const loadProducts = useCallback(async () => {
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await api.getProducts({ category });
      setProducts(data);
    } catch (err) {
      console.error('[ProductsScreen] Failed to load products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
  }, [loadProducts]);

  const handleCategorySelect = useCallback((catId: string) => {
    haptics.select();
    setSelectedCategory(catId);
    setLoading(true);
  }, []);

  const handleProductPress = useCallback(
    (product: Product) => {
      haptics.tap();
      navigation.navigate('Checkout', { productSlug: product.slug });
    },
    [navigation]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AnimatedHeader title="FlowB Shop" scrollOffset={scrollOffset} />

      <AnimatedScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text.secondary}
          />
        }
      >
        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <GlassPill
              key={cat.id}
              label={cat.label}
              icon={<Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={12} color={selectedCategory === cat.id ? colors.white : colors.accent.primary} />}
              active={selectedCategory === cat.id}
              onPress={() => handleCategorySelect(cat.id)}
              color={selectedCategory === cat.id ? colors.accent.primary : undefined}
            />
          ))}
        </ScrollView>

        {/* Products */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="cube-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onPress={() => handleProductPress(product)}
              />
            ))}
          </View>
        )}

        {/* Footer info */}
        <View style={styles.footer}>
          <View style={styles.paymentLogos}>
            <Text style={styles.footerLabel}>We accept</Text>
            <View style={styles.logoRow}>
              <Ionicons name="card-outline" size={20} color={colors.text.tertiary} />
              <Ionicons name="logo-apple" size={20} color={colors.text.tertiary} />
              <Text style={styles.cryptoLabel}>USDC</Text>
              <Text style={styles.cryptoLabel}>ETH</Text>
            </View>
          </View>
        </View>
      </AnimatedScrollView>
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
    paddingTop: 80,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  productsGrid: {
    gap: spacing.md,
  },
  productCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTitleWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  productName: {
    ...typography.headline,
    color: colors.text.primary,
  },
  productDescription: {
    ...typography.body,
    color: colors.text.secondary,
  },
  featureList: {
    gap: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  price: {
    ...typography.title,
    color: colors.accent.primary,
  },
  paymentHints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    alignItems: 'center',
  },
  paymentLogos: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cryptoLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
});
