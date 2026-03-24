import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isToday, isYesterday } from "date-fns";
import { useNotificationFeed } from "../hooks/useNotificationFeed";
import { useConnectivity } from "../hooks/useConnectivity";
import { useSettingsStore } from "../stores/useSettingsStore";
import { NotificationItem } from "../components/NotificationItem";
import { colors } from "../utils/constants";
import type { Notification, NotificationPriority } from "../api/types";
import type { NotificationCategoryId } from "../utils/constants";

// ── Priority filter chip definitions ────────────────────────────────────

interface PriorityChip {
  label: string;
  value: NotificationPriority;
}

const PRIORITY_CHIPS: PriorityChip[] = [
  { label: "All", value: "p2" },
  { label: "Important", value: "p1" },
  { label: "Critical", value: "p0" },
];

// ── Helpers ─────────────────────────────────────────────────────────────

interface Section {
  title: string;
  data: Notification[];
}

/** Returns priority weight for comparison (lower = more critical) */
function priorityWeight(p: NotificationPriority): number {
  switch (p) {
    case "p0":
      return 0;
    case "p1":
      return 1;
    case "p2":
      return 2;
    default:
      return 3;
  }
}

function shouldShowPriority(
  notifPriority: NotificationPriority,
  minPriority: NotificationPriority
): boolean {
  return priorityWeight(notifPriority) <= priorityWeight(minPriority);
}

function groupByDate(notifications: Notification[]): Section[] {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const n of notifications) {
    const d = new Date(n.sent_at);
    if (isToday(d)) {
      today.push(n);
    } else if (isYesterday(d)) {
      yesterday.push(n);
    } else {
      earlier.push(n);
    }
  }

  const sections: Section[] = [];
  if (today.length > 0) sections.push({ title: "Today", data: today });
  if (yesterday.length > 0)
    sections.push({ title: "Yesterday", data: yesterday });
  if (earlier.length > 0) sections.push({ title: "Earlier", data: earlier });

  return sections;
}

// ── Screen Component ────────────────────────────────────────────────────

export function NotificationFeedScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    error,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  } = useNotificationFeed();

  const { isOnline } = useConnectivity();
  const { categories, minPriority, setMinPriority } = useSettingsStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter notifications based on settings
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      // Category filter
      const catEnabled =
        categories[n.notification_type as NotificationCategoryId];
      if (catEnabled === false) return false;

      // Priority filter
      if (!shouldShowPriority(n.priority, minPriority)) return false;

      return true;
    });
  }, [notifications, categories, minPriority]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);

  // Flatten sections into a single list with section headers
  const flatData = useMemo(() => {
    const result: Array<
      | { type: "header"; title: string; key: string }
      | { type: "item"; notification: Notification; key: string }
    > = [];
    for (const section of sections) {
      result.push({
        type: "header",
        title: section.title,
        key: `header-${section.title}`,
      });
      for (const n of section.data) {
        result.push({ type: "item", notification: n, key: n.id });
      }
    }
    return result;
  }, [sections]);

  const handlePress = useCallback(
    (n: Notification) => {
      setExpandedId((prev) => (prev === n.id ? null : n.id));
      if (!n.read_at) {
        markRead([n.id]);
      }
    },
    [markRead]
  );

  const handleSwipeRead = useCallback(
    (n: Notification) => {
      if (!n.read_at) {
        markRead([n.id]);
      }
    },
    [markRead]
  );

  const renderItem = useCallback(
    ({
      item,
    }: {
      item:
        | { type: "header"; title: string; key: string }
        | { type: "item"; notification: Notification; key: string };
    }) => {
      if (item.type === "header") {
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
          </View>
        );
      }

      return (
        <NotificationItem
          notification={item.notification}
          onPress={handlePress}
          onSwipeRead={handleSwipeRead}
        />
      );
    },
    [handlePress, handleSwipeRead]
  );

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="cloud-offline-outline"
          size={48}
          color={colors.textTertiary}
        />
        <Text style={styles.emptyTitle}>Connection Error</Text>
        <Text style={styles.emptyBody}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons
            name="cloud-offline-outline"
            size={14}
            color="#78350f"
          />
          <Text style={styles.offlineBannerText}>
            Offline - actions queued
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable style={styles.markAllButton} onPress={markAllRead}>
            <Ionicons name="checkmark-done" size={18} color={colors.accent} />
            <Text style={styles.markAllText}>Mark All Read</Text>
          </Pressable>
        )}
      </View>

      {/* Priority filter chips */}
      <View style={styles.chipRow}>
        {PRIORITY_CHIPS.map((chip) => {
          const isActive = minPriority === chip.value;
          return (
            <Pressable
              key={chip.value}
              style={[
                styles.chip,
                isActive ? styles.chipActive : styles.chipInactive,
              ]}
              onPress={() => setMinPriority(chip.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  isActive ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      {flatData.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name="notifications-off-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptyBody}>
            No notifications to show right now
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: "#f59e0b",
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#78350f",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
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
    color: colors.accent,
    fontWeight: "500",
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.accent,
  },
  chipRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipInactive: {
    backgroundColor: colors.card,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  chipTextInactive: {
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.bg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: colors.bg,
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
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});
