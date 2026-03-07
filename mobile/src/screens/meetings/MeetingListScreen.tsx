/**
 * MeetingListScreen
 *
 * Displays upcoming meetings as a staggered GlassCard list with pull-to-
 * refresh and a floating action button to create new meetings. Each card
 * shows title, date/time, duration, type icon, and attendee count.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard } from '../../components/glass/GlassCard';
import { GlassPill } from '../../components/glass/GlassPill';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatEventDate } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { RootScreenProps } from '../../navigation/types';

// ── Constants ────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://flowb.fly.dev';

// ── Types ────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  meeting_type: 'call' | 'coffee' | 'lunch' | 'virtual' | 'office';
  scheduled_at: string;
  duration_minutes: number;
  location?: string;
  attendee_count: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

const MEETING_TYPE_ICONS: Record<Meeting['meeting_type'], keyof typeof Ionicons.glyphMap> = {
  call: 'call-outline',
  coffee: 'cafe-outline',
  lunch: 'restaurant-outline',
  virtual: 'videocam-outline',
  office: 'business-outline',
};

const MEETING_TYPE_COLORS: Record<Meeting['meeting_type'], string> = {
  call: colors.accent.cyan,
  coffee: colors.accent.amber,
  lunch: colors.accent.emerald,
  virtual: colors.accent.primary,
  office: colors.accent.secondary,
};

type Props = RootScreenProps<'MeetingList'>;

// ── Component ────────────────────────────────────────────────────────

export function MeetingListScreen({ navigation }: Props) {
  const token = useAuthStore((s) => s.token);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch meetings ───────────────────────────────────────────────

  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/meetings?filter=upcoming`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings ?? []);
      }
    } catch {
      // Silently handle network errors
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleMeetingPress = useCallback(
    (meetingId: string) => {
      haptics.tap();
      navigation.navigate('MeetingDetail', { meetingId });
    },
    [navigation],
  );

  const handleCreate = useCallback(() => {
    haptics.select();
    navigation.navigate('CreateMeeting');
  }, [navigation]);

  // ── Render item ──────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: Meeting; index: number }) => {
      const typeIcon = MEETING_TYPE_ICONS[item.meeting_type];
      const typeColor = MEETING_TYPE_COLORS[item.meeting_type];

      return (
        <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
          <GlassCard
            variant="medium"
            style={styles.card}
            onPress={() => handleMeetingPress(item.id)}
          >
            <View style={styles.cardContent}>
              {/* Header: type icon + title */}
              <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: typeColor + '20' }]}>
                  <Ionicons name={typeIcon} size={18} color={typeColor} />
                </View>
                <Text style={styles.meetingTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>

              {/* Date / time */}
              <Text style={styles.time}>
                {formatEventDate(item.scheduled_at)}
              </Text>

              {/* Footer: duration pill + attendee count */}
              <View style={styles.cardFooter}>
                <GlassPill
                  label={`${item.duration_minutes} min`}
                  icon={
                    <Ionicons
                      name="time-outline"
                      size={12}
                      color={colors.accent.cyan}
                    />
                  }
                  color={colors.accent.cyan}
                />

                <View style={styles.attendeeRow}>
                  <Ionicons
                    name="people-outline"
                    size={14}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.attendeeCount}>
                    {item.attendee_count}
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      );
    },
    [handleMeetingPress],
  );

  const keyExtractor = useCallback((item: Meeting) => item.id, []);

  // ── Empty state ──────────────────────────────────────────────────

  const renderEmpty = useCallback(
    () =>
      !isLoading ? (
        <View style={styles.empty}>
          <Ionicons
            name="calendar-outline"
            size={56}
            color={colors.text.tertiary}
          />
          <Text style={styles.emptyTitle}>No upcoming meetings</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to schedule your first meeting
          </Text>
        </View>
      ) : null,
    [isLoading],
  );

  // ── Render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.hero}>Meetings</Text>

      <FlatList
        data={meetings}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchMeetings}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
            progressBackgroundColor={colors.background.depth1}
          />
        }
      />

      {/* FAB — Create meeting */}
      <Pressable
        onPress={handleCreate}
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  hero: {
    ...typography.hero,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl * 2,
    flexGrow: 1,
  },

  // Card
  card: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingTitle: {
    ...typography.headline,
    flex: 1,
  },
  time: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attendeeCount: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  // Empty
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
