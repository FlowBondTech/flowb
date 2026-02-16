/**
 * ScheduleScreen
 *
 * Displays the user's personal event schedule with RSVP status, check-in
 * capability, and pull-to-refresh. Each entry renders as a GlassCard with
 * event details, formatted time, venue, and a status pill.
 */

import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassButton } from '../../components/glass/GlassButton';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassPill } from '../../components/glass/GlassPill';
import { useEventsStore } from '../../stores/useEventsStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatEventDate } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { ScheduleEntry } from '../../api/types';

// ── Component ────────────────────────────────────────────────────────

export function ScheduleScreen() {
  const schedule = useEventsStore((s) => s.schedule);
  const isLoading = useEventsStore((s) => s.isLoading);
  const fetchSchedule = useEventsStore((s) => s.fetchSchedule);
  const checkin = useEventsStore((s) => s.checkin);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleCheckin = useCallback(
    async (entryId: string) => {
      haptics.tap();
      try {
        await checkin(entryId);
        haptics.success();
      } catch {
        haptics.error();
        Alert.alert('Check-in Failed', 'Something went wrong. Please try again.');
      }
    },
    [checkin],
  );

  const renderItem = useCallback(
    ({ item }: { item: ScheduleEntry }) => (
      <GlassCard variant="medium" style={styles.card}>
        <View style={styles.cardContent}>
          {/* Header row: title + status */}
          <View style={styles.cardHeader}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {item.event_title}
            </Text>

            {item.checked_in ? (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.accent.emerald}
              />
            ) : null}
          </View>

          {/* Time */}
          <Text style={styles.time}>
            {formatEventDate(item.starts_at)}
          </Text>

          {/* Venue */}
          {item.venue_name ? (
            <View style={styles.venueRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.text.tertiary}
              />
              <Text style={styles.venue} numberOfLines={1}>
                {item.venue_name}
              </Text>
            </View>
          ) : null}

          {/* Footer: RSVP pill + check-in button */}
          <View style={styles.cardFooter}>
            <GlassPill
              label={item.rsvp_status}
              color={
                item.rsvp_status === 'going'
                  ? colors.accent.emerald
                  : colors.accent.amber
              }
              active
            />

            {!item.checked_in ? (
              <GlassButton
                title="Check In"
                variant="secondary"
                size="sm"
                onPress={() => handleCheckin(item.id)}
              />
            ) : null}
          </View>
        </View>
      </GlassCard>
    ),
    [handleCheckin],
  );

  const keyExtractor = useCallback((item: ScheduleEntry) => item.id, []);

  // ── Empty state ─────────────────────────────────────────────────────

  const renderEmpty = useCallback(
    () =>
      !isLoading ? (
        <View style={styles.empty}>
          <Ionicons
            name="compass-outline"
            size={56}
            color={colors.text.tertiary}
          />
          <Text style={styles.emptyTitle}>No events scheduled yet</Text>
          <Text style={styles.emptySubtitle}>
            Browse events and RSVP to build your schedule
          </Text>
        </View>
      ) : null,
    [isLoading],
  );

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.hero}>My Schedule</Text>

      <FlatList
        data={schedule}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchSchedule}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
            progressBackgroundColor={colors.background.depth1}
          />
        }
      />
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
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eventTitle: {
    ...typography.headline,
    flex: 1,
  },
  time: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  venue: {
    ...typography.caption,
    color: colors.text.tertiary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
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
});
