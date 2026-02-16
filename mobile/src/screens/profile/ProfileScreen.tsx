/**
 * ProfileScreen
 *
 * User profile with animated avatar, stats summary, settings links,
 * optional admin panel access, and sign-out. Features staggered
 * entrance animations and animated collapsing header.
 */

import React, { useEffect, useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AnimatedHeader } from '../../components/glass/AnimatedHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassPill } from '../../components/glass/GlassPill';
import { SkeletonProfile, SkeletonStatRow } from '../../components/feedback/Skeleton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePointsStore } from '../../stores/usePointsStore';
import { formatPoints } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ── Settings row ──────────────────────────────────────────────────

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress?: () => void;
}

function SettingsRow({ icon, label, disabled, onPress }: SettingsRowProps) {
  const content = (
    <View style={[styles.settingsRow, disabled && styles.settingsRowDisabled]}>
      <Ionicons
        name={icon}
        size={20}
        color={disabled ? colors.text.tertiary : colors.text.secondary}
      />
      <Text style={[styles.settingsLabel, disabled && { color: colors.text.tertiary }]}>
        {label}
      </Text>
      <View style={styles.settingsRight}>
        {disabled && <Text style={styles.comingSoon}>Coming soon</Text>}
        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
      </View>
    </View>
  );

  if (onPress && !disabled) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

// ── Mini stat card ────────────────────────────────────────────────

interface MiniStatProps {
  label: string;
  value: string | number;
  color: string;
  index: number;
}

function MiniStat({ label, value, color, index }: MiniStatProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 80).duration(400).springify()}
      style={{ flex: 1 }}
    >
      <GlassCard variant="subtle" style={styles.miniStat}>
        <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
        <Text style={styles.miniStatLabel}>{label}</Text>
      </GlassCard>
    </Animated.View>
  );
}

// ── Sign-out button (animated) ────────────────────────────────────

function SignOutButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300, mass: 0.6 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.6 });
  }, [scale]);

  const handlePress = useCallback(() => {
    haptics.tap();
    onPress();
  }, [onPress]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.signOutButton, pressStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.signOutInner}>
          <Ionicons
            name="log-out-outline"
            size={18}
            color={colors.accent.rose}
            style={styles.signOutIcon}
          />
          <Text style={styles.signOutText}>Sign Out</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, logout } = useAuthStore();
  const { points, fetchPoints } = usePointsStore();

  const scrollOffset = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const username = user?.username ?? user?.displayName ?? 'User';
  const userId = user?.id ?? '';
  const initial = username.charAt(0).toUpperCase();
  const isAdminUser = isAdmin();
  const headerHeight = insets.top + 48 + 52;
  const showSkeleton = !user;

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          haptics.heavy();
          await logout();
        },
      },
    ]);
  }, [logout]);

  return (
    <View style={styles.safe}>
      <AnimatedHeader title="Profile" scrollOffset={scrollOffset} />

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scroll, { paddingTop: headerHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {showSkeleton ? (
          <>
            <SkeletonProfile />
            <SkeletonStatRow />
          </>
        ) : (
          <>
            {/* ── Profile header ────────────────────────────────────── */}
            <Animated.View
              entering={FadeInUp.duration(500).springify()}
              style={styles.header}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
              <Text style={styles.username}>{username}</Text>
              <Text style={styles.userId}>{userId}</Text>
              {isAdminUser && (
                <GlassPill
                  label="ADMIN"
                  color={colors.accent.primary}
                  active
                  style={styles.rolePill}
                />
              )}
            </Animated.View>

            {/* ── Stats row ─────────────────────────────────────────── */}
            <View style={styles.statsRow}>
              <MiniStat label="Points" value={formatPoints(points?.points ?? 0)} color={colors.accent.primary} index={0} />
              <MiniStat label="Streak" value={points?.streak ?? 0} color={colors.accent.amber} index={1} />
              <MiniStat label="Level" value={points?.level ?? 0} color={colors.accent.cyan} index={2} />
            </View>

            {/* ── Settings section ──────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(400).duration(400).springify()}>
              <GlassCard variant="medium" style={styles.settingsCard}>
                <SettingsRow
                  icon="notifications-outline"
                  label="Notifications"
                  onPress={() => {
                    haptics.tap();
                    navigation.navigate('Preferences');
                  }}
                />
                <View style={styles.divider} />
                <SettingsRow
                  icon="options-outline"
                  label="Preferences"
                  onPress={() => {
                    haptics.tap();
                    navigation.navigate('Preferences');
                  }}
                />
                <View style={styles.divider} />
                <SettingsRow
                  icon="people-outline"
                  label="Friends"
                  onPress={() => {
                    haptics.tap();
                    navigation.navigate('Friends');
                  }}
                />
                <View style={styles.divider} />
                <SettingsRow icon="link-outline" label="Linked Accounts" disabled />
              </GlassCard>
            </Animated.View>

            {/* ── Admin section ─────────────────────────────────────── */}
            {isAdminUser && (
              <Animated.View entering={FadeInDown.delay(500).duration(400).springify()}>
                <GlassCard variant="medium" style={styles.adminCard}>
                  <Text style={styles.adminTitle}>Admin Panel</Text>
                  <Text style={styles.adminCaption}>
                    Manage events, users, and system settings
                  </Text>
                  <GlassButton
                    title="Open Admin Dashboard"
                    onPress={() => navigation.navigate('AdminDashboard')}
                    variant="secondary"
                    size="sm"
                    style={styles.adminButton}
                  />
                </GlassCard>
              </Animated.View>
            )}

            {/* ── Danger zone ──────────────────────────────────────── */}
            <Animated.View
              entering={FadeInDown.delay(600).duration(400)}
              style={styles.dangerZone}
            >
              <SignOutButton onPress={handleSignOut} />
            </Animated.View>
          </>
        )}
      </AnimatedScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + 80,
  },

  // Profile header
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarLetter: {
    ...typography.hero,
    color: colors.white,
    fontSize: 34,
    lineHeight: 40,
  },
  username: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  userId: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  rolePill: {
    marginTop: spacing.sm,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  miniStat: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  miniStatValue: {
    ...typography.headline,
    marginBottom: 2,
  },
  miniStatLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
  },

  // Settings
  settingsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + spacing.xs,
  },
  settingsRowDisabled: {
    opacity: 0.5,
  },
  settingsLabel: {
    ...typography.body,
    flex: 1,
    marginLeft: spacing.sm,
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  comingSoon: {
    ...typography.micro,
    color: colors.text.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
  },

  // Admin
  adminCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  adminTitle: {
    ...typography.headline,
    marginBottom: spacing.xs,
  },
  adminCaption: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  adminButton: {
    alignSelf: 'flex-start',
  },

  // Danger zone
  dangerZone: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  signOutButton: {
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
  },
  signOutInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: spacing.md + spacing.sm,
  },
  signOutIcon: {
    marginRight: spacing.sm,
  },
  signOutText: {
    fontWeight: '600',
    fontSize: 15,
    color: colors.accent.rose,
  },
});
