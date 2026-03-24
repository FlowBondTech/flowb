import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import * as api from '../../api/client';
import type { Venue } from '../../api/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassSheet } from '../../components/glass/GlassSheet';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { Badge } from '../../components/shared/Badge';
import { DataList } from '../../components/shared/DataList';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function VenuesScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ name: '', venue_type: '', capacity: '', city: '' });

  const fetch = useCallback(async () => {
    try {
      const data = await api.getVenues();
      setVenues(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleCreate = async () => {
    await api.createVenue({
      ...form,
      capacity: form.capacity ? Number(form.capacity) : undefined,
    });
    setSheetOpen(false);
    setForm({ name: '', venue_type: '', capacity: '', city: '' });
    fetch();
  };

  const renderItem = useCallback(
    ({ item }: { item: Venue }) => (
      <GlassCard variant="subtle" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.name}</Text>
              {item.is_main_venue && <Text style={styles.crown}>M</Text>}
            </View>
            <View style={styles.metaRow}>
              {item.venue_type && <Badge label={item.venue_type} small />}
              {item.capacity && <Text style={styles.meta}>Cap: {item.capacity}</Text>}
              {item.city && <Text style={styles.meta}>{item.city}</Text>}
            </View>
          </View>
        </View>
      </GlassCard>
    ),
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader
        title="Venues"
        onBack={() => nav.goBack()}
        rightAction={
          <Pressable onPress={() => setSheetOpen(true)} hitSlop={12}>
            <Text style={styles.addBtn}>+</Text>
          </Pressable>
        }
      />
      <DataList
        data={venues}
        renderItem={renderItem}
        loading={loading}
        refreshing={false}
        onRefresh={fetch}
        emptyMessage="No venues"
      />
      <GlassSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="New Venue">
        <View style={styles.form}>
          <GlassInput placeholder="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
          <GlassInput placeholder="Type (bar, venue, gallery...)" value={form.venue_type} onChangeText={(v) => setForm((f) => ({ ...f, venue_type: v }))} />
          <GlassInput placeholder="Capacity" value={form.capacity} onChangeText={(v) => setForm((f) => ({ ...f, capacity: v }))} keyboardType="number-pad" />
          <GlassInput placeholder="City" value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} />
          <GlassButton title="Create" onPress={handleCreate} disabled={!form.name} />
        </View>
      </GlassSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', padding: spacing.md, alignItems: 'center' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.headline },
  crown: { ...typography.micro, color: colors.accent.amber },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, alignItems: 'center' },
  meta: { ...typography.caption },
  addBtn: { fontSize: 28, color: colors.accent.primary, lineHeight: 32 },
  form: { gap: spacing.md, paddingBottom: spacing.lg },
});
