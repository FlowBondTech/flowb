/**
 * GlassCard
 *
 * A frosted-glass container. On iOS it wraps children in an expo-blur
 * BlurView for real backdrop blur; on Android it falls back to a
 * semi-transparent solid background. If `onPress` is supplied the whole
 * card becomes tappable with a subtle scale animation and haptic tap.
 */

import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

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

// ── Props ────────────────────────────────────────────────────────────

export interface GlassCardProps {
  variant?: GlassVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export function GlassCard({
  variant = 'medium',
  children,
  style,
  onPress,
}: GlassCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    haptics.tap();
    onPress?.();
  }, [onPress]);

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
      <Animated.View style={{ transform: [{ scale }] }}>
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
