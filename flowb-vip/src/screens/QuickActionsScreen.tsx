import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { useNotificationFeed } from "../hooks/useNotificationFeed";
import * as api from "../api/client";
import { colors } from "../utils/constants";
import type { Notification } from "../api/types";

type ActionType = "rsvp" | "reply" | "join" | "generic";

interface ActionCard {
  id: string;
  notification: Notification;
  actionType: ActionType;
  actionLabel: string;
}

function deriveActionType(n: Notification): ActionType {
  switch (n.notification_type) {
    case "event_reminder":
    case "friend_rsvp":
      return "rsvp";
    case "crew_message":
    case "crew_checkin":
      return "reply";
    case "meeting":
      return "join";
    default:
      return "generic";
  }
}

function deriveActionLabel(type: ActionType): string {
  switch (type) {
    case "rsvp":
      return "RSVP";
    case "reply":
      return "Reply";
    case "join":
      return "Join";
    default:
      return "View";
  }
}

export function QuickActionsScreen() {
  const { notifications, isLoading, isRefreshing, refresh } =
    useNotificationFeed();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(
    new Set()
  );

  // Build action cards from recent notifications that have actionable content
  const actionCards = useMemo(() => {
    const actionable = notifications
      .filter((n) => {
        const type = n.notification_type;
        return (
          type === "event_reminder" ||
          type === "friend_rsvp" ||
          type === "crew_message" ||
          type === "crew_checkin" ||
          type === "meeting"
        );
      })
      .slice(0, 20);

    return actionable.map((n): ActionCard => {
      const actionType = deriveActionType(n);
      return {
        id: n.id,
        notification: n,
        actionType,
        actionLabel: deriveActionLabel(actionType),
      };
    });
  }, [notifications]);

  const handleRsvp = useCallback(
    async (card: ActionCard, status: "going" | "maybe") => {
      const eventId = card.notification.data?.event_id;
      if (!eventId) return;

      setSubmitting(card.id);
      try {
        await api.rsvpEvent(eventId, status);
        setCompletedActions((prev) => new Set(prev).add(card.id));
      } catch {
        // Show inline error - for now just log
      } finally {
        setSubmitting(null);
      }
    },
    []
  );

  const handleReply = useCallback(
    async (card: ActionCard) => {
      if (!replyText.trim()) return;
      const crewId = card.notification.data?.crew_id;
      if (!crewId) return;

      setSubmitting(card.id);
      try {
        await api.sendCrewMessage(crewId, replyText.trim());
        setCompletedActions((prev) => new Set(prev).add(card.id));
        setReplyingTo(null);
        setReplyText("");
      } catch {
        // Best effort
      } finally {
        setSubmitting(null);
      }
    },
    [replyText]
  );

  const renderActionButtons = (card: ActionCard) => {
    const isCompleted = completedActions.has(card.id);
    const isSubmitting = submitting === card.id;

    if (isCompleted) {
      return (
        <View style={styles.completedRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.completedText}>Done</Text>
        </View>
      );
    }

    if (isSubmitting) {
      return (
        <ActivityIndicator
          color={colors.accent}
          size="small"
          style={styles.loader}
        />
      );
    }

    switch (card.actionType) {
      case "rsvp":
        return (
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.actionButton, styles.goingButton]}
              onPress={() => handleRsvp(card, "going")}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Going</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.maybeButton]}
              onPress={() => handleRsvp(card, "maybe")}
            >
              <Ionicons name="help" size={16} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Maybe
              </Text>
            </Pressable>
          </View>
        );

      case "reply":
        if (replyingTo === card.id) {
          return (
            <View style={styles.replyContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Type a reply..."
                placeholderTextColor={colors.textTertiary}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                autoFocus
              />
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.actionButton, styles.sendButton]}
                  onPress={() => handleReply(card)}
                  disabled={!replyText.trim()}
                >
                  <Ionicons name="send" size={14} color="#fff" />
                  <Text style={styles.actionButtonText}>Send</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    setReplyingTo(null);
                    setReplyText("");
                  }}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }
        return (
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.actionButton, styles.replyButton]}
              onPress={() => setReplyingTo(card.id)}
            >
              <Ionicons name="chatbubble" size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Reply</Text>
            </Pressable>
          </View>
        );

      case "join":
        return (
          <View style={styles.buttonRow}>
            <Pressable style={[styles.actionButton, styles.joinButton]}>
              <Ionicons name="videocam" size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Join Meeting</Text>
            </Pressable>
          </View>
        );

      default:
        return null;
    }
  };

  const renderCard = useCallback(
    ({ item: card }: { item: ActionCard }) => {
      const n = card.notification;
      const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
        event_reminder: "calendar",
        friend_rsvp: "heart",
        crew_message: "chatbubble",
        crew_checkin: "people",
        meeting: "videocam",
      };
      const iconName = iconMap[n.notification_type] || "notifications";

      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name={iconName} size={18} color={colors.accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardType}>
                {card.actionLabel.toUpperCase()}
              </Text>
              <Text style={styles.cardTime}>
                {formatDistanceToNow(new Date(n.sent_at), {
                  addSuffix: true,
                })}
              </Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{n.title}</Text>
          <Text style={styles.cardBody}>{n.body}</Text>

          {renderActionButtons(card)}
        </View>
      );
    },
    [replyingTo, replyText, submitting, completedActions, handleRsvp, handleReply]
  );

  if (isLoading && actionCards.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Quick Actions</Text>
        <Text style={styles.headerSubtitle}>
          {actionCards.length} pending action{actionCards.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {actionCards.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="flash-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No actions needed</Text>
          <Text style={styles.emptyBody}>
            When you receive event invites, crew messages, or meeting requests,
            quick actions will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={actionCards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardHeaderText: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardType: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 0.8,
  },
  cardTime: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  goingButton: {
    backgroundColor: colors.success,
    flex: 1,
  },
  maybeButton: {
    backgroundColor: "#333",
    flex: 1,
  },
  replyButton: {
    backgroundColor: colors.accent,
  },
  sendButton: {
    backgroundColor: colors.accent,
  },
  cancelButton: {
    backgroundColor: "#333",
  },
  joinButton: {
    backgroundColor: colors.accent,
    flex: 1,
  },
  replyContainer: {
    gap: 8,
  },
  replyInput: {
    backgroundColor: "#252525",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: "top",
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.success,
  },
  loader: {
    paddingVertical: 10,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
