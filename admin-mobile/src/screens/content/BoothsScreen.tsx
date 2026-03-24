import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import * as api from '../../api/client';
import type { Booth } from '../../api/types';
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

const TIER_COLORS: Record<string, string> = {
  platinum: '#E5E4E2',
  gold: colors.accent.amber,
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

export function BoothsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Booth | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', booth_number: '', tier: '' });

  const fetch = useCallback(async () => {
    try {
      const data = await api.getBooths();
      setBooths(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', booth_number: '', tier: '' });
    setSheetOpen(true);
  };

  const openEdit = (b: Booth) => {
    setEditing(b);
    setForm({ name: b.name, slug: b.slug, booth_number: b.booth_number || '', tier: b.tier || '' });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      await api.updateBooth(editing.id, form);
    } else {
      await api.createBooth(form);
    }
    setSheetOpen(false);
    fetch();
  };

  const renderItem = useCallback(
    ({ item }: { item: Booth }) => (
      <GlassCard variant="subtle" style={styles.card} onPress={() => openEdit(item)}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.metaRow}>
              {item.booth_number && <Text style={styles.meta}>#{item.booth_number}</Text>}
              {item.tier && <Badge label={item.tier} color={TIER_COLORS[item.tier]} small />}
            </View>
          </View>
          <View style={styles.icons}>
            {item.has_swag && <Text style={styles.icon}>S</Text>}
            {item.has_demo && <Text style={styles.icon}>D</Text>}
            {item.is_hiring && <Text style={styles.icon}>H</Text>}
          </View>
        </View>
      </GlassCard>
    ),
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader
        title="Booths"
        onBack={() => nav.goBack()}
        rightAction={
          <Pressable onPress={openCreate} hitSlop={12}>
            <Text style={styles.addBtn}>+</Text>
          </Pressable>
        }
      />
      <DataList
        data={booths}
        renderItem={renderItem}
        loading={loading}
        refreshing={false}
        onRefresh={fetch}
        emptyMessage="No booths"
      />
      <GlassSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Booth' : 'New Booth'}>
        <View style={styles.form}>
          <GlassInput placeholder="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
          <GlassInput placeholder="Slug" value={form.slug} onChangeText={(v) => setForm((f) => ({ ...f, slug: v }))} />
          <GlassInput placeholder="Booth #" value={form.booth_number} onChangeText={(v) => setForm((f) => ({ ...f, booth_number: v }))} />
          <GlassInput placeholder="Tier (gold/silver/bronze)" value={form.tier} onChangeText={(v) => setForm((f) => ({ ...f, tier: v }))} />
          <GlassButton title="Save" onPress={handleSave} disabled={!form.name} />
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
  name: { ...typography.headline },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, alignItems: 'center' },
  meta: { ...typography.caption },
  icons: { flexDirection: 'row', gap: spacing.xs },
  icon: { ...typography.micro, color: colors.accent.cyan },
  addBtn: { fontSize: 28, color: colors.accent.primary, lineHeight: 32 },
  form: { gap: spacing.md, paddingBottom: spacing.lg },
});
