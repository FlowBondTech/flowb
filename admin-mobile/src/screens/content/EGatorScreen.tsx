import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import * as api from '../../api/client';
import type { EGatorStats, ScanCity, AdminEvent } from '../../api/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { StatCard } from '../../components/shared/StatCard';
import { SegmentedControl } from '../../components/shared/SegmentedControl';
import { SearchBar } from '../../components/shared/SearchBar';
import { DataList } from '../../components/shared/DataList';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

const TABS = [
  { label: 'Events', value: 'events' },
  { label: 'Cities', value: 'cities' },
];

export function EGatorScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [tab, setTab] = useState('events');
  const [stats, setStats] = useState<EGatorStats | null>(null);
  const [cities, setCities] = useState<ScanCity[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [search, setSearch] = useState('');
  const [newCity, setNewCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [purgeConfirm, setPurgeConfirm] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [s, c, e] = await Promise.all([
        api.getEGatorStats().catch(() => null),
        api.getEGatorCities().catch(() => []),
        api.getEGatorEvents({ limit: 50, search: search || undefined }).catch(() => ({ events: [], total: 0 })),
      ]);
      setStats(s);
      setCities(c);
      setEvents(e.events);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleScan = async () => {
    haptics.heavy();
    await api.triggerScan();
    fetchAll();
  };

  const handlePurge = async () => {
    haptics.heavy();
    await api.purgeStale(7);
    setPurgeConfirm(false);
    fetchAll();
  };

  const handleAddCity = async () => {
    if (!newCity.trim()) return;
    haptics.success();
    await api.addCity(newCity.trim());
    setNewCity('');
    fetchAll();
  };

  const handleToggleCity = async (city: string) => {
    haptics.select();
    await api.toggleCity(city);
    setCities((prev) =>
      prev.map((c) => (c.city === city ? { ...c, enabled: !c.enabled } : c)),
    );
  };

  const handleRemoveCity = async (city: string) => {
    haptics.heavy();
    await api.removeCity(city);
    setCities((prev) => prev.filter((c) => c.city !== city));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title="eGator" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Events" value={stats?.totalEvents ?? 0} />
          <StatCard label="Cities" value={stats?.cities ?? 0} />
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <GlassButton title="Scan Now" onPress={handleScan} size="sm" style={styles.actionBtn} />
          <GlassButton
            title="Purge Stale"
            variant="secondary"
            onPress={() => setPurgeConfirm(true)}
            size="sm"
            style={styles.actionBtn}
          />
        </View>

        <SegmentedControl segments={TABS} selected={tab} onSelect={setTab} />

        {tab === 'events' ? (
          <View style={styles.section}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search events..." />
            {events.map((e) => (
              <GlassCard key={e.id} variant="subtle" style={styles.mb}>
                <View style={styles.eventRow}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
                  <Text style={styles.eventMeta}>{e.city || ''}</Text>
                </View>
              </GlassCard>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            {/* Add city input */}
            <View style={styles.addCityRow}>
              <TextInput
                value={newCity}
                onChangeText={setNewCity}
                placeholder="Add city..."
                placeholderTextColor={colors.text.tertiary}
                style={styles.cityInput}
                keyboardAppearance="dark"
                onSubmitEditing={handleAddCity}
              />
              <GlassButton title="Add" size="sm" onPress={handleAddCity} disabled={!newCity.trim()} />
            </View>

            {cities.map((c) => (
              <GlassCard key={c.city} variant="subtle" style={styles.mb}>
                <View style={styles.cityRow}>
                  <View style={styles.cityInfo}>
                    <Text style={styles.cityName}>{c.city}</Text>
                    <Text style={styles.cityMeta}>{c.event_count ?? 0} events</Text>
                  </View>
                  <Switch
                    value={c.enabled}
                    onValueChange={() => handleToggleCity(c.city)}
                    trackColor={{ true: colors.accent.primary, false: colors.glass.medium }}
                    thumbColor={colors.white}
                  />
                  <Pressable onPress={() => handleRemoveCity(c.city)} hitSlop={8}>
                    <Text style={styles.removeBtn}>x</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={purgeConfirm}
        title="Purge Stale Events?"
        message="Remove events older than 7 days. This cannot be undone."
        destructive
        confirmLabel="Purge"
        onConfirm={handlePurge}
        onCancel={() => setPurgeConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  content: { padding: spacing.md, paddingBottom: 120 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: { flex: 1 },
  section: { marginTop: spacing.md, gap: spacing.sm },
  mb: { marginBottom: spacing.sm },
  eventRow: { padding: spacing.md },
  eventTitle: { ...typography.headline },
  eventMeta: { ...typography.caption, marginTop: 2 },
  addCityRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  cityInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingVertical: spacing.sm,
  },
  cityRow: { flexDirection: 'row', padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  cityInfo: { flex: 1 },
  cityName: { ...typography.headline },
  cityMeta: { ...typography.caption, marginTop: 2 },
  removeBtn: { fontSize: 18, color: colors.accent.rose, padding: spacing.xs },
});
