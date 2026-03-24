import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '../../api/client';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

interface LogEntry {
  userId: string;
  points: number;
  reason: string;
  time: string;
}

const MEDALS = ['1st', '2nd', '3rd'];

export function PointsScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    api.getAdminUsers({ limit: 10 }).then((d) => setLeaderboard(d.users)).catch(() => {});
  }, []);

  const handleAward = useCallback(async () => {
    if (!userId.trim() || !amount) return;
    setSending(true);
    try {
      haptics.success();
      await api.awardPoints(userId.trim(), Number(amount), reason.trim() || undefined);
      setLog((prev) => [
        { userId: userId.trim(), points: Number(amount), reason: reason.trim(), time: new Date().toISOString() },
        ...prev,
      ]);
      setUserId('');
      setAmount('');
      setReason('');
    } catch (e: any) {
      haptics.error();
    } finally {
      setSending(false);
    }
  }, [userId, amount, reason]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title="Points" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Award form */}
        <GlassCard variant="medium" style={styles.formCard}>
          <View style={styles.formInner}>
            <Text style={styles.formTitle}>Award Points</Text>
            <GlassInput
              placeholder="User ID (e.g. telegram_123)"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
            />
            <GlassInput
              placeholder="Points amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
            />
            <GlassInput
              placeholder="Reason (optional)"
              value={reason}
              onChangeText={setReason}
            />
            <GlassButton
              title="Award"
              onPress={handleAward}
              loading={sending}
              disabled={!userId.trim() || !amount}
            />
          </View>
        </GlassCard>

        {/* Session log */}
        {log.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Log</Text>
            {log.map((entry, i) => (
              <GlassCard key={i} variant="subtle" style={styles.logCard}>
                <View style={styles.logRow}>
                  <Text style={styles.logPoints}>+{entry.points}</Text>
                  <View style={styles.logInfo}>
                    <Text style={styles.logUser}>{entry.userId}</Text>
                    {entry.reason ? <Text style={styles.logReason}>{entry.reason}</Text> : null}
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Top 10 leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 10</Text>
          {leaderboard.map((user: any, i: number) => (
            <GlassCard key={user.user_id} variant="subtle" style={styles.lbCard}>
              <View style={styles.lbRow}>
                <Text style={[styles.rank, i < 3 && styles.rankTop]}>
                  {i < 3 ? MEDALS[i] : `#${i + 1}`}
                </Text>
                <View style={styles.lbInfo}>
                  <Text style={styles.lbName}>{user.display_name || user.user_id}</Text>
                </View>
                <Text style={styles.lbPoints}>{user.total_points}</Text>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  content: { padding: spacing.md, paddingBottom: 120 },
  formCard: { marginBottom: spacing.lg },
  formInner: { padding: spacing.md, gap: spacing.md },
  formTitle: { ...typography.headline, marginBottom: spacing.xs },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.headline, marginBottom: spacing.md },
  logCard: { marginBottom: spacing.xs },
  logRow: { flexDirection: 'row', padding: spacing.sm + 4, alignItems: 'center', gap: spacing.sm },
  logPoints: { ...typography.headline, color: colors.accent.emerald, width: 50 },
  logInfo: { flex: 1 },
  logUser: { ...typography.body },
  logReason: { ...typography.caption },
  lbCard: { marginBottom: spacing.xs },
  lbRow: { flexDirection: 'row', padding: spacing.sm + 4, alignItems: 'center', gap: spacing.sm },
  rank: { ...typography.headline, width: 40, textAlign: 'center', color: colors.text.secondary },
  rankTop: { color: colors.accent.amber },
  lbInfo: { flex: 1 },
  lbName: { ...typography.body },
  lbPoints: { ...typography.headline, color: colors.accent.primary },
});
