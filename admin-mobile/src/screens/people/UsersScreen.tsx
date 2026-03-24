import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '../../api/client';
import type { AdminUser } from '../../api/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { SearchBar } from '../../components/shared/SearchBar';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/shared/Badge';
import { DataList } from '../../components/shared/DataList';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { relativeTime } from '../../utils/formatters';

const PAGE_SIZE = 50;

export function UsersScreen() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const offsetRef = useRef(0);

  const fetchUsers = useCallback(
    async (reset = false) => {
      if (reset) offsetRef.current = 0;
      try {
        const data = await api.getAdminUsers({
          limit: PAGE_SIZE,
          offset: offsetRef.current,
          search: search || undefined,
        });
        if (reset) {
          setUsers(data.users);
        } else {
          setUsers((prev) => [...prev, ...data.users]);
        }
        offsetRef.current += data.users.length;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search],
  );

  useEffect(() => {
    setLoading(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchUsers(true), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search, fetchUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers(true);
  }, [fetchUsers]);

  const platformOf = (uid: string) => {
    if (uid.startsWith('telegram_')) return 'Telegram';
    if (uid.startsWith('farcaster_')) return 'Farcaster';
    if (uid.startsWith('web_')) return 'Web';
    return 'Unknown';
  };

  const renderItem = useCallback(
    ({ item }: { item: AdminUser }) => {
      const isExpanded = expanded === item.user_id;
      return (
        <GlassCard
          variant="subtle"
          style={styles.card}
          onPress={() => setExpanded(isExpanded ? null : item.user_id)}>
          <View style={styles.cardInner}>
            <View style={styles.mainRow}>
              <View style={styles.userInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.display_name || item.user_id}
                </Text>
                <Badge label={platformOf(item.user_id)} small />
              </View>
              <Text style={styles.points}>{item.total_points} pts</Text>
            </View>

            {isExpanded && (
              <View style={styles.expanded}>
                <Text style={styles.detail}>ID: {item.user_id}</Text>
                <Text style={styles.detail}>Level: {item.level} | Streak: {item.streak}</Text>
                {item.joined_at && (
                  <Text style={styles.detail}>Joined: {relativeTime(item.joined_at)}</Text>
                )}
              </View>
            )}
          </View>
        </GlassCard>
      );
    },
    [expanded],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title="Users" />
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search users..." />
      </View>
      <DataList
        data={users}
        renderItem={renderItem}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          if (!loading && users.length >= PAGE_SIZE) fetchUsers(false);
        }}
        emptyMessage="No users found"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  searchWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  card: { marginBottom: spacing.sm },
  cardInner: { padding: spacing.md },
  mainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  name: { ...typography.headline, flex: 1 },
  points: { ...typography.caption, color: colors.accent.primary },
  expanded: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  detail: { ...typography.caption, marginBottom: 2 },
});
