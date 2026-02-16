/**
 * HomeScreen
 *
 * Event discovery screen with a search bar, horizontal circle filter
 * chips, and a scrollable list of event cards. Each card navigates to
 * the EventDetail screen. Data is fetched on mount and refreshed when
 * category filters change.
 */

import React, { useCallback, useEffect } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassPill } from '../../components/glass/GlassPill';
import { useEventsStore } from '../../stores/useEventsStore';
import { CIRCLES } from '../../utils/constants';
import { formatEventDate } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { EventResult } from '../../api/types';
import type { RootStackParamList } from '../../navigation/types';

// ── Types ────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Component ────────────────────────────────────────────────────────

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const {
    isLoading,
    selectedCategories,
    searchQuery,
    setCategories,
    setSearch,
    fetchEvents,
    filteredEvents,
  } = useEventsStore();

  // ── Initial fetch ─────────────────────────────────────────────────

  useEffect(() => {
    fetchEvents();
  }, []);

  // ── Refetch when filters change ───────────────────────────────────

  useEffect(() => {
    fetchEvents();
  }, [selectedCategories]);

  // ── Handlers ──────────────────────────────────────────────────────

  const toggleCategory = useCallback(
    (id: string) => {
      const next = selectedCategories.includes(id)
        ? selectedCategories.filter((c) => c !== id)
        : [...selectedCategories, id];
      setCategories(next);
      haptics.select();
    },
    [selectedCategories, setCategories]
  );

  const handleEventPress = useCallback(
    (eventId: string) => {
      haptics.tap();
      navigation.navigate('EventDetail', { eventId });
    },
    [navigation]
  );

  const handleRefresh = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Source badge helper ───────────────────────────────────────────

  const sourceBadgeColor = (source: string): string => {
    switch (source.toLowerCase()) {
      case 'luma':
        return colors.accent.cyan;
      case 'eventbrite':
        return colors.accent.amber;
      case 'partiful':
        return colors.accent.rose;
      default:
        return colors.accent.secondary;
    }
  };

  // ── Event card renderer ───────────────────────────────────────────

  const renderEvent = useCallback(
    ({ item }: { item: EventResult }) => (
      <GlassCard
        variant="subtle"
        onPress={() => handleEventPress(item.id)}
        style={styles.eventCard}
      >
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.text.secondary}
            />
            <Text style={styles.metaText}>
              {formatEventDate(item.startTime)}
            </Text>
          </View>

          {item.locationName ? (
            <View style={styles.metaRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.text.secondary}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.locationName}
              </Text>
            </View>
          ) : null}

          {/* Source badge */}
          <View style={styles.badgeRow}>
            <GlassPill
              label={item.source}
              color={sourceBadgeColor(item.source)}
            />
            {item.isFree ? (
              <GlassPill
                label="Free"
                color={colors.accent.emerald}
              />
            ) : null}
          </View>
        </View>
      </GlassCard>
    ),
    [handleEventPress]
  );

  const keyExtractor = useCallback((item: EventResult) => item.id, []);

  const events = filteredEvents();

  // ── Render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Title ────────────────────────────────────────── */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Discover</Text>
      </View>

      {/* ── Search ───────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <GlassInput
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
          icon={
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.text.tertiary}
            />
          }
        />
      </View>

      {/* ── Filter chips ─────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {CIRCLES.map((circle) => (
          <GlassPill
            key={circle.id}
            label={`${circle.emoji} ${circle.label}`}
            active={selectedCategories.includes(circle.id)}
            onPress={() => toggleCategory(circle.id)}
            style={styles.chip}
          />
        ))}
      </ScrollView>

      {/* ── Event list ───────────────────────────────────── */}
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
            progressBackgroundColor={colors.background.depth1}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={colors.text.tertiary}
              />
              <Text style={styles.emptyText}>No events found</Text>
              <Text style={styles.emptyHint}>
                Try adjusting your filters or pull to refresh
              </Text>
            </View>
          ) : null
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
  headerSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  title: {
    ...typography.hero,
    color: colors.text.primary,
  },

  // ── Search ──────────────────────────────────────────────────────
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  // ── Chips ───────────────────────────────────────────────────────
  chipScroll: {
    flexGrow: 0,
    marginTop: spacing.md,
  },
  chipRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    // Extra horizontal padding handled by GlassPill defaults
  },

  // ── Event cards ─────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  eventCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventContent: {
    gap: spacing.xs + 2,
  },
  eventTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  // ── Empty state ─────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.headline,
    color: colors.text.secondary,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    maxWidth: 240,
  },
});
