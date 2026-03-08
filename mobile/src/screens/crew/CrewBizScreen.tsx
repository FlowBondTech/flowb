/**
 * CrewBizScreen
 *
 * Shows crew business activity feed with live updates:
 * - Lead created/updated/won
 * - Meetings scheduled/completed
 * - Location check-ins
 * - Referral earnings
 * - Team pipeline stats
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassPill } from '../../components/glass/GlassPill';
import { GlassButton } from '../../components/glass/GlassButton';
import { AnimatedHeader } from '../../components/glass/AnimatedHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { glassStyle } from '../../theme/glass';
import { haptics } from '../../utils/haptics';
import { formatRelative } from '../../utils/formatters';
import { API_URL } from '../../utils/constants';
import { useAuthStore } from '../../stores/useAuthStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Activity type config
const ACTIVITY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  lead_created: { icon: 'person-add', color: colors.accent.cyan, label: 'New Lead' },
  lead_stage_change: { icon: 'swap-horizontal', color: colors.accent.primary, label: 'Stage Change' },
  lead_won: { icon: 'trophy', color: colors.accent.emerald, label: 'Deal Won!' },
  lead_shared: { icon: 'share-social', color: colors.accent.secondary, label: 'Lead Shared' },
  meeting_scheduled: { icon: 'calendar', color: colors.accent.amber, label: 'Meeting' },
  meeting_completed: { icon: 'checkmark-circle', color: colors.accent.emerald, label: 'Completed' },
  checkin: { icon: 'location', color: colors.accent.cyan, label: 'Check-in' },
  location_update: { icon: 'navigate', color: colors.accent.primary, label: 'Location' },
  referral_earned: { icon: 'cash', color: colors.accent.emerald, label: 'Earning' },
};

interface Activity {
  id: string;
  user_id: string;
  display_name?: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface PipelineStats {
  total_leads: number;
  total_value: number;
  members: number;
}

export function CrewBizScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CrewBiz'>>();
  const { crewId, crewName, crewEmoji } = route.params;
  const token = useAuthStore((s) => s.token);
  const insets = useSafeAreaInsets();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  );

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `${API_URL}/api/v1/flow/crews/${crewId}/biz-feed?limit=30`;
      if (filter) url += `&type=${filter}`;
      const res = await fetch(url, { headers: headers() });
      const data = await res.json();
      setActivities(data.activities || []);
    } catch (e) {
      console.warn('Feed fetch failed:', e);
    }
    setIsLoading(false);
  }, [crewId, filter, headers]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/v1/flow/crews/${crewId}/pipeline`,
        { headers: headers() },
      );
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch {
      // Pipeline might not be enabled
    }
  }, [crewId, headers]);

  useEffect(() => {
    fetchFeed();
    fetchStats();
  }, [fetchFeed, fetchStats]);

  // Activity filter chips
  const FILTERS = [
    { key: null, label: 'All' },
    { key: 'lead_created', label: 'Leads' },
    { key: 'meeting_scheduled', label: 'Meetings' },
    { key: 'checkin', label: 'Check-ins' },
    { key: 'lead_won', label: 'Wins' },
  ];

  const renderActivity = useCallback(
    ({ item, index }: { item: Activity; index: number }) => {
      const config = ACTIVITY_CONFIG[item.activity_type] || {
        icon: 'ellipse',
        color: colors.text.secondary,
        label: item.activity_type,
      };

      return (
        <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
          <GlassCard variant="subtle" style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: config.color + '20' }]}>
                <Ionicons name={config.icon as any} size={18} color={config.color} />
              </View>
              <View style={styles.activityContent}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityName} numberOfLines={1}>
                    {item.display_name || 'Team member'}
                  </Text>
                  <Text style={styles.activityTime}>
                    {formatRelative(item.created_at)}
                  </Text>
                </View>
                <Text style={styles.activityTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={styles.activityDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      );
    },
    [],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.headerContent}>
        {/* Stats row */}
        {stats ? (
          <Animated.View entering={FadeInRight.duration(400)}>
            <GlassCard variant="medium" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{stats.total_leads}</Text>
                  <Text style={styles.statLabel}>Leads</Text>
                </View>
                <View style={[styles.statDivider]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.accent.emerald }]}>
                    ${stats.total_value >= 1000 ? `${(stats.total_value / 1000).toFixed(1)}k` : stats.total_value}
                  </Text>
                  <Text style={styles.statLabel}>Pipeline</Text>
                </View>
                <View style={[styles.statDivider]} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{stats.members}</Text>
                  <Text style={styles.statLabel}>Members</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        ) : null}

        {/* Filter chips */}
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key || 'all'}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item: f }) => (
            <GlassPill
              label={f.label}
              active={filter === f.key}
              color={filter === f.key ? colors.accent.primary : undefined}
              onPress={() => {
                haptics.tap();
                setFilter(f.key);
              }}
              style={styles.filterChip}
            />
          )}
        />

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={styles.quickAction}
            onPress={() => {
              haptics.tap();
              navigation.navigate('Kanban');
            }}
          >
            <Ionicons name="grid-outline" size={18} color={colors.accent.primary} />
            <Text style={styles.quickActionText}>Pipeline</Text>
          </Pressable>
          <Pressable
            style={styles.quickAction}
            onPress={() => {
              haptics.tap();
              navigation.navigate('CreateLead');
            }}
          >
            <Ionicons name="person-add-outline" size={18} color={colors.accent.cyan} />
            <Text style={styles.quickActionText}>Add Lead</Text>
          </Pressable>
          <Pressable
            style={styles.quickAction}
            onPress={() => {
              haptics.tap();
              navigation.navigate('CreateMeeting');
            }}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.accent.amber} />
            <Text style={styles.quickActionText}>Meeting</Text>
          </Pressable>
          <Pressable
            style={styles.quickAction}
            onPress={() => {
              haptics.tap();
              navigation.navigate('CrewBizSettings', { crewId, crewName });
            }}
          >
            <Ionicons name="settings-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.quickActionText}>Settings</Text>
          </Pressable>
        </View>
      </View>
    ),
    [stats, filter, navigation, crewId, crewName],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{crewEmoji || '🔥'}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {crewName} Biz
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={renderActivity}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="pulse-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyDesc}>
                Start adding leads, scheduling meetings, and checking in to see your crew's activity here.
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              fetchFeed();
              fetchStats();
            }}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  headerEmoji: {
    fontSize: 20,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  headerContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  statsCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.title,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.subtle,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    marginRight: spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.glass.subtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  quickActionText: {
    ...typography.micro,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  activityCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityName: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  activityTime: {
    ...typography.micro,
    color: colors.text.tertiary,
  },
  activityTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  activityDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.text.secondary,
  },
  emptyDesc: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
