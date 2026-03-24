import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import * as api from '../../api/client';
import type { AdminCrew } from '../../api/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { SearchBar } from '../../components/shared/SearchBar';
import { DataList } from '../../components/shared/DataList';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

export function CrewsScreen() {
  const insets = useSafeAreaInsets();
  const [crews, setCrews] = useState<AdminCrew[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchCrews = useCallback(async () => {
    try {
      const data = await api.getAdminCrews({
        limit: 50,
        search: search || undefined,
      });
      setCrews(data.crews);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchCrews, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search, fetchCrews]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCrews();
  }, [fetchCrews]);

  const copyCode = useCallback(async (code: string) => {
    haptics.success();
    try {
      await Clipboard.setStringAsync(code);
    } catch {
      // clipboard not available in some envs
    }
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AdminCrew }) => (
      <GlassCard
        variant="subtle"
        style={styles.card}
        onPress={() => copyCode(item.join_code)}>
        <View style={styles.cardInner}>
          <Text style={styles.emoji}>{item.emoji || '\u2694'}</Text>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.member_count} members | Code:{' '}
              <Text style={styles.code}>{item.join_code}</Text>
            </Text>
          </View>
          {copied === item.join_code && (
            <Text style={styles.copied}>Copied!</Text>
          )}
        </View>
      </GlassCard>
    ),
    [copied, copyCode],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title="Crews" />
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search crews..." />
      </View>
      <DataList
        data={crews}
        renderItem={renderItem}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyMessage="No crews found"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  searchWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  card: { marginBottom: spacing.sm },
  cardInner: { flexDirection: 'row', padding: spacing.md, alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  name: { ...typography.headline },
  meta: { ...typography.caption, marginTop: 2 },
  code: { color: colors.accent.primary, fontWeight: '600' },
  copied: { ...typography.micro, color: colors.semantic.success },
});
