/**
 * GlassButton
 *
 * Translucent button with three visual variants and optional loading /
 * icon states. Provides haptic feedback and a spring press animation
 * for a tactile feel that matches the glassmorphism aesthetic.
 */

import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../../theme/colors';
import { glassStyle } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
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
  const scale = useRef(new Animated.Value(1)).current;
  const preset = sizePresets[size];

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
    if (disabled || loading) return;
    haptics.tap();
    onPress();
  }, [disabled, loading, onPress]);

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
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
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
