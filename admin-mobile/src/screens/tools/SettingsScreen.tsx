import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '../../api/client';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { Skeleton } from '../../components/shared/Skeleton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});

  const fetch = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data.settings || {});
    } catch {
      // settings endpoint might not exist yet
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleEdit = (key: string, value: string) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      haptics.success();
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(edited)) {
        updates[key] = value;
      }
      await api.updateSettings(updates);
      setSettings((prev) => ({ ...prev, ...updates }));
      setEdited({});
    } catch {
      haptics.error();
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(edited).length > 0;
  const allEntries = Object.entries(settings);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={70} style={styles.mb} />
          ))
        ) : allEntries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No settings available</Text>
          </View>
        ) : (
          <>
            {allEntries.map(([key, value]) => (
              <GlassCard key={key} variant="subtle" style={styles.mb}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingKey}>{key}</Text>
                  <GlassInput
                    value={edited[key] ?? String(value ?? '')}
                    onChangeText={(v) => handleEdit(key, v)}
                    placeholder="Value"
                  />
                </View>
              </GlassCard>
            ))}

            {hasChanges && (
              <GlassButton
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                style={styles.saveBtn}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  content: { padding: spacing.md, paddingBottom: 120 },
  mb: { marginBottom: spacing.sm },
  settingRow: { padding: spacing.md },
  settingKey: { ...typography.micro, marginBottom: spacing.xs },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { ...typography.body, color: colors.text.tertiary },
  saveBtn: { marginTop: spacing.md },
});
