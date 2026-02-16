/**
 * AdminDashboard
 *
 * Top-level admin overview with stat cards in a 2-column grid, quick
 * action buttons for navigating to sub-screens, and pull-to-refresh.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { getAdminStats } from '../../api/client';
import type { AdminStats } from '../../api/types';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatCompact } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';

// ── Stat card config ──────────────────────────────────────────────────

interface StatConfig {
  key: keyof AdminStats;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const STAT_CARDS: StatConfig[] = [
  { key: 'totalUsers', label: 'Active Users', icon: 'people', color: colors.accent.primary },
  { key: 'totalCrews', label: 'Total Crews', icon: 'globe-outline', color: colors.accent.cyan },
  { key: 'totalRsvps', label: 'RSVPs', icon: 'calendar', color: colors.accent.emerald },
  { key: 'totalCheckins', label: 'Checkins', icon: 'location', color: colors.accent.amber },
  { key: 'topPoints', label: 'Top Points', icon: 'trophy', color: colors.accent.rose },
];

// ── Quick action config ───────────────────────────────────────────────

interface QuickAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Plugins', icon: 'extension-puzzle-outline', screen: 'PluginManager' },
  { label: 'Events', icon: 'calendar-outline', screen: 'EventCurator' },
  { label: 'Users', icon: 'people-outline', screen: 'UserManager' },
  { label: 'Notifications', icon: 'notifications-outline', screen: 'NotificationCenter' },
  { label: 'Settings', icon: 'settings-outline', screen: 'SettingsEditor' },
];

// ── Component ────────────────────────────────────────────────────────

export function AdminDashboard() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (e) {
      // Silently fail — stats remain null until next refresh
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.tap();
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleNavigate = useCallback(
    (screen: string) => {
      haptics.tap();
      navigation.navigate(screen);
    },
    [navigation],
  );

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Admin"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
            progressBackgroundColor={colors.background.depth1}
          />
        }
      >
        {/* ── Stat grid ──────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>OVERVIEW</Text>
        <View style={styles.grid}>
          {STAT_CARDS.map((cfg) => (
            <GlassCard key={cfg.key} variant="subtle" style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name={cfg.icon} size={24} color={cfg.color} />
                <Text style={[styles.statValue, { color: cfg.color }]}>
                  {stats ? formatCompact(stats[cfg.key]) : '--'}
                </Text>
                <Text style={styles.statLabel}>{cfg.label}</Text>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* ── Quick actions ──────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          QUICK ACTIONS
        </Text>
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((action) => (
            <GlassButton
              key={action.screen}
              title={action.label}
              variant="secondary"
              size="md"
              icon={
                <Ionicons
                  name={action.icon}
                  size={18}
                  color={colors.accent.primary}
                />
              }
              onPress={() => handleNavigate(action.screen)}
              style={styles.actionButton}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '47%',
  },
  statContent: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.title,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  actions: {
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
});
