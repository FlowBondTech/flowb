/**
 * GlassPill
 *
 * Small status pill / chip component. When inactive it has a subtle
 * glass background; when active it uses a solid primary accent fill.
 * Optionally tappable for filter-style interactions.
 */

import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors } from '../../theme/colors';
import { glassPill } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

// ── Props ────────────────────────────────────────────────────────────

export interface GlassPillProps {
  label: string;
  /** Override the label / border color (defaults to accent.primary when active) */
  color?: string;
  icon?: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// ── Component ────────────────────────────────────────────────────────

export function GlassPill({
  label,
  color,
  icon,
  active = false,
  onPress,
  style,
}: GlassPillProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.95,
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

  // ── Styling ───────────────────────────────────────────────────────

  const accentColor = color ?? colors.accent.primary;

  const pillStyle: ViewStyle = active
    ? {
        ...glassPill('subtle'),
        backgroundColor: accentColor,
        borderColor: accentColor,
        borderRadius: 100,
      }
    : {
        ...glassPill('subtle'),
        borderRadius: 100,
      };

  const textColor = active ? colors.white : accentColor;

  const content = (
    <View style={[pillStyle, styles.container, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs + 2,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    ...typography.micro,
  },
});
