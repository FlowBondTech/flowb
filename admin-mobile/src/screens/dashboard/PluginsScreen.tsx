import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import * as api from '../../api/client';
import type { PluginInfo } from '../../api/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { StatusDot } from '../../components/shared/StatusDot';
import { Skeleton } from '../../components/shared/Skeleton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

export function PluginsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getPlugins();
      setPlugins(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      haptics.select();
      await api.togglePlugin(id, enabled);
      setPlugins((prev) =>
        prev.map((p) => (p.id === id ? { ...p, enabled } : p)),
      );
    },
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title="Plugins" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={64} style={styles.mb} />
            ))
          : plugins.map((plugin) => (
              <GlassCard key={plugin.id} variant="subtle" style={styles.mb}>
                <View style={styles.row}>
                  <StatusDot status={plugin.enabled ? 'ok' : 'disabled'} />
                  <View style={styles.info}>
                    <Text style={styles.name}>{plugin.name}</Text>
                    {plugin.description ? (
                      <Text style={styles.desc}>{plugin.description}</Text>
                    ) : null}
                  </View>
                  <Switch
                    value={plugin.enabled}
                    onValueChange={(v) => handleToggle(plugin.id, v)}
                    trackColor={{ true: colors.accent.primary, false: colors.glass.medium }}
                    thumbColor={colors.white}
                  />
                </View>
              </GlassCard>
            ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  content: { padding: spacing.md, paddingBottom: 120 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  info: { flex: 1 },
  name: { ...typography.headline },
  desc: { ...typography.caption, marginTop: 2 },
  mb: { marginBottom: spacing.sm },
});
