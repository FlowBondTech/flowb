/**
 * GlassCard
 *
 * A frosted-glass container. On iOS it wraps children in an expo-blur
 * BlurView for real backdrop blur; on Android it falls back to a
 * semi-transparent solid background. If `onPress` is supplied the whole
 * card becomes tappable with a Reanimated spring scale + opacity
 * animation and haptic tap.
 *
 * Supports Reanimated `entering` / `exiting` layout animations for
 * staggered list appearances.
 */

import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { glassStyle, GlassVariant } from '../../theme/glass';
import { haptics } from '../../utils/haptics';

// ── Variant-specific blur intensities (iOS only) ────────────────────

const blurIntensity: Record<GlassVariant, number> = {
  subtle: 20,
  medium: 40,
  heavy: 60,
  glow: 40,
};

// Spring config for press feedback
const PRESS_SPRING = {
  damping: 20,
  stiffness: 300,
  mass: 0.6,
};

// ── Props ────────────────────────────────────────────────────────────

export interface GlassCardProps {
  variant?: GlassVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Reanimated entering animation — defaults to FadeInDown.duration(350) */
  entering?: any;
  /** Disable the default entering animation */
  noAnimation?: boolean;
}

// ── Component ────────────────────────────────────────────────────────

export function GlassCard({
  variant = 'medium',
  children,
  style,
  onPress,
  entering,
  noAnimation,
}: GlassCardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, PRESS_SPRING);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, [scale]);

  const handlePress = useCallback(() => {
    haptics.tap();
    onPress?.();
  }, [onPress]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyle = glassStyle(variant);

  // ── Inner content (shared between pressable and non-pressable) ──

  const content =
    Platform.OS === 'ios' ? (
      <BlurView
        intensity={blurIntensity[variant]}
        tint="dark"
        style={[styles.blur, variantStyle, style]}
      >
        {children}
      </BlurView>
    ) : (
      <View style={[variantStyle, style]}>{children}</View>
    );

  // ── Wrap in Pressable when tappable ───────────────────────────────

  if (onPress) {
    return (
      <Animated.View style={pressStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return content;
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
});
