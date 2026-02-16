/**
 * NotificationCenter
 *
 * Admin notification management screen showing push/Farcaster token stats
 * and a test notification sender. Stats load on mount; test notifications
 * are sent via the admin API.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import {
  getNotificationStats,
  sendTestNotification,
} from '../../api/client';
import type { NotificationStats } from '../../api/types';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassInput } from '../../components/glass/GlassInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatCompact } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';

// ── Component ────────────────────────────────────────────────────────

export function NotificationCenter() {
  const navigation = useNavigation();
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [testUserId, setTestUserId] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [testBody, setTestBody] = useState('');
  const [sending, setSending] = useState(false);

  // ── Load stats ──────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const data = await getNotificationStats();
      setStats(data);
    } catch {
      // keep null
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Send test notification ──────────────────────────────────────────

  const handleSendTest = useCallback(async () => {
    if (!testUserId.trim() || !testTitle.trim() || !testBody.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    setSending(true);
    haptics.tap();

    try {
      await sendTestNotification(testUserId.trim(), testTitle.trim(), testBody.trim());
      haptics.success();
      Alert.alert('Sent', 'Test notification sent successfully.');
      setTestUserId('');
      setTestTitle('');
      setTestBody('');
    } catch {
      haptics.error();
      Alert.alert('Error', 'Failed to send test notification.');
    } finally {
      setSending(false);
    }
  }, [testUserId, testTitle, testBody]);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Token stats ────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>TOKEN STATS</Text>

        <View style={styles.statsGrid}>
          {/* Farcaster active */}
          <GlassCard variant="subtle" style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="diamond-outline" size={22} color={colors.accent.primary} />
              <Text style={[styles.statValue, { color: colors.accent.primary }]}>
                {stats ? formatCompact(stats.farcasterTokens.active) : '--'}
              </Text>
              <Text style={styles.statLabel}>FC Active</Text>
            </View>
          </GlassCard>

          {/* Farcaster disabled */}
          <GlassCard variant="subtle" style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="diamond-outline" size={22} color={colors.accent.rose} />
              <Text style={[styles.statValue, { color: colors.accent.rose }]}>
                {stats ? formatCompact(stats.farcasterTokens.disabled) : '--'}
              </Text>
              <Text style={styles.statLabel}>FC Disabled</Text>
            </View>
          </GlassCard>

          {/* Push active */}
          <GlassCard variant="subtle" style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="notifications-outline" size={22} color={colors.accent.emerald} />
              <Text style={[styles.statValue, { color: colors.accent.emerald }]}>
                {stats ? formatCompact(stats.pushTokens.active) : '--'}
              </Text>
              <Text style={styles.statLabel}>Push Active</Text>
            </View>
          </GlassCard>
        </View>

        {/* ── Test notification form ─────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
          TEST NOTIFICATION
        </Text>

        <GlassCard variant="subtle" style={styles.formCard}>
          <View style={styles.formContent}>
            <GlassInput
              placeholder="User ID (e.g. telegram_123)"
              value={testUserId}
              onChangeText={setTestUserId}
              icon={
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
            />

            <GlassInput
              placeholder="Notification title"
              value={testTitle}
              onChangeText={setTestTitle}
              icon={
                <Ionicons
                  name="text-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
            />

            <GlassInput
              placeholder="Notification body"
              value={testBody}
              onChangeText={setTestBody}
              multiline
              icon={
                <Ionicons
                  name="chatbox-outline"
                  size={18}
                  color={colors.text.tertiary}
                />
              }
            />

            <GlassButton
              title="Send Test"
              variant="primary"
              size="md"
              loading={sending}
              disabled={!testUserId.trim() || !testTitle.trim() || !testBody.trim()}
              icon={
                <Ionicons name="send-outline" size={16} color={colors.white} />
              }
              onPress={handleSendTest}
              style={styles.sendButton}
            />
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '30%',
  },
  statContent: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.title,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  formCard: {
    // no extra margin needed
  },
  formContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  sendButton: {
    marginTop: spacing.sm,
    width: '100%',
  },
});
