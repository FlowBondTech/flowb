import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '../../api/client';
import type { AdminEntry } from '../../api/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassSheet } from '../../components/glass/GlassSheet';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { DataList } from '../../components/shared/DataList';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';
import { relativeTime } from '../../utils/formatters';

export function AdminsScreen() {
  const insets = useSafeAreaInsets();
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AdminEntry | null>(null);
  const [form, setForm] = useState({ userId: '', label: '' });

  const fetch = useCallback(async () => {
    try {
      const data = await api.getAdmins();
      setAdmins(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleAdd = async () => {
    if (!form.userId.trim()) return;
    haptics.success();
    await api.addAdmin(form.userId.trim(), form.label.trim() || undefined);
    setSheetOpen(false);
    setForm({ userId: '', label: '' });
    fetch();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    haptics.heavy();
    await api.removeAdmin(removeTarget.user_id);
    setRemoveTarget(null);
    fetch();
  };

  const renderItem = useCallback(
    ({ item }: { item: AdminEntry }) => (
      <GlassCard variant="subtle" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.userId}>{item.user_id}</Text>
            {item.label && <Text style={styles.label}>{item.label}</Text>}
            {item.created_at && (
              <Text style={styles.meta}>Added {relativeTime(item.created_at)}</Text>
            )}
          </View>
          <Pressable
            onPress={() => setRemoveTarget(item)}
            hitSlop={12}
            style={styles.removeBtn}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </GlassCard>
    ),
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader
        title="Admins"
        rightAction={
          <Pressable onPress={() => setSheetOpen(true)} hitSlop={12}>
            <Text style={styles.addBtn}>+</Text>
          </Pressable>
        }
      />
      <DataList
        data={admins}
        renderItem={renderItem}
        loading={loading}
        refreshing={false}
        onRefresh={fetch}
        emptyMessage="No admins"
      />

      <GlassSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Add Admin">
        <View style={styles.form}>
          <GlassInput
            placeholder="User ID (e.g. telegram_123)"
            value={form.userId}
            onChangeText={(v) => setForm((f) => ({ ...f, userId: v }))}
            autoCapitalize="none"
          />
          <GlassInput
            placeholder="Label (optional)"
            value={form.label}
            onChangeText={(v) => setForm((f) => ({ ...f, label: v }))}
          />
          <GlassButton title="Add Admin" onPress={handleAdd} disabled={!form.userId.trim()} />
        </View>
      </GlassSheet>

      <ConfirmDialog
        visible={!!removeTarget}
        title="Remove Admin?"
        message={`Remove "${removeTarget?.user_id}" from admins?`}
        destructive
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', padding: spacing.md, alignItems: 'center' },
  info: { flex: 1 },
  userId: { ...typography.headline },
  label: { ...typography.caption, color: colors.accent.primary, marginTop: 2 },
  meta: { ...typography.caption, marginTop: 2 },
  removeBtn: { padding: spacing.sm },
  removeText: { ...typography.caption, color: colors.accent.rose },
  addBtn: { fontSize: 28, color: colors.accent.primary, lineHeight: 32 },
  form: { gap: spacing.md, paddingBottom: spacing.lg },
});
