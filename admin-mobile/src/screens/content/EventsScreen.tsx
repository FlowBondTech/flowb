import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import * as api from '../../api/client';
import type { AdminEvent } from '../../api/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassSheet } from '../../components/glass/GlassSheet';
import { SearchBar } from '../../components/shared/SearchBar';
import { SegmentedControl } from '../../components/shared/SegmentedControl';
import { Badge } from '../../components/shared/Badge';
import { DataList } from '../../components/shared/DataList';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { shortDateTime } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';

const SOURCE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Luma', value: 'luma' },
  { label: 'Eventbrite', value: 'eventbrite' },
  { label: 'Manual', value: 'manual' },
];

const PAGE_SIZE = 30;

export function EventsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const offsetRef = useRef(0);

  const fetchEvents = useCallback(
    async (reset = false) => {
      if (reset) offsetRef.current = 0;
      try {
        const data = await api.getAdminEvents({
          limit: PAGE_SIZE,
          offset: offsetRef.current,
          search: search || undefined,
          source: source || undefined,
        });
        if (reset) {
          setEvents(data.events);
        } else {
          setEvents((prev) => [...prev, ...data.events]);
        }
        setTotal(data.total);
        offsetRef.current += data.events.length;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, source],
  );

  useEffect(() => {
    setLoading(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchEvents(true), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search, source, fetchEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents(true);
  }, [fetchEvents]);

  const onEndReached = useCallback(() => {
    if (events.length < total && !loading) fetchEvents(false);
  }, [events.length, total, loading, fetchEvents]);

  const handleFeature = useCallback(async (event: AdminEvent) => {
    haptics.select();
    await api.featureEvent(event.id, !event.featured);
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, featured: !e.featured } : e)),
    );
  }, []);

  const handleHide = useCallback(async (event: AdminEvent) => {
    haptics.select();
    await api.hideEvent(event.id, !event.hidden);
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, hidden: !e.hidden } : e)),
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AdminEvent }) => (
      <GlassCard
        variant="subtle"
        style={styles.eventCard}
        onPress={() => setSelectedEvent(item)}>
        <View style={styles.eventInner}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.badges}>
              {item.featured && <Badge label="Featured" color={colors.accent.amber} small />}
              {item.hidden && <Badge label="Hidden" color={colors.accent.rose} small />}
            </View>
          </View>
          <View style={styles.eventMeta}>
            {item.start_time && (
              <Text style={styles.metaText}>{shortDateTime(item.start_time)}</Text>
            )}
            {item.source && <Badge label={item.source} small />}
            {item.city && <Text style={styles.metaText}>{item.city}</Text>}
          </View>
        </View>
      </GlassCard>
    ),
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title={`Events (${total})`} />
      <View style={styles.filters}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search events..." />
        <SegmentedControl segments={SOURCE_FILTERS} selected={source} onSelect={setSource} />
      </View>

      <DataList
        data={events}
        renderItem={renderItem}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        emptyMessage="No events found"
      />

      {/* Event detail sheet */}
      <GlassSheet
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title}>
        {selectedEvent && (
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Source: {selectedEvent.source || 'N/A'}</Text>
            <Text style={styles.detailLabel}>City: {selectedEvent.city || 'N/A'}</Text>
            <Text style={styles.detailLabel}>
              Time: {selectedEvent.start_time ? shortDateTime(selectedEvent.start_time) : 'N/A'}
            </Text>
            <Text style={styles.detailLabel}>RSVPs: {selectedEvent.rsvp_count || 0}</Text>
            <View style={styles.detailActions}>
              <Pressable
                onPress={() => {
                  handleFeature(selectedEvent);
                  setSelectedEvent(null);
                }}
                style={styles.actionBtn}>
                <Text style={styles.actionText}>
                  {selectedEvent.featured ? 'Unfeature' : 'Feature'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  handleHide(selectedEvent);
                  setSelectedEvent(null);
                }}
                style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: colors.accent.rose }]}>
                  {selectedEvent.hidden ? 'Unhide' : 'Hide'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </GlassSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  filters: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.sm },
  eventCard: { marginBottom: spacing.sm },
  eventInner: { padding: spacing.md },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eventTitle: { ...typography.headline, flex: 1, marginRight: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.xs },
  eventMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, alignItems: 'center' },
  metaText: { ...typography.caption },
  detailContent: { gap: spacing.sm },
  detailLabel: { ...typography.body, color: colors.text.secondary },
  detailActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', padding: spacing.sm },
  actionText: { ...typography.headline, color: colors.accent.primary },
});
