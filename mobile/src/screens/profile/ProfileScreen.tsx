/**
 * ProfileScreen
 *
 * User profile with avatar, stats summary, settings links, optional
 * admin panel access, and sign-out. Follows the FlowB glassmorphism
 * dark-themed design system.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassPill } from '../../components/glass/GlassPill';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePointsStore } from '../../stores/usePointsStore';
import { formatPoints } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Settings row ──────────────────────────────────────────────────

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress?: () => void;
}

function SettingsRow({ icon, label, disabled, onPress }: SettingsRowProps) {
  return (
    <View
      style={[styles.settingsRow, disabled && styles.settingsRowDisabled]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={disabled ? colors.text.tertiary : colors.text.secondary}
      />
      <Text
        style={[
          styles.settingsLabel,
          disabled && { color: colors.text.tertiary },
        ]}
      >
        {label}
      </Text>
      <View style={styles.settingsRight}>
        {disabled && (
          <Text style={styles.comingSoon}>Coming soon</Text>
        )}
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.text.tertiary}
        />
      </View>
    </View>
  );
}

// ── Mini stat card ────────────────────────────────────────────────

interface MiniStatProps {
  label: string;
  value: string | number;
  color: string;
}

function MiniStat({ label, value, color }: MiniStatProps) {
  return (
    <GlassCard variant="subtle" style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </GlassCard>
  );
}

// ── Sign-out button (ghost with rose text) ────────────────────────

function SignOutButton({ onPress }: { onPress: () => void }) {
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
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={[styles.signOutButton, { transform: [{ scale }] }]}>
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
  const { user, isAdmin, logout } = useAuthStore();
  const { points, fetchPoints } = usePointsStore();

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const username = user?.username ?? user?.displayName ?? 'User';
  const userId = user?.id ?? '';
  const initial = username.charAt(0).toUpperCase();
  const isAdminUser = isAdmin();

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

  const handleOpenAdmin = useCallback(() => {
    navigation.navigate('AdminDashboard');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile header ────────────────────────────────────── */}
        <View style={styles.header}>
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
        </View>

        {/* ── Stats row ─────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <MiniStat
            label="Points"
            value={formatPoints(points?.points ?? 0)}
            color={colors.accent.primary}
          />
          <MiniStat
            label="Streak"
            value={points?.streak ?? 0}
            color={colors.accent.amber}
          />
          <MiniStat
            label="Level"
            value={points?.level ?? 0}
            color={colors.accent.cyan}
          />
        </View>

        {/* ── Settings section ──────────────────────────────────── */}
        <GlassCard variant="medium" style={styles.settingsCard}>
          <SettingsRow icon="notifications-outline" label="Notifications" />
          <View style={styles.divider} />
          <SettingsRow icon="options-outline" label="Preferences" />
          <View style={styles.divider} />
          <SettingsRow
            icon="link-outline"
            label="Linked Accounts"
            disabled
          />
        </GlassCard>

        {/* ── Admin section ─────────────────────────────────────── */}
        {isAdminUser && (
          <GlassCard variant="medium" style={styles.adminCard}>
            <Text style={styles.adminTitle}>Admin Panel</Text>
            <Text style={styles.adminCaption}>
              Manage events, users, and system settings
            </Text>
            <GlassButton
              title="Open Admin Dashboard"
              onPress={handleOpenAdmin}
              variant="secondary"
              size="sm"
              style={styles.adminButton}
            />
          </GlassCard>
        )}

        {/* ── Danger zone ──────────────────────────────────────── */}
        <View style={styles.dangerZone}>
          <SignOutButton onPress={handleSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: spacing.xxl,
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
    flex: 1,
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
