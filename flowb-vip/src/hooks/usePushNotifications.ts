import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import * as api from "../api/client";
import { useAuthStore } from "../stores/useAuthStore";
import { triggerHaptic } from "./useHaptics";
import type { NotificationPriority } from "../api/types";

/**
 * Configure foreground notification behavior:
 * Show alert + play sound even when the app is in foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationsHook {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
}

export function usePushNotifications(): PushNotificationsHook {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const { token: authToken } = useAuthStore();

  useEffect(() => {
    if (!authToken) return;

    registerForPushNotifications()
      .then((token) => {
        if (token) {
          setExpoPushToken(token);
          // Register with backend
          api
            .registerPushToken(token, Platform.OS)
            .catch(() => setError("Failed to register push token with server"));
        }
      })
      .catch((err) => setError(err.message));

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((n) => {
        setNotification(n);

        // Fire haptic feedback based on priority from notification data
        const data = n.request.content.data;
        const priority = (data?.priority as NotificationPriority) || "p2";
        triggerHaptic(priority);
      });

    // Listen for notification taps (user interaction)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationTap(data);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [authToken]);

  return { expoPushToken, notification, error };
}

/**
 * Request notification permissions and get the Expo push token.
 */
async function registerForPushNotifications(): Promise<string | null> {
  // Check existing permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true,
        provideAppNotificationSettings: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Set notification channel for Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6366f1",
      bypassDnd: true,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "ad9a75a4-13fc-4b39-b7a5-6d1cd72085f0",
  });

  return tokenData.data;
}

/**
 * Handle notification tap - navigate to relevant screen based on data payload.
 */
function handleNotificationTap(data: Record<string, unknown>) {
  const type = data?.notification_type as string | undefined;

  switch (type) {
    case "event_reminder":
    case "friend_rsvp":
      // Navigate to actions tab for event-related notifications
      router.push("/(tabs)/actions");
      break;
    case "crew_message":
    case "crew_checkin":
      // Navigate to actions tab for crew-related notifications
      router.push("/(tabs)/actions");
      break;
    default:
      // Default: go to feed
      router.push("/(tabs)/feed");
      break;
  }
}
