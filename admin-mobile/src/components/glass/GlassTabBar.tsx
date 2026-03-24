import React, { useCallback, useEffect } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { haptics } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 64;
const INDICATOR_H = 36;
const INDICATOR_RADIUS = 18;

const TAB_LABELS: Record<string, string> = {
  DashboardTab: 'Dashboard',
  ContentTab: 'Content',
  PeopleTab: 'People',
  ToolsTab: 'Tools',
};

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 220,
  mass: 0.7,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

interface TabItemProps {
  routeKey: string;
  routeName: string;
  isFocused: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ routeKey, routeName, isFocused, icon, label, onPress, onLongPress }: TabItemProps) {
  const focusProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focusProgress.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);
  }, [isFocused, focusProgress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(focusProgress.value, [0, 1], [1, 1.1], Extrapolation.CLAMP) }],
    opacity: interpolate(focusProgress.value, [0, 1], [0.45, 1], Extrapolation.CLAMP),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(focusProgress.value, [0, 1], [4, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <Pressable
      key={routeKey}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}>
      <Animated.View style={[styles.iconWrap, iconStyle]}>{icon}</Animated.View>
      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;
  const tabWidth = SCREEN_WIDTH / tabCount;
  const indicatorX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth, SPRING_CONFIG);
  }, [state.index, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value + (tabWidth - tabWidth * 0.7) / 2 }],
    width: tabWidth * 0.7,
  }));

  const handlePress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean) => {
      haptics.tap();
      const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(routeName);
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

  const tabs = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const icon = options.tabBarIcon?.({
      focused: isFocused,
      color: isFocused ? colors.accent.primary : colors.text.tertiary,
      size: 22,
    });
    return (
      <TabItem
        key={route.key}
        routeKey={route.key}
        routeName={route.name}
        isFocused={isFocused}
        icon={icon}
        label={TAB_LABELS[route.name] ?? route.name}
        onPress={() => handlePress(route.key, route.name, isFocused)}
        onLongPress={() => handleLongPress(route.key)}
      />
    );
  });

  const containerStyle = [styles.container, { paddingBottom: insets.bottom || spacing.sm }];

  const innerContent = (
    <>
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.04)', 'transparent']}
        style={styles.topEdge}
      />
      <Animated.View style={[styles.indicator, indicatorStyle]}>
        <View style={styles.indicatorInner} />
      </Animated.View>
      <View style={styles.row}>{tabs}</View>
    </>
  );

  if (Platform.OS === 'ios') {
    return (
      <View style={containerStyle}>
        <BlurView intensity={90} tint="dark" style={styles.surface}>
          {innerContent}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={[styles.surface, styles.surfaceAndroid]}>{innerContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  surface: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  surfaceAndroid: { backgroundColor: 'rgba(10,10,26,0.95)' },
  topEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  row: { flexDirection: 'row', height: TAB_BAR_HEIGHT, alignItems: 'center' },
  indicator: { position: 'absolute', top: (TAB_BAR_HEIGHT - INDICATOR_H) / 2, height: INDICATOR_H, zIndex: 0 },
  indicatorInner: {
    flex: 1,
    borderRadius: INDICATOR_RADIUS,
    backgroundColor: 'rgba(124,108,240,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124,108,240,0.25)',
    ...Platform.select({
      ios: { shadowColor: colors.accent.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 12 },
      default: {},
    }),
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: TAB_BAR_HEIGHT, zIndex: 1, gap: 2 },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, color: colors.accent.primary },
});
