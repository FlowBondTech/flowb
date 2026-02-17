/**
 * ChatScreen
 *
 * FlowB AI chat interface for the mobile app. Displays an inverted FlatList
 * of messages with user bubbles on the right and assistant bubbles on the left.
 * Quick-action chips appear when the conversation is empty. Includes a typing
 * indicator with animated dots and haptic feedback on send.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GlassCard } from '../../components/glass/GlassCard';
import { sendChat } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

// ── Types ────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ── Constants ────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "What's happening now?", msg: 'What events are happening right now?' },
  { label: 'Find events', msg: 'Show me upcoming events today' },
  { label: 'My schedule', msg: "What's on my schedule?" },
  { label: 'Nearby venues', msg: 'What venues have events nearby?' },
];

const SYSTEM_MESSAGE = {
  role: 'system',
  content: `You are FlowB, a friendly AI assistant for ETHDenver 2026 side events. You help users discover events, hackathons, parties, meetups, and summits happening during ETHDenver week (Feb 15-27, 2026) in Denver.

You have access to a tool called "flowb" that can search events, browse categories, check tonight's events, find free events, and more. Use it when users ask about events.

CRITICAL RULES:
1. ALWAYS reply in a SINGLE message. If the user asks multiple questions, address ALL of them in ONE cohesive response with clear sections.
2. Be conversational, helpful, and concise. Use emojis sparingly.
3. Format event listings clearly with titles, dates, venues, and prices.
4. The user's platform is "mobile" (React Native app).`,
};

let msgCounter = 0;

// ── Simple markdown renderer ─────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Split by bold markers and links
  const regex = /(\*\*.*?\*\*)|(https?:\/\/[^\s<]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const input = text;
  // Reset regex
  regex.lastIndex = 0;

  while ((match = regex.exec(input)) !== null) {
    // Add preceding text
    if (match.index > lastIndex) {
      parts.push(input.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Bold text
      const boldText = match[1].slice(2, -2);
      parts.push(
        <Text key={`b-${match.index}`} style={markdownStyles.bold}>
          {boldText}
        </Text>
      );
    } else if (match[2]) {
      // Link
      const url = match[2];
      parts.push(
        <Text
          key={`l-${match.index}`}
          style={markdownStyles.link}
          onPress={() => Linking.openURL(url)}
        >
          {url}
        </Text>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < input.length) {
    parts.push(input.slice(lastIndex));
  }

  return parts;
}

const markdownStyles = StyleSheet.create({
  bold: {
    fontWeight: '700',
  },
  link: {
    color: colors.accent.cyan,
    textDecorationLine: 'underline',
  },
});

// ── Typing indicator ────────────────────────────────────────────────

function TypingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
    // Stagger the start
    const timer = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        false
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.typingDot, style]} />;
}

function TypingIndicator() {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.typingWrap}>
      <View style={styles.typingContainer}>
        <TypingDot delay={0} />
        <TypingDot delay={150} />
        <TypingDot delay={300} />
      </View>
    </Animated.View>
  );
}

// ── Message bubble ──────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
          ]}
        >
          {isUser ? message.content : renderMarkdown(message.content)}
        </Text>
      </View>
    </View>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // ── Send message ──────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || sending) return;

      haptics.tap();
      setInput('');
      Keyboard.dismiss();

      const userMsg: ChatMessage = {
        id: `msg-${++msgCounter}`,
        role: 'user',
        content: msg,
      };
      setMessages((prev) => [...prev, userMsg]);
      setSending(true);

      try {
        const chatMessages = [
          SYSTEM_MESSAGE,
          ...messages.slice(-20).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user', content: msg },
        ];

        const userId = user?.id || user?.username || 'mobile-anon';
        const response = await sendChat(chatMessages, userId);

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${++msgCounter}`,
            role: 'assistant',
            content: response,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${++msgCounter}`,
            role: 'assistant',
            content: 'Something went wrong. Try again!',
          },
        ]);
      }

      setSending(false);
    },
    [input, sending, messages, user]
  );

  // ── Quick action handler ──────────────────────────────────────────

  const handleQuickAction = useCallback(
    (msg: string) => {
      haptics.select();
      handleSend(msg);
    },
    [handleSend]
  );

  // ── Empty state ───────────────────────────────────────────────────

  const renderEmptyState = useCallback(() => {
    if (messages.length > 0) return null;

    const userName = user?.displayName || user?.username;

    return (
      <View style={styles.emptyContainer}>
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.emptyContent}
        >
          <Text style={styles.emptyIcon}>{'\u26A1'}</Text>
          <Text style={styles.emptyTitle}>
            Hey{userName ? ` @${userName}` : ''}!
          </Text>
          <Text style={styles.emptySubtitle}>
            Ask me about events, venues, or anything EthDenver. I can help you
            find what's happening and plan your day.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={styles.quickActions}
        >
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              style={styles.quickChip}
              onPress={() => handleQuickAction(action.msg)}
            >
              <Text style={styles.quickChipText}>{action.label}</Text>
            </Pressable>
          ))}
        </Animated.View>
      </View>
    );
  }, [messages.length, user, handleQuickAction]);

  // ── Render message item ───────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    []
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // ── Header height for the title area ──────────────────────────────

  const headerPaddingTop = insets.top + spacing.sm;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <Text style={styles.headerTitle}>FlowB</Text>
        <Text style={styles.headerSubtitle}>Your EthDenver AI assistant</Text>
      </View>

      {/* Messages */}
      <GlassCard variant="subtle" style={styles.messagesCard}>
        {messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={sending ? <TypingIndicator /> : null}
          />
        )}
      </GlassCard>

      {/* Input area */}
      <View style={[styles.inputArea, { paddingBottom: insets.bottom || spacing.md }]}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Ask FlowB anything..."
            placeholderTextColor={colors.text.tertiary}
            value={input}
            onChangeText={setInput}
            editable={!sending}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            selectionColor={colors.accent.primary}
            keyboardAppearance="dark"
            multiline={false}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!input.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
          >
            <Ionicons
              name="send"
              size={18}
              color={
                input.trim() && !sending
                  ? colors.white
                  : colors.text.tertiary
              }
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.base,
  },

  // Header
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Messages card
  messagesCard: {
    flex: 1,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: 16,
  },

  messagesList: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },

  // Bubbles
  bubbleRow: {
    marginVertical: spacing.xs,
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: colors.accent.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.background.depth2,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    ...typography.body,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: colors.white,
  },
  bubbleTextAssistant: {
    color: colors.text.primary,
  },

  // Typing indicator
  typingWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: spacing.xs,
  },
  typingContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.depth2,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.xs + 2,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyContent: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quickChip: {
    backgroundColor: colors.glass.light,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  quickChipText: {
    ...typography.caption,
    color: colors.accent.primary,
    fontWeight: '500',
  },

  // Input area
  inputArea: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    backgroundColor: colors.background.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.depth1,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 24,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.glass.light,
  },
});
