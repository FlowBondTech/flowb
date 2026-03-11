/**
 * BizDashboardScreen
 *
 * Aggregate biz dashboard with:
 *   - Greeting header with biz badge
 *   - KPI cards row (Meetings Today, Leads, Pipeline Value, Tasks Due)
 *   - Quick actions (Schedule Meeting, Add Lead, View Pipeline, AI Chat)
 *   - Today's timeline
 *   - Recent activity feed
 *   - Pull-to-refresh
 */

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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard } from '../../components/glass/GlassCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { glassStyle } from '../../theme/glass';
import { haptics } from '../../utils/haptics';
import { formatRelative, formatEventDate } from '../../utils/formatters';
import { useAuthStore } from '../../stores/useAuthStore';
import * as api from '../../api/client';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface DashboardData {
  meetings_today: number;
  total_leads: number;
  pipeline_value: number;
  tasks_due: number;
  recent_activity: Activity[];
}

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface Meeting {
  id: string;
  title: string;
  starts_at: string;
  status: string;
  location?: string;
}

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  lead_created: { icon: 'person-add', color: colors.accent.cyan },
  lead_stage_change: { icon: 'swap-horizontal', color: colors.accent.primary },
  lead_won: { icon: 'trophy', color: colors.accent.emerald },
  meeting_scheduled: { icon: 'calendar', color: colors.accent.amber },
  meeting_completed: { icon: 'checkmark-circle', color: colors.accent.emerald },
  checkin: { icon: 'location', color: colors.accent.cyan },
  referral_earned: { icon: 'cash', color: colors.accent.emerald },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
}

export function BizDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<DashboardData | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashData, meetingData] = await Promise.all([
        api.getDashboard(),
        api.getMeetings('today').catch(() => ({ meetings: [] })),
      ]);
      setData(dashData);
      setMeetings((meetingData as any).meetings || []);
    } catch (err) {
      console.warn('[biz-dash] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  const displayName = user?.displayName || user?.username || 'there';
  const firstName = displayName.split(' ')[0];

  const kpis = [
    { label: 'Meetings', value: String(data?.meetings_today || 0), icon: 'calendar', color: colors.accent.amber },
    { label: 'Leads', value: String(data?.total_leads || 0), icon: 'people', color: colors.accent.cyan },
    { label: 'Pipeline', value: formatCurrency(data?.pipeline_value || 0), icon: 'trending-up', color: colors.accent.emerald },
    { label: 'Tasks', value: String(data?.tasks_due || 0), icon: 'checkbox', color: colors.accent.primary },
  ];

  const quickActions = [
    { label: 'Meeting', icon: 'add-circle', color: colors.accent.amber, onPress: () => { haptics.tap(); navigation.navigate('CreateMeeting'); } },
    { label: 'Lead', icon: 'person-add', color: colors.accent.cyan, onPress: () => { haptics.tap(); navigation.navigate('CreateLead'); } },
    { label: 'Pipeline', icon: 'funnel', color: colors.accent.emerald, onPress: () => { haptics.tap(); navigation.navigate('Kanban'); } },
    { label: 'AI Chat', icon: 'chatbubble-ellipses', color: colors.accent.secondary, onPress: () => { haptics.tap(); navigation.getParent()?.navigate('ChatTab' as any); } },
  ];

  return (
    <LinearGradient
      colors={[colors.background.base, colors.background.depth2, colors.background.base]}
      locations={[0, 0.4, 1]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.md }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Greeting */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
          <View style={styles.bizBadge}>
            <Ionicons name="briefcase" size={12} color={colors.accent.primary} />
            <Text style={styles.bizBadgeText}>BIZ</Text>
          </View>
        </Animated.View>

        {/* KPI Cards */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View style={styles.kpiRow}>
            {kpis.map((kpi, i) => (
              <GlassCard key={kpi.label} variant="subtle" style={styles.kpiCard}>
                <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
                <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
              </GlassCard>
            ))}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <View style={styles.actionsRow}>
            {quickActions.map((action) => (
              <Pressable key={action.label} style={styles.actionButton} onPress={action.onPress}>
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Today's Timeline */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today</Text>
            <Pressable onPress={() => { haptics.tap(); navigation.navigate('MeetingList'); }}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>

          {meetings.length === 0 ? (
            <GlassCard variant="subtle" style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={24} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No meetings scheduled today</Text>
            </GlassCard>
          ) : (
            meetings.map((meeting) => (
              <GlassCard
                key={meeting.id}
                variant="subtle"
                style={styles.timelineCard}
                onPress={() => navigation.navigate('MeetingDetail', { meetingId: meeting.id })}
              >
                <View style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{meeting.title}</Text>
                    <Text style={styles.timelineTime}>
                      {formatEventDate(meeting.starts_at)}
                      {meeting.location ? ` - ${meeting.location}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </View>
              </GlassCard>
            ))
          )}
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          {(!data?.recent_activity?.length) ? (
            <GlassCard variant="subtle" style={styles.emptyCard}>
              <Ionicons name="pulse-outline" size={24} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No recent activity</Text>
            </GlassCard>
          ) : (
            data.recent_activity.map((activity) => {
              const cfg = ACTIVITY_ICONS[activity.activity_type] || { icon: 'ellipse', color: colors.text.secondary };
              return (
                <GlassCard key={activity.id} variant="subtle" style={styles.activityCard}>
                  <View style={styles.activityRow}>
                    <View style={[styles.activityIconBg, { backgroundColor: cfg.color + '20' }]}>
                      <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{activity.title}</Text>
                      {activity.description ? (
                        <Text style={styles.activityDesc} numberOfLines={1}>{activity.description}</Text>
                      ) : null}
                      <Text style={styles.activityTime}>{formatRelative(activity.created_at)}</Text>
                    </View>
                  </View>
                </GlassCard>
              );
            })
          )}
        </Animated.View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  greeting: {
    ...typography.title,
    color: colors.text.primary,
    flex: 1,
  },
  bizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent.primary + '40',
  },
  bizBadgeText: {
    ...typography.micro,
    color: colors.accent.primary,
    letterSpacing: 1,
  },

  // KPI Cards
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 16,
  },
  kpiValue: {
    ...typography.title,
    fontSize: 20,
  },
  kpiLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  seeAll: {
    ...typography.caption,
    color: colors.accent.primary,
  },

  // Empty state
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },

  // Timeline
  timelineCard: {
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.amber,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  timelineTime: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Activity feed
  activityCard: {
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontSize: 14,
  },
  activityDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1,
  },
  activityTime: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },
});
