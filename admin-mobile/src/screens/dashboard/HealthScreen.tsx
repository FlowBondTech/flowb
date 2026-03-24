import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import * as api from '../../api/client';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { StatusDot } from '../../components/shared/StatusDot';
import { Skeleton } from '../../components/shared/Skeleton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function HealthScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [lumaHealth, setLumaHealth] = useState<any>(null);
  const [egatorStats, setEgatorStats] = useState<any>(null);
  const [notifStats, setNotifStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchAll = useCallback(async () => {
    try {
      const [h, luma, egator, notif] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getLumaHealth().catch(() => null),
        api.getEGatorStats().catch(() => null),
        api.getNotificationStats().catch(() => null),
      ]);
      setHealth(h);
      setLumaHealth(luma);
      setEgatorStats(egator);
      setNotifStats(notif);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAll, 30_000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchAll]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title="Health" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Auto-refresh toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Auto-refresh (30s)</Text>
          <Switch
            value={autoRefresh}
            onValueChange={setAutoRefresh}
            trackColor={{ true: colors.accent.primary, false: colors.glass.medium }}
            thumbColor={colors.white}
          />
        </View>

        {loading ? (
          <>
            <Skeleton height={80} style={styles.mb} />
            <Skeleton height={80} style={styles.mb} />
            <Skeleton height={80} />
          </>
        ) : (
          <>
            {/* Server status */}
            <GlassCard variant="subtle" style={styles.mb}>
              <View style={styles.row}>
                <StatusDot status={health?.status === 'ok' ? 'ok' : 'error'} pulse />
                <View style={styles.info}>
                  <Text style={styles.itemTitle}>Server</Text>
                  <Text style={styles.itemSub}>
                    Status: {health?.status || 'unknown'} | Uptime:{' '}
                    {health?.uptime ? `${Math.floor(health.uptime / 3600)}h` : 'N/A'}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Luma */}
            <GlassCard variant="subtle" style={styles.mb}>
              <View style={styles.row}>
                <StatusDot status={lumaHealth ? 'ok' : 'warning'} />
                <View style={styles.info}>
                  <Text style={styles.itemTitle}>Luma API</Text>
                  <Text style={styles.itemSub}>
                    {lumaHealth ? 'Connected' : 'Not available'}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* EGator */}
            <GlassCard variant="subtle" style={styles.mb}>
              <View style={styles.row}>
                <StatusDot status={egatorStats ? 'ok' : 'disabled'} />
                <View style={styles.info}>
                  <Text style={styles.itemTitle}>eGator Scanner</Text>
                  <Text style={styles.itemSub}>
                    {egatorStats
                      ? `${egatorStats.totalEvents} events | ${egatorStats.cities} cities`
                      : 'Not available'}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Notifications */}
            <GlassCard variant="subtle" style={styles.mb}>
              <View style={styles.row}>
                <StatusDot status={notifStats ? 'ok' : 'disabled'} />
                <View style={styles.info}>
                  <Text style={styles.itemTitle}>Push Notifications</Text>
                  <Text style={styles.itemSub}>
                    {notifStats
                      ? `${notifStats.totalTokens} tokens (TG: ${notifStats.telegramTokens})`
                      : 'Not available'}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Plugins */}
            {health?.plugins?.map((p: any) => (
              <GlassCard key={p.name} variant="subtle" style={styles.mb}>
                <View style={styles.row}>
                  <StatusDot
                    status={p.status === 'ok' ? 'ok' : p.status === 'disabled' ? 'disabled' : 'error'}
                  />
                  <View style={styles.info}>
                    <Text style={styles.itemTitle}>{p.name}</Text>
                    <Text style={styles.itemSub}>{p.status}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  content: { padding: spacing.md, paddingBottom: 120 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  toggleLabel: { ...typography.body, color: colors.text.secondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  info: { flex: 1 },
  itemTitle: { ...typography.headline },
  itemSub: { ...typography.caption, marginTop: 2 },
  mb: { marginBottom: spacing.sm },
});
