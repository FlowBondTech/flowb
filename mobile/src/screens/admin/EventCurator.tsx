/**
 * EventCurator
 *
 * Admin event management screen with search, feature/unfeature, and
 * hide/show capabilities. Search is debounced to avoid excessive API calls.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { featureEvent, getAdminEvents, hideEvent } from '../../api/client';
import type { EventResult } from '../../api/types';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassInput } from '../../components/glass/GlassInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatEventDate } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';

// ── Extended event type for admin state ───────────────────────────────

interface AdminEvent extends EventResult {
  featured?: boolean;
  hidden?: boolean;
}

// ── Component ────────────────────────────────────────────────────────

export function EventCurator() {
  const navigation = useNavigation();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEvents = useCallback(async (query?: string) => {
    try {
      const data = await getAdminEvents({
        limit: 50,
        search: query || undefined,
      });
      setEvents(data.events as AdminEvent[]);
    } catch {
      // keep current state
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ── Debounced search ────────────────────────────────────────────────

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearch(text);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        loadEvents(text);
      }, 400);
    },
    [loadEvents],
  );

  // ── Actions ─────────────────────────────────────────────────────────

  const handleFeature = useCallback(async (id: string, currentFeatured: boolean) => {
    haptics.tap();
    const newValue = !currentFeatured;

    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, featured: newValue } : e)),
    );

    try {
      await featureEvent(id, newValue);
    } catch {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, featured: currentFeatured } : e)),
      );
      haptics.error();
    }
  }, []);

  const handleHide = useCallback(async (id: string, currentHidden: boolean) => {
    haptics.tap();
    const newValue = !currentHidden;

    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, hidden: newValue } : e)),
    );

    try {
      await hideEvent(id, newValue);
    } catch {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, hidden: currentHidden } : e)),
      );
      haptics.error();
    }
  }, []);

  // ── Render item ─────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: AdminEvent }) => {
      const isFeatured = item.featured ?? false;
      const isHidden = item.hidden ?? false;

      return (
        <GlassCard
          variant="subtle"
          style={[styles.card, isHidden && styles.cardHidden]}
        >
          <View style={styles.cardContent}>
            {/* Event info */}
            <View style={styles.infoRow}>
              {isFeatured && (
                <Ionicons
                  name="star"
                  size={16}
                  color={colors.accent.amber}
                  style={styles.starIcon}
                />
              )}
              <View style={styles.infoText}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.eventDate}>
                  {formatEventDate(item.startTime)}
                </Text>
                {item.locationName && (
                  <Text style={styles.eventLocation} numberOfLines={1}>
                    {item.locationName}
                  </Text>
                )}
              </View>
            </View>

            {/* Action buttons row */}
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => handleFeature(item.id, isFeatured)}
                hitSlop={8}
                style={styles.actionBtn}
              >
                <Ionicons
                  name={isFeatured ? 'star' : 'star-outline'}
                  size={20}
                  color={isFeatured ? colors.accent.amber : colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    isFeatured && { color: colors.accent.amber },
                  ]}
                >
                  {isFeatured ? 'Featured' : 'Feature'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleHide(item.id, isHidden)}
                hitSlop={8}
                style={styles.actionBtn}
              >
                <Ionicons
                  name={isHidden ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={isHidden ? colors.accent.emerald : colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    isHidden && { color: colors.accent.emerald },
                  ]}
                >
                  {isHidden ? 'Show' : 'Hide'}
                </Text>
              </Pressable>
            </View>
          </View>
        </GlassCard>
      );
    },
    [handleFeature, handleHide],
  );

  const keyExtractor = useCallback((item: AdminEvent) => item.id, []);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Events"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchContainer}>
        <GlassInput
          placeholder="Search events..."
          value={search}
          onChangeText={handleSearchChange}
          icon={
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.text.tertiary}
            />
          }
        />
      </View>

      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="calendar-outline"
              size={48}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyText}>No events found</Text>
          </View>
        }
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardHidden: {
    opacity: 0.45,
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  starIcon: {
    marginRight: spacing.xs,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    gap: spacing.xs,
  },
  eventTitle: {
    ...typography.headline,
  },
  eventDate: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  eventLocation: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
