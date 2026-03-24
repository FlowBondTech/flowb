import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import type {
  Notification,
  NotificationPriority,
  NotificationType,
} from "../api/types";
import { colors } from "../utils/constants";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  /** Called when user swipes left to mark as read */
  onSwipeRead?: (notification: Notification) => void;
}

/** Map notification types to Ionicons names */
const typeIcons: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  crew_checkin: "people",
  friend_rsvp: "heart",
  event_reminder: "calendar",
  crew_message: "chatbubble",
  meeting: "videocam",
  points: "star",
  system: "alert-circle",
};

/** Priority badge colors */
const priorityColors: Record<NotificationPriority, string> = {
  p0: colors.p0,
  p1: colors.p1,
  p2: colors.p2,
};

const priorityLabels: Record<NotificationPriority, string> = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
};

const SWIPE_THRESHOLD = -80;

function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function NotificationItem({
  notification,
  onPress,
  onSwipeRead,
}: NotificationItemProps) {
  const isUnread = !notification.read_at;
  const iconName = typeIcons[notification.notification_type] || "notifications";
  const badgeColor = priorityColors[notification.priority] || colors.p2;
  const badgeLabel = priorityLabels[notification.priority] || "P2";
  const translateX = useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event<PanGestureHandlerGestureEvent>(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX: tx } = event.nativeEvent;

      if (tx < SWIPE_THRESHOLD && isUnread && onSwipeRead) {
        // Swipe past threshold - animate off and trigger callback
        Animated.timing(translateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onSwipeRead(notification);
        });
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 8,
        }).start();
      }
    }
  };

  // Clamp translateX to only allow left swipe (negative values)
  const clampedTranslateX = translateX.interpolate({
    inputRange: [-200, 0],
    outputRange: [-200, 0],
    extrapolate: "clamp",
  });

  // Action background opacity fades in as user swipes
  const actionOpacity = translateX.interpolate({
    inputRange: [-120, -40, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.swipeContainer}>
      {/* Background action revealed on swipe */}
      {isUnread && (
        <Animated.View style={[styles.swipeAction, { opacity: actionOpacity }]}>
          <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
          <Text style={styles.swipeActionText}>Read</Text>
        </Animated.View>
      )}

      <PanGestureHandler
        onGestureEvent={isUnread ? onGestureEvent : undefined}
        onHandlerStateChange={isUnread ? onHandlerStateChange : undefined}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-10, 10]}
        enabled={isUnread}
      >
        <Animated.View
          style={[
            styles.animatedRow,
            { transform: [{ translateX: isUnread ? clampedTranslateX : 0 }] },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.container,
              pressed && styles.pressed,
            ]}
            onPress={() => onPress?.(notification)}
          >
            {/* Unread indicator */}
            {isUnread && <View style={styles.unreadDot} />}

            {/* Type icon */}
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconName}
                size={20}
                color={isUnread ? colors.accent : colors.textTertiary}
              />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text
                  style={[styles.title, isUnread && styles.titleUnread]}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <View
                  style={[styles.priorityBadge, { backgroundColor: badgeColor }]}
                >
                  <Text style={styles.priorityText}>{badgeLabel}</Text>
                </View>
              </View>

              <Text style={styles.body} numberOfLines={2}>
                {notification.body}
              </Text>

              <Text style={styles.time}>{timeAgo(notification.sent_at)}</Text>
            </View>
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
  },
  swipeAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: colors.accent,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  swipeActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  animatedRow: {
    backgroundColor: colors.card,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    position: "relative",
  },
  pressed: {
    backgroundColor: "#222222",
  },
  unreadDot: {
    position: "absolute",
    left: 6,
    top: 22,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.unreadDot,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#252525",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  titleUnread: {
    color: colors.text,
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 13,
    color: colors.textTertiary,
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});
