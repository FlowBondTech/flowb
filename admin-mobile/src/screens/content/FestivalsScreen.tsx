import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import * as api from '../../api/client';
import type { Festival } from '../../api/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassSheet } from '../../components/glass/GlassSheet';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { DataList } from '../../components/shared/DataList';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { shortDate } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';

export function FestivalsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Festival | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Festival | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', city: '', image_url: '' });

  const fetch = useCallback(async () => {
    try {
      const data = await api.getFestivals();
      setFestivals(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', city: '', image_url: '' });
    setSheetOpen(true);
  };

  const openEdit = (f: Festival) => {
    setEditing(f);
    setForm({ name: f.name, slug: f.slug, city: f.city || '', image_url: f.image_url || '' });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    haptics.success();
    if (editing) {
      await api.updateFestival(editing.id, form);
    } else {
      await api.createFestival(form);
    }
    setSheetOpen(false);
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    haptics.heavy();
    await api.deleteFestival(deleteTarget.id);
    setDeleteTarget(null);
    fetch();
  };

  const renderItem = useCallback(
    ({ item }: { item: Festival }) => (
      <GlassCard variant="subtle" style={styles.card} onPress={() => openEdit(item)}>
        <View style={styles.cardInner}>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.city || 'No city'}
              {item.start_date ? ` | ${shortDate(item.start_date)}` : ''}
            </Text>
          </View>
          <View style={styles.toggles}>
            {item.featured && <Text style={styles.featured}>F</Text>}
            {!item.enabled && <Text style={styles.disabled}>OFF</Text>}
          </View>
        </View>
      </GlassCard>
    ),
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader
        title="Festivals"
        onBack={() => nav.goBack()}
        rightAction={
          <Pressable onPress={openCreate} hitSlop={12}>
            <Text style={styles.addBtn}>+</Text>
          </Pressable>
        }
      />
      <DataList
        data={festivals}
        renderItem={renderItem}
        loading={loading}
        refreshing={false}
        onRefresh={fetch}
        emptyMessage="No festivals"
      />

      <GlassSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Festival' : 'New Festival'}>
        <View style={styles.form}>
          <GlassInput placeholder="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
          <GlassInput placeholder="Slug" value={form.slug} onChangeText={(v) => setForm((f) => ({ ...f, slug: v }))} />
          <GlassInput placeholder="City" value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} />
          <GlassInput placeholder="Image URL" value={form.image_url} onChangeText={(v) => setForm((f) => ({ ...f, image_url: v }))} />
          <GlassButton title="Save" onPress={handleSave} disabled={!form.name} />
          {editing && (
            <GlassButton
              title="Delete"
              variant="ghost"
              onPress={() => {
                setSheetOpen(false);
                setDeleteTarget(editing);
              }}
            />
          )}
        </View>
      </GlassSheet>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Festival?"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        destructive
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  card: { marginBottom: spacing.sm },
  cardInner: { flexDirection: 'row', padding: spacing.md, alignItems: 'center' },
  cardInfo: { flex: 1 },
  name: { ...typography.headline },
  meta: { ...typography.caption, marginTop: 2 },
  toggles: { flexDirection: 'row', gap: spacing.xs },
  featured: { ...typography.micro, color: colors.accent.amber },
  disabled: { ...typography.micro, color: colors.accent.rose },
  addBtn: { fontSize: 28, color: colors.accent.primary, lineHeight: 32 },
  form: { gap: spacing.md, paddingBottom: spacing.lg },
});
