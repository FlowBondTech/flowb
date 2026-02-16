/**
 * PluginManager
 *
 * Lists all server plugins with toggle switches to enable/disable each one.
 * Loads the plugin list on mount via the admin API.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { getAdminPlugins, togglePlugin } from '../../api/client';
import type { PluginInfo } from '../../api/types';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

// ── Component ────────────────────────────────────────────────────────

export function PluginManager() {
  const navigation = useNavigation();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadPlugins = useCallback(async () => {
    try {
      const data = await getAdminPlugins();
      setPlugins(data);
    } catch {
      // keep current state on failure
    }
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const handleToggle = useCallback(
    async (id: string, newValue: boolean) => {
      haptics.select();
      setToggling(id);

      // Optimistic update
      setPlugins((prev) =>
        prev.map((p) => (p.id === id ? { ...p, enabled: newValue } : p)),
      );

      try {
        await togglePlugin(id, newValue);
      } catch {
        // Revert on failure
        setPlugins((prev) =>
          prev.map((p) => (p.id === id ? { ...p, enabled: !newValue } : p)),
        );
        haptics.error();
      } finally {
        setToggling(null);
      }
    },
    [],
  );

  // ── Render item ─────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: PluginInfo }) => (
      <GlassCard variant="subtle" style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: item.enabled
                      ? colors.accent.emerald
                      : colors.accent.rose,
                  },
                ]}
              />
              <Text style={styles.pluginName}>{item.name}</Text>
            </View>

            <Switch
              value={item.enabled}
              onValueChange={(val) => handleToggle(item.id, val)}
              trackColor={{
                false: colors.glass.medium,
                true: colors.accent.primary,
              }}
              thumbColor={colors.white}
              disabled={toggling === item.id}
            />
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          {item.actions.length > 0 && (
            <Text style={styles.actions}>
              Actions: {item.actions.join(', ')}
            </Text>
          )}
        </View>
      </GlassCard>
    ),
    [handleToggle, toggling],
  );

  const keyExtractor = useCallback((item: PluginInfo) => item.id, []);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Plugins"
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={plugins}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No plugins loaded</Text>
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
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pluginName: {
    ...typography.headline,
    flex: 1,
  },
  description: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  actions: {
    ...typography.micro,
    color: colors.text.tertiary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
