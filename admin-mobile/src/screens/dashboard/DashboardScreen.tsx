import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAdminStore } from '../../stores/useAdminStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { GlassCard } from '../../components/glass/GlassCard';
import { StatCard } from '../../components/shared/StatCard';
import { StatusDot } from '../../components/shared/StatusDot';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

const QUICK_ACTIONS = [
  { label: 'Health', icon: '\u2665', tab: 'DashboardTab', screen: 'Health' },
  { label: 'Plugins', icon: '\u2699', tab: 'DashboardTab', screen: 'Plugins' },
  { label: 'Events', icon: '\u2606', tab: 'ContentTab', screen: 'Events' },
  { label: 'Festivals', icon: '\u2605', tab: 'ContentTab', screen: 'Festivals' },
  { label: 'Booths', icon: '\u25A1', tab: 'ContentTab', screen: 'Booths' },
  { label: 'Venues', icon: '\u25B2', tab: 'ContentTab', screen: 'Venues' },
  { label: 'EGator', icon: '\u2318', tab: 'ContentTab', screen: 'EGator' },
  { label: 'Users', icon: '\u263A', tab: 'PeopleTab', screen: 'Users' },
  { label: 'Crews', icon: '\u2694', tab: 'PeopleTab', screen: 'Crews' },
  { label: 'Admins', icon: '\u2B50', tab: 'PeopleTab', screen: 'Admins' },
  { label: 'Points', icon: '\u2726', tab: 'PeopleTab', screen: 'Points' },
  { label: 'Notify', icon: '\u2709', tab: 'ToolsTab', screen: 'Notifications' },
  { label: 'Chat', icon: '\u2328', tab: 'ToolsTab', screen: 'Chat' },
  { label: 'Support', icon: '\u2753', tab: 'ToolsTab', screen: 'Support' },
  { label: 'Settings', icon: '\u2630', tab: 'ToolsTab', screen: 'Settings' },
];

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { stats, health, fetchStats, fetchHealth, statsLoading } = useAdminStore();
  const logout = useAuthStore((s) => s.logout);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchHealth();
  }, [fetchStats, fetchHealth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchHealth()]);
    setRefreshing(false);
  }, [fetchStats, fetchHealth]);

  const navigateTo = useCallback(
    (tab: string, screen: string) => {
      haptics.tap();
      nav.navigate(tab, { screen });
    },
    [nav],
  );

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top + spacing.md }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent.primary}
        />
      }>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.headerRight}>
          <StatusDot status={health?.status === 'ok' ? 'ok' : 'error'} pulse />
          <Pressable onPress={logout} hitSlop={12}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <StatCard label="Users" value={stats?.totalUsers ?? 0} icon="\u263A" />
        <StatCard label="Crews" value={stats?.totalCrews ?? 0} icon="\u2694" />
      </View>
      <View style={styles.statsRow}>
        <StatCard label="RSVPs" value={stats?.totalRsvps ?? 0} icon="\u2713" />
        <StatCard label="Check-ins" value={stats?.totalCheckins ?? 0} icon="\u2316" />
        <StatCard label="Points" value={stats?.totalPoints ?? 0} icon="\u2726" />
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map((action) => (
          <GlassCard
            key={action.label}
            variant="subtle"
            style={styles.gridItem}
            onPress={() => navigateTo(action.tab, action.screen)}>
            <View style={styles.actionInner}>
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </View>
          </GlassCard>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  content: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.hero },
  logoutText: { ...typography.caption, color: colors.accent.rose },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...typography.headline, marginTop: spacing.lg, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridItem: { width: '30%', flexGrow: 1, minWidth: 100 },
  actionInner: { padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  actionIcon: { fontSize: 22 },
  actionLabel: { ...typography.micro, fontSize: 10 },
});
