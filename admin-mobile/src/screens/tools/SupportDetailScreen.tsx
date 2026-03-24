import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import * as api from '../../api/client';
import type { SupportTicket, SupportMessage } from '../../api/types';
import type { ToolsStackParams } from '../../navigation/types';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassCard } from '../../components/glass/GlassCard';
import { Badge } from '../../components/shared/Badge';
import { Skeleton } from '../../components/shared/Skeleton';
import { colors } from '../../theme/colors';
import { glassStyle } from '../../theme/glass';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { relativeTime } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';

const STATUS_COLORS: Record<string, string> = {
  open: colors.semantic.warning,
  in_progress: colors.semantic.info,
  closed: colors.semantic.success,
};

type RouteType = RouteProp<ToolsStackParams, 'SupportDetail'>;

export function SupportDetailScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const route = useRoute<RouteType>();
  const { ticketId } = route.params;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getSupportTicket(ticketId);
      setTicket(data);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleReply = useCallback(async () => {
    if (!reply.trim() || sending) return;
    haptics.tap();
    setSending(true);
    try {
      await api.replySupportTicket(ticketId, reply.trim());
      setReply('');
      fetch();
    } finally {
      setSending(false);
    }
  }, [reply, sending, ticketId, fetch]);

  const renderMessage = useCallback(({ item }: { item: SupportMessage }) => {
    const isOutbound = item.direction === 'outbound';
    return (
      <View style={[styles.msg, isOutbound ? styles.msgOut : styles.msgIn]}>
        <Text style={styles.msgText}>{item.content}</Text>
        <Text style={styles.msgTime}>{relativeTime(item.created_at)}</Text>
      </View>
    );
  }, []);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <GlassHeader title="Ticket" onBack={() => nav.goBack()} />
        <View style={styles.loadingWrap}>
          <Skeleton height={80} />
          <Skeleton height={40} style={{ marginTop: spacing.md }} />
          <Skeleton height={40} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlassHeader title="Ticket" onBack={() => nav.goBack()} />

      {/* Ticket header card */}
      {ticket && (
        <GlassCard variant="medium" style={styles.headerCard}>
          <View style={styles.headerInner}>
            <Text style={styles.subject}>{ticket.subject}</Text>
            <View style={styles.headerMeta}>
              {ticket.email && <Text style={styles.meta}>{ticket.email}</Text>}
              <Badge label={ticket.status} color={STATUS_COLORS[ticket.status]} small />
            </View>
          </View>
        </GlassCard>
      )}

      {/* Messages */}
      <FlatList
        data={ticket?.messages || []}
        renderItem={renderMessage}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.msgList}
      />

      {/* Reply bar */}
      <View style={[styles.replyBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          value={reply}
          onChangeText={setReply}
          placeholder="Reply..."
          placeholderTextColor={colors.text.tertiary}
          style={styles.replyInput}
          keyboardAppearance="dark"
          multiline
        />
        <Pressable onPress={handleReply} disabled={!reply.trim() || sending}>
          <Text style={[styles.sendText, (!reply.trim() || sending) && styles.sendDisabled]}>
            Send
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.base },
  loadingWrap: { padding: spacing.md },
  headerCard: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  headerInner: { padding: spacing.md },
  subject: { ...typography.headline, marginBottom: spacing.xs },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { ...typography.caption },
  msgList: { padding: spacing.md, paddingBottom: spacing.md },
  msg: {
    maxWidth: '80%',
    padding: spacing.sm + 4,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  msgIn: {
    alignSelf: 'flex-start',
    ...glassStyle('subtle'),
    borderBottomLeftRadius: 4,
  },
  msgOut: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent.primary,
    borderBottomRightRadius: 4,
  },
  msgText: { ...typography.body },
  msgTime: { ...typography.micro, marginTop: spacing.xs, fontSize: 9 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.background.depth1,
  },
  replyInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    maxHeight: 100,
    paddingVertical: spacing.sm,
  },
  sendText: { ...typography.headline, color: colors.accent.primary, paddingLeft: spacing.md, paddingVertical: spacing.sm },
  sendDisabled: { opacity: 0.4 },
});
