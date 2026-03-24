import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import * as api from '../../api/client';
import type { SupportTicket } from '../../api/types';
import type { ToolsStackParams } from '../../navigation/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { SegmentedControl } from '../../components/shared/SegmentedControl';
import { Badge } from '../../components/shared/Badge';
import { DataList } from '../../components/shared/DataList';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { relativeTime } from '../../utils/formatters';

const STATUS_FILTERS = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Closed', value: 'closed' },
];

const STATUS_COLORS: Record<string, string> = {
  open: colors.semantic.warning,
  in_progress: colors.semantic.info,
  closed: colors.semantic.success,
};

type Nav = NativeStackNavigationProp<ToolsStackParams>;

export function SupportScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getSupportTickets(status);
      setTickets(data.tickets);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  const renderItem = useCallback(
    ({ item }: { item: SupportTicket }) => (
      <GlassCard
        variant="subtle"
        style={styles.card}
        onPress={() => nav.navigate('SupportDetail', { ticketId: item.id })}>
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <Text style={styles.subject} numberOfLines={1}>
              {item.subject}
            </Text>
            <Badge label={item.status} color={STATUS_COLORS[item.status]} small />
          </View>
          <View style={styles.cardMeta}>
            {item.email && <Text style={styles.meta}>{item.email}</Text>}
            <Text style={styles.meta}>{relativeTime(item.created_at)}</Text>
          </View>
        </View>
      </GlassCard>
    ),
    [nav],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title="Support" />
      <View style={styles.filterWrap}>
        <SegmentedControl segments={STATUS_FILTERS} selected={status} onSelect={setStatus} />
      </View>
      <DataList
        data={tickets}
        renderItem={renderItem}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyMessage="No tickets"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  filterWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  card: { marginBottom: spacing.sm },
  cardInner: { padding: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subject: { ...typography.headline, flex: 1, marginRight: spacing.sm },
  cardMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  meta: { ...typography.caption },
});
