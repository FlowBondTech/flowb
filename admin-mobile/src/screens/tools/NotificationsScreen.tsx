import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '../../api/client';
import type { NotificationStats, NotificationRecipient } from '../../api/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassInput } from '../../components/glass/GlassInput';
import { GlassButton } from '../../components/glass/GlassButton';
import { SegmentedControl } from '../../components/shared/SegmentedControl';
import { StatCard } from '../../components/shared/StatCard';
import { SearchBar } from '../../components/shared/SearchBar';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

const TARGET_TYPES = [
  { label: 'User', value: 'user' },
  { label: 'Crew', value: 'crew' },
  { label: 'Role', value: 'role' },
  { label: 'All', value: 'broadcast' },
];

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [targetType, setTargetType] = useState('user');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [broadcastConfirm, setBroadcastConfirm] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api.getNotificationStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (targetType === 'broadcast') {
      setRecipients([]);
      return;
    }
    clearTimeout(searchTimer.current);
    if (recipientSearch.length < 2) {
      setRecipients([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await api.searchRecipients(recipientSearch, targetType);
        setRecipients(data);
      } catch {
        setRecipients([]);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [recipientSearch, targetType]);

  const handleSend = useCallback(async () => {
    if (!title.trim() || !message.trim()) return;
    if (targetType === 'broadcast') {
      setBroadcastConfirm(true);
      return;
    }
    await doSend();
  }, [title, message, targetType, selectedId]);

  const doSend = async () => {
    setSending(true);
    try {
      haptics.success();
      await api.sendNotification({
        target: targetType,
        targetId: targetType !== 'broadcast' ? selectedId : undefined,
        title: title.trim(),
        message: message.trim(),
      });
      setTitle('');
      setMessage('');
      setSelectedId('');
      setBroadcastConfirm(false);
    } catch {
      haptics.error();
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassHeader title="Notifications" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard label="Total Tokens" value={stats.totalTokens} />
            <StatCard label="TG" value={stats.telegramTokens} />
          </View>
        )}

        {/* Target type */}
        <SegmentedControl segments={TARGET_TYPES} selected={targetType} onSelect={setTargetType} />

        {/* Recipient search */}
        {targetType !== 'broadcast' && (
          <View style={styles.recipientSection}>
            <SearchBar
              value={recipientSearch}
              onChangeText={setRecipientSearch}
              placeholder={`Search ${targetType}s...`}
            />
            {recipients.map((r) => (
              <GlassCard
                key={r.user_id}
                variant={selectedId === r.user_id ? 'glow' : 'subtle'}
                style={styles.recipientCard}
                onPress={() => setSelectedId(r.user_id)}>
                <View style={styles.recipientRow}>
                  <Text style={styles.recipientName}>{r.display_name || r.user_id}</Text>
                  <Text style={styles.recipientPlatform}>{r.platform}</Text>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Message form */}
        <View style={styles.form}>
          <GlassInput placeholder="Title" value={title} onChangeText={setTitle} />
          <GlassInput
            placeholder="Message"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <GlassButton
            title={targetType === 'broadcast' ? 'Broadcast' : 'Send'}
            onPress={handleSend}
            loading={sending}
            disabled={!title.trim() || !message.trim() || (targetType !== 'broadcast' && !selectedId)}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={broadcastConfirm}
        title="Broadcast to All?"
        message="This will send a notification to ALL users. Are you sure?"
        destructive
        confirmLabel="Send to All"
        onConfirm={doSend}
        onCancel={() => setBroadcastConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  content: { padding: spacing.md, paddingBottom: 120, gap: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  recipientSection: { gap: spacing.sm },
  recipientCard: { marginTop: spacing.xs },
  recipientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm + 4,
    alignItems: 'center',
  },
  recipientName: { ...typography.body },
  recipientPlatform: { ...typography.caption },
  form: { gap: spacing.md },
});
