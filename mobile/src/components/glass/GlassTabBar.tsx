/**
 * GlassTabBar
 *
 * Custom bottom tab bar for React Navigation (Bottom Tabs v7).
 * Renders as a floating glass surface with icons only -- no labels --
 * and a small glowing dot under the active tab. Works with both
 * iOS (BlurView) and Android (semi-transparent dark background).
 */

import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { glassFlat } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { haptics } from '../../utils/haptics';

// ── Constants ────────────────────────────────────────────────────────

const TAB_BAR_HEIGHT = 60;
const DOT_SIZE = 4;

// ── Component ────────────────────────────────────────────────────────

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const glassBackground = glassFlat('heavy');

  const handlePress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean) => {
      haptics.tap();

      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    },
    [navigation],
  );

  const handleLongPress = useCallback(
    (routeKey: string) => {
      haptics.select();
      navigation.emit({ type: 'tabLongPress', target: routeKey });
    },
    [navigation],
  );

  // ── Tabs ──────────────────────────────────────────────────────────

  const tabs = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;

    // Render the icon from the screen options
    const icon = options.tabBarIcon?.({
      focused: isFocused,
      color: isFocused ? colors.accent.primary : colors.text.tertiary,
      size: 24,
    });

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        onPress={() => handlePress(route.key, route.name, isFocused)}
        onLongPress={() => handleLongPress(route.key)}
        style={styles.tab}
      >
        <View style={[styles.iconWrap, isFocused && styles.iconActive]}>
          {icon}
        </View>

        {/* Active indicator dot */}
        {isFocused && <View style={styles.dot} />}
      </Pressable>
    );
  });

  // ── Glass surface ─────────────────────────────────────────────────

  const containerStyle = [
    styles.container,
    { paddingBottom: insets.bottom || spacing.sm },
  ];

  const inner = <View style={styles.row}>{tabs}</View>;

  if (Platform.OS === 'ios') {
    return (
      <View style={containerStyle}>
        <BlurView intensity={80} tint="dark" style={[styles.surface, glassBackground]}>
          {inner}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={[styles.surface, glassBackground]}>{inner}</View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  surface: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  row: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
  },
  iconWrap: {
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.accent.primary,
    marginTop: spacing.xs,
    // Glow effect on iOS via shadow
    ...Platform.select({
      ios: {
        shadowColor: colors.accent.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
      default: {},
    }),
  },
});
