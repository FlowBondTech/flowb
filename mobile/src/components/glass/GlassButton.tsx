/**
 * GlassButton
 *
 * Translucent button with three visual variants and optional loading /
 * icon states. Uses Reanimated spring press animation for smooth
 * 60fps haptic feedback matching the glassmorphism aesthetic.
 */

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { glassStyle } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { haptics } from '../../utils/haptics';

// ── Types ────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
}

// ── Size presets ─────────────────────────────────────────────────────

const sizePresets: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: { height: 36, paddingHorizontal: spacing.sm * 2, fontSize: 13 },
  md: { height: 48, paddingHorizontal: spacing.md + spacing.sm, fontSize: 15 },
  lg: { height: 56, paddingHorizontal: spacing.lg, fontSize: 17 },
};

const PRESS_SPRING = {
  damping: 20,
  stiffness: 300,
  mass: 0.6,
};

// ── Component ────────────────────────────────────────────────────────

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  size = 'md',
  style,
}: GlassButtonProps) {
  const scale = useSharedValue(1);
  const preset = sizePresets[size];

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, PRESS_SPRING);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    haptics.tap();
    onPress();
  }, [disabled, loading, onPress]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // ── Label & indicator color ───────────────────────────────────────

  const textColor =
    variant === 'primary' ? colors.white : colors.accent.primary;
  const indicatorColor =
    variant === 'primary' ? colors.white : colors.accent.primary;

  // ── Inner content ─────────────────────────────────────────────────

  const inner = (
    <View style={[styles.row, { height: preset.height, paddingHorizontal: preset.paddingHorizontal }]}>
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text
            style={[
              styles.label,
              { fontSize: preset.fontSize, color: textColor },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  // ── Variant wrappers ──────────────────────────────────────────────

  const renderBody = () => {
    switch (variant) {
      case 'primary':
        return (
          <LinearGradient
            colors={[colors.accent.primary, colors.accent.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, disabled && styles.disabled]}
          >
            {inner}
          </LinearGradient>
        );

      case 'secondary':
        return (
          <View
            style={[
              styles.base,
              glassStyle('subtle'),
              disabled && styles.disabled,
            ]}
          >
            {inner}
          </View>
        );

      case 'ghost':
        return (
          <View
            style={[
              styles.base,
              styles.ghost,
              disabled && styles.disabled,
            ]}
          >
            {inner}
          </View>
        );
    }
  };

  return (
    <Animated.View style={[pressStyle, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        {renderBody()}
      </Pressable>
    </Animated.View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  disabled: {
    opacity: 0.45,
  },
});
