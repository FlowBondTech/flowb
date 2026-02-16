/**
 * GlassHeader
 *
 * Navigation header with a blurred glass background. Renders a centered
 * title with optional back button (left) and right action slot. Accounts
 * for the device safe area so it sits below the status bar.
 */

import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { glassFlat } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

// ── Props ────────────────────────────────────────────────────────────

export interface GlassHeaderProps {
  title: string;
  /** When provided, renders a back chevron on the left */
  onBack?: () => void;
  /** Slot for a right-side action (e.g. settings icon button) */
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ── Constants ────────────────────────────────────────────────────────

const HEADER_HEIGHT = 56;

// ── Back chevron (inline SVG-free, plain text) ──────────────────────

function BackChevron() {
  return (
    <Text style={styles.chevron}>{'\u2039'}</Text>
  );
}

// ── Component ────────────────────────────────────────────────────────

export function GlassHeader({
  title,
  onBack,
  rightAction,
  style,
}: GlassHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = useCallback(() => {
    haptics.tap();
    onBack?.();
  }, [onBack]);

  // ── Inner layout ──────────────────────────────────────────────────

  const inner = (
    <View style={[styles.row, { paddingTop: insets.top }]}>
      {/* Left slot */}
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={styles.backButton}
          >
            <BackChevron />
          </Pressable>
        ) : null}
      </View>

      {/* Center title */}
      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right slot */}
      <View style={[styles.side, styles.rightSide]}>
        {rightAction ?? null}
      </View>
    </View>
  );

  // ── Glass surface ─────────────────────────────────────────────────

  const glassBackground = glassFlat('medium');

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={60}
        tint="dark"
        style={[styles.container, glassBackground, style]}
      >
        {inner}
      </BlurView>
    );
  }

  return (
    <View style={[styles.container, glassBackground, style]}>{inner}</View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  side: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...typography.headline,
    color: colors.text.primary,
  },
  backButton: {
    padding: spacing.xs,
  },
  chevron: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.text.primary,
    lineHeight: 32,
  },
});
