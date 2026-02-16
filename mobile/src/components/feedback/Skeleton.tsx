/**
 * Skeleton
 *
 * Shimmer loading placeholder using Reanimated. Renders a rounded
 * rectangle with a sweeping highlight that loops infinitely. Use
 * it in place of content while data is loading.
 *
 * Usage:
 *   <Skeleton width={200} height={20} />
 *   <Skeleton width="100%" height={120} radius={16} />
 *   <Skeleton circle size={48} />
 */

import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../../theme/colors';

// ── Props ────────────────────────────────────────────────────────────

interface SkeletonBaseProps {
  style?: StyleProp<ViewStyle>;
}

interface RectProps extends SkeletonBaseProps {
  width: number | string;
  height: number;
  radius?: number;
  circle?: never;
  size?: never;
}

interface CircleProps extends SkeletonBaseProps {
  circle: true;
  size: number;
  width?: never;
  height?: never;
  radius?: never;
}

type SkeletonProps = RectProps | CircleProps;

// ── Constants ────────────────────────────────────────────────────────

const SHIMMER_DURATION = 1200;
const BASE_COLOR = colors.glass.subtle;
const HIGHLIGHT_COLOR = 'rgba(255,255,255,0.08)';

// ── Component ────────────────────────────────────────────────────────

export function Skeleton(props: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      true // reverse
    );
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
  }));

  if (props.circle) {
    const { size, style } = props;
    return (
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: BASE_COLOR,
          },
          shimmerStyle,
          style,
        ]}
      />
    );
  }

  const { width, height, radius = 8, style } = props;
  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius: radius,
          backgroundColor: BASE_COLOR,
        },
        shimmerStyle,
        style,
      ]}
    />
  );
}

// ── Preset skeleton groups ──────────────────────────────────────────

/** Skeleton for an event card */
export function SkeletonEventCard() {
  return (
    <Animated.View style={skeletonStyles.eventCard}>
      <Skeleton width="80%" height={18} radius={4} />
      <Skeleton width="60%" height={14} radius={4} style={{ marginTop: 10 }} />
      <Skeleton width="45%" height={14} radius={4} style={{ marginTop: 6 }} />
      <Animated.View style={skeletonStyles.badgeRow}>
        <Skeleton width={56} height={22} radius={11} />
        <Skeleton width={40} height={22} radius={11} />
      </Animated.View>
    </Animated.View>
  );
}

/** Skeleton for the points hero section */
export function SkeletonPointsHero() {
  return (
    <Animated.View style={skeletonStyles.pointsHero}>
      <Skeleton width={140} height={48} radius={8} />
      <Skeleton width={60} height={14} radius={4} style={{ marginTop: 8 }} />
    </Animated.View>
  );
}

/** Skeleton for a stat tile row (3 tiles) */
export function SkeletonStatRow() {
  return (
    <Animated.View style={skeletonStyles.statRow}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={skeletonStyles.statTile}>
          <Skeleton width={20} height={20} radius={4} />
          <Skeleton width={36} height={18} radius={4} style={{ marginTop: 6 }} />
          <Skeleton width={44} height={10} radius={3} style={{ marginTop: 4 }} />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

/** Skeleton for profile header */
export function SkeletonProfile() {
  return (
    <Animated.View style={skeletonStyles.profile}>
      <Skeleton circle size={80} />
      <Skeleton width={140} height={22} radius={4} style={{ marginTop: 12 }} />
      <Skeleton width={100} height={14} radius={4} style={{ marginTop: 6 }} />
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  eventCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: colors.glass.subtle,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  pointsHero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.glass.subtle,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  profile: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
});
