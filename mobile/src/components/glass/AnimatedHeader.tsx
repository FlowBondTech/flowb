/**
 * AnimatedHeader
 *
 * iOS-style large-title header that collapses on scroll. Features:
 * - Large title shrinks to inline centered title as you scroll
 * - Glass blur intensifies as the header compresses
 * - Luminous bottom edge appears on collapse (liquid glass effect)
 * - Optional right action slot
 * - Works with Reanimated scroll handlers
 *
 * Usage:
 *   const scrollOffset = useSharedValue(0);
 *   const scrollHandler = useAnimatedScrollHandler({
 *     onScroll: (e) => { scrollOffset.value = e.contentOffset.y; },
 *   });
 *
 *   <AnimatedHeader title="Discover" scrollOffset={scrollOffset} />
 *   <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
 *     ...
 *   </Animated.ScrollView>
 */

import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// ── Constants ────────────────────────────────────────────────────────

const COLLAPSED_HEIGHT = 48;
const LARGE_TITLE_HEIGHT = 52;
const SCROLL_DISTANCE = 80; // px to scroll before fully collapsed

// ── Props ────────────────────────────────────────────────────────────

export interface AnimatedHeaderProps {
  title: string;
  scrollOffset: SharedValue<number>;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ── Component ────────────────────────────────────────────────────────

export function AnimatedHeader({
  title,
  scrollOffset,
  rightAction,
  style,
}: AnimatedHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top;

  // ── Animated styles ─────────────────────────────────────────────────

  // Container height shrinks from (top + collapsed + large) → (top + collapsed)
  const containerStyle = useAnimatedStyle(() => {
    const totalExpanded = topPadding + COLLAPSED_HEIGHT + LARGE_TITLE_HEIGHT;
    const totalCollapsed = topPadding + COLLAPSED_HEIGHT;

    const height = interpolate(
      scrollOffset.value,
      [0, SCROLL_DISTANCE],
      [totalExpanded, totalCollapsed],
      Extrapolation.CLAMP
    );

    return { height };
  });

  // Large title fades out + slides up as you scroll
  const largeTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOffset.value,
      [0, SCROLL_DISTANCE * 0.6],
      [1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollOffset.value,
      [0, SCROLL_DISTANCE],
      [0, -12],
      Extrapolation.CLAMP
    );

    return { opacity, transform: [{ translateY }] };
  });

  // Inline (collapsed) title fades in
  const inlineTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOffset.value,
      [SCROLL_DISTANCE * 0.5, SCROLL_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  // Bottom edge glow appears on collapse
  const edgeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOffset.value,
      [SCROLL_DISTANCE * 0.3, SCROLL_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  // Glass background opacity increases on scroll
  const glassOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOffset.value,
      [0, SCROLL_DISTANCE * 0.5],
      [0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <Animated.View style={[styles.container, containerStyle, style]}>
      {/* Glass background — fades in on scroll */}
      <Animated.View style={[StyleSheet.absoluteFill, glassOpacity]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={80}
            tint="dark"
            style={[StyleSheet.absoluteFill, styles.glassLayer]}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.glassLayer, styles.androidGlass]} />
        )}
      </Animated.View>

      {/* Collapsed row — always present, title fades in */}
      <View style={[styles.collapsedRow, { paddingTop: topPadding }]}>
        <View style={styles.collapsedSide} />
        <Animated.Text
          style={[styles.inlineTitle, inlineTitleStyle]}
          numberOfLines={1}
        >
          {title}
        </Animated.Text>
        <View style={[styles.collapsedSide, styles.rightSide]}>
          {rightAction ?? null}
        </View>
      </View>

      {/* Large title — visible at top, collapses away */}
      <Animated.View style={[styles.largeTitleWrap, largeTitleStyle]}>
        <Animated.Text style={styles.largeTitle}>{title}</Animated.Text>
      </Animated.View>

      {/* Bottom edge luminous line */}
      <Animated.View style={[styles.bottomEdge, edgeStyle]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0.03)',
            'transparent',
          ]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  glassLayer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  androidGlass: {
    backgroundColor: 'rgba(5,5,16,0.92)',
  },

  // Collapsed inline row
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: COLLAPSED_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  collapsedSide: {
    width: 44,
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  inlineTitle: {
    ...typography.headline,
    flex: 1,
    textAlign: 'center',
    color: colors.text.primary,
  },

  // Large title
  largeTitleWrap: {
    paddingHorizontal: spacing.md,
    height: LARGE_TITLE_HEIGHT,
    justifyContent: 'center',
  },
  largeTitle: {
    ...typography.hero,
    color: colors.text.primary,
  },

  // Bottom luminous edge
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
});
