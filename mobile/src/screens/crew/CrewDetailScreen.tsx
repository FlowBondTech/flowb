/**
 * CrewDetailScreen
 *
 * Full crew view with member list, active check-ins, crew chat,
 * and a leaderboard. Loads member and check-in data from the crew
 * store and leaderboard from the API. Provides a bottom check-in CTA.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { GlassButton } from '../../components/glass/GlassButton';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassHeader } from '../../components/glass/GlassHeader';
import { GlassPill } from '../../components/glass/GlassPill';
import * as api from '../../api/client';
import { useCrewStore } from '../../stores/useCrewStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatPoints, formatRelative } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import type { CrewCheckin, CrewMember, CrewMessage, LeaderboardEntry } from '../../api/types';

// ── Types ────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList, 'CrewDetail'>;
type Route = RouteProp<RootStackParamList, 'CrewDetail'>;

// ── Status color mapping ─────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  here: colors.accent.emerald,
  heading: colors.accent.amber,
  leaving: colors.accent.rose,
};

// ── Avatar color palette for crew members ────────────────────────────

const AVATAR_COLORS = [
  colors.accent.primary,
  colors.accent.cyan,
  colors.accent.emerald,
  colors.accent.amber,
  colors.accent.rose,
  colors.accent.secondary,
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(displayName?: string, userId?: string): string {
  if (displayName) {
    const parts = displayName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }
  if (userId) {
    return userId.slice(0, 2).toUpperCase();
  }
  return '??';
}

// ── Crew Chat Message Component ─────────────────────────────────────

function ChatMessageItem({
  msg,
  isOwn,
}: {
  msg: CrewMessage;
  isOwn: boolean;
}) {
  const avatarColor = getAvatarColor(msg.user_id);
  const initials = getInitials(msg.display_name, msg.user_id);

  return (
    <View style={[chatStyles.messageRow, isOwn ? chatStyles.messageRowOwn : chatStyles.messageRowOther]}>
      {!isOwn && (
        <View style={[chatStyles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={chatStyles.avatarText}>{initials}</Text>
        </View>
      )}
      <View style={[chatStyles.messageBubble, isOwn ? chatStyles.bubbleOwn : chatStyles.bubbleOther]}>
        {!isOwn && msg.display_name && (
          <Text style={chatStyles.senderName}>{msg.display_name}</Text>
        )}
        <Text style={[chatStyles.messageText, isOwn ? chatStyles.messageTextOwn : chatStyles.messageTextOther]}>
          {msg.message}
        </Text>
        <Text style={chatStyles.messageTime}>{formatRelative(msg.created_at)}</Text>
      </View>
    </View>
  );
}

// ── Component ────────────────────────────────────────────────────────

export function CrewDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { crewId, crewName, crewEmoji } = route.params;

  const getMembers = useCrewStore((s) => s.getMembers);
  const currentUser = useAuthStore((s) => s.user);

  const [members, setMembers] = useState<CrewMember[]>([]);
  const [checkins, setCheckins] = useState<CrewCheckin[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState<CrewMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const chatInputRef = useRef<TextInput>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = currentUser?.id || '';

  // ── Data loading ────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [memberData, lb] = await Promise.all([
        getMembers(crewId),
        api.getCrewLeaderboard(crewId),
      ]);
      setMembers(memberData.members);
      setCheckins(memberData.checkins);
      setLeaderboard(lb);
    } catch {
      // Silently handle -- could add error state in a future iteration
    } finally {
      setLoading(false);
    }
  }, [crewId, getMembers]);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await api.getCrewMessages(crewId);
      setChatMessages(msgs);
    } catch {
      // Silent -- chat is supplementary
    }
  }, [crewId]);

  useEffect(() => {
    loadData();
    loadMessages();
  }, [loadData, loadMessages]);

  // Poll for new messages every 5 seconds when chat is expanded
  useEffect(() => {
    if (chatExpanded) {
      pollTimerRef.current = setInterval(loadMessages, 5000);
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [chatExpanded, loadMessages]);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleCheckin = useCallback(() => {
    haptics.tap();
    navigation.navigate('Checkin', { crewId, crewName });
  }, [crewId, crewName, navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const toggleChat = useCallback(() => {
    haptics.tap();
    setChatExpanded((prev) => !prev);
    if (!chatExpanded) {
      loadMessages();
    }
  }, [chatExpanded, loadMessages]);

  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;

    haptics.tap();
    setChatSending(true);
    setChatInput('');
    Keyboard.dismiss();

    try {
      const newMsg = await api.sendCrewMessage(crewId, text);
      setChatMessages((prev) => [...prev, newMsg]);
    } catch {
      // Restore input on failure
      setChatInput(text);
    } finally {
      setChatSending(false);
    }
  }, [chatInput, chatSending, crewId]);

  // ── Chat render item ──────────────────────────────────────────────

  const renderChatItem = useCallback(
    ({ item }: { item: CrewMessage }) => (
      <ChatMessageItem msg={item} isOwn={item.user_id === currentUserId} />
    ),
    [currentUserId]
  );

  const chatKeyExtractor = useCallback((item: CrewMessage) => item.id, []);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <GlassHeader
        title={`${crewEmoji} ${crewName}`}
        onBack={handleBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Members section ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>

          {members.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No members yet</Text>
          ) : (
            members.map((m) => (
              <GlassCard key={m.user_id} variant="subtle" style={styles.memberCard}>
                <View style={styles.memberContent}>
                  <View style={styles.memberInfo}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.memberId} numberOfLines={1}>
                      {m.user_id}
                    </Text>
                  </View>

                  <View style={styles.memberMeta}>
                    <GlassPill
                      label={m.role}
                      color={
                        m.role === 'captain'
                          ? colors.accent.primary
                          : colors.text.secondary
                      }
                      active={m.role === 'captain'}
                    />
                    <Text style={styles.joinedAt}>
                      {formatRelative(m.joined_at)}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))
          )}
        </View>

        {/* ── Active check-ins section ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Check-ins</Text>

          {checkins.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No active check-ins</Text>
          ) : (
            checkins.map((c, idx) => (
              <GlassCard
                key={`${c.user_id}-${idx}`}
                variant="subtle"
                style={styles.checkinCard}
              >
                <View style={styles.checkinContent}>
                  <View style={styles.checkinHeader}>
                    <Ionicons
                      name="location"
                      size={16}
                      color={STATUS_COLORS[c.status] ?? colors.text.secondary}
                    />
                    <Text style={styles.venueName} numberOfLines={1}>
                      {c.venue_name}
                    </Text>
                    <GlassPill
                      label={c.status}
                      color={STATUS_COLORS[c.status] ?? colors.text.secondary}
                      active
                    />
                  </View>

                  {c.message ? (
                    <Text style={styles.checkinMessage} numberOfLines={2}>
                      {c.message}
                    </Text>
                  ) : null}

                  <Text style={styles.checkinTime}>
                    {formatRelative(c.created_at)}
                  </Text>
                </View>
              </GlassCard>
            ))
          )}
        </View>

        {/* ── Crew Chat section ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Pressable style={styles.chatHeaderRow} onPress={toggleChat}>
            <Text style={styles.sectionTitle}>Crew Chat</Text>
            <View style={styles.chatToggle}>
              <Text style={styles.chatToggleLabel}>
                {chatMessages.length > 0 ? `${chatMessages.length} messages` : 'Start chatting'}
              </Text>
              <Ionicons
                name={chatExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.text.secondary}
              />
            </View>
          </Pressable>

          {chatExpanded && (
            <GlassCard variant="subtle" style={chatStyles.chatCard}>
              {chatMessages.length === 0 ? (
                <View style={chatStyles.emptyChat}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={32}
                    color={colors.text.tertiary}
                  />
                  <Text style={chatStyles.emptyChatText}>
                    No messages yet. Start the conversation!
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={chatMessages}
                  renderItem={renderChatItem}
                  keyExtractor={chatKeyExtractor}
                  inverted
                  style={chatStyles.chatList}
                  contentContainerStyle={chatStyles.chatListContent}
                  showsVerticalScrollIndicator={false}
                />
              )}

              {/* Chat input */}
              <View style={chatStyles.inputRow}>
                <TextInput
                  ref={chatInputRef}
                  style={chatStyles.textInput}
                  placeholder="Message your crew..."
                  placeholderTextColor={colors.text.tertiary}
                  value={chatInput}
                  onChangeText={setChatInput}
                  editable={!chatSending}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  selectionColor={colors.accent.primary}
                  keyboardAppearance="dark"
                  multiline={false}
                />
                <Pressable
                  style={[
                    chatStyles.sendButton,
                    (!chatInput.trim() || chatSending) && chatStyles.sendButtonDisabled,
                  ]}
                  onPress={handleSendMessage}
                  disabled={!chatInput.trim() || chatSending}
                >
                  <Ionicons
                    name="send"
                    size={16}
                    color={
                      chatInput.trim() && !chatSending
                        ? colors.white
                        : colors.text.tertiary
                    }
                  />
                </Pressable>
              </View>
            </GlassCard>
          )}
        </View>

        {/* ── Leaderboard section ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>

          {leaderboard.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No points earned yet</Text>
          ) : (
            leaderboard.slice(0, 10).map((entry, idx) => (
              <GlassCard
                key={entry.user_id}
                variant="subtle"
                style={styles.leaderboardCard}
              >
                <View style={styles.leaderboardRow}>
                  <Text style={styles.rank}>#{idx + 1}</Text>
                  <Text style={styles.leaderUserId} numberOfLines={1}>
                    {entry.user_id}
                  </Text>
                  <View style={styles.leaderStats}>
                    <Text style={styles.leaderPoints}>
                      {formatPoints(entry.total_points)} pts
                    </Text>
                    {entry.current_streak > 0 ? (
                      <Text style={styles.streak}>
                        {entry.current_streak}d streak
                      </Text>
                    ) : null}
                  </View>
                </View>
              </GlassCard>
            ))
          )}
        </View>

        {/* Bottom spacer for the CTA */}
        <View style={styles.ctaSpacer} />
      </ScrollView>

      {/* ── Floating check-in CTA ────────────────────────────────────── */}
      <View style={styles.ctaWrap}>
        <GlassButton
          title="Check In"
          variant="primary"
          size="lg"
          onPress={handleCheckin}
          icon={
            <Ionicons name="location" size={20} color={colors.white} />
          }
        />
      </View>
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
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.tertiary,
    paddingVertical: spacing.md,
  },

  // Chat header row
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  chatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chatToggleLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  // Members
  memberCard: {
    marginBottom: spacing.xs,
  },
  memberContent: {
    padding: spacing.sm + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  memberId: {
    ...typography.body,
    flex: 1,
  },
  memberMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  joinedAt: {
    ...typography.micro,
    color: colors.text.tertiary,
  },

  // Check-ins
  checkinCard: {
    marginBottom: spacing.xs,
  },
  checkinContent: {
    padding: spacing.sm + spacing.xs,
    gap: spacing.xs,
  },
  checkinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  venueName: {
    ...typography.headline,
    flex: 1,
  },
  checkinMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginLeft: spacing.lg + spacing.xs,
  },
  checkinTime: {
    ...typography.micro,
    color: colors.text.tertiary,
    marginLeft: spacing.lg + spacing.xs,
  },

  // Leaderboard
  leaderboardCard: {
    marginBottom: spacing.xs,
  },
  leaderboardRow: {
    padding: spacing.sm + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rank: {
    ...typography.headline,
    color: colors.accent.amber,
    width: 32,
  },
  leaderUserId: {
    ...typography.body,
    flex: 1,
  },
  leaderStats: {
    alignItems: 'flex-end',
  },
  leaderPoints: {
    ...typography.headline,
    color: colors.accent.primary,
  },
  streak: {
    ...typography.micro,
    color: colors.accent.emerald,
  },

  // CTA
  ctaSpacer: {
    height: 80,
  },
  ctaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    backgroundColor: colors.background.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
});

// ── Chat styles ──────────────────────────────────────────────────────

const AVATAR_SIZE = 32;

const chatStyles = StyleSheet.create({
  chatCard: {
    overflow: 'hidden',
  },

  // Empty state
  emptyChat: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyChatText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Message list
  chatList: {
    maxHeight: 300,
  },
  chatListContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },

  // Message rows
  messageRow: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },

  // Avatar
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },

  // Bubbles
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: 14,
  },
  bubbleOwn: {
    backgroundColor: colors.accent.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.background.depth2,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderBottomLeftRadius: 4,
  },

  // Sender name
  senderName: {
    ...typography.micro,
    color: colors.accent.cyan,
    marginBottom: 2,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'none',
    fontWeight: '600',
  },

  // Message text
  messageText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: colors.white,
  },
  messageTextOther: {
    color: colors.text.primary,
  },

  // Time
  messageTime: {
    ...typography.micro,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
    textAlign: 'right',
    letterSpacing: 0,
    textTransform: 'none',
  },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    paddingVertical: Platform.select({ ios: 10, android: 8 }),
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.depth1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.glass.light,
  },
});
