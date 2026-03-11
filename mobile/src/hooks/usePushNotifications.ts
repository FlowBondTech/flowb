/**
 * usePushNotifications
 *
 * Handles Expo push notification setup:
 *   - Request permissions
 *   - Get Expo push token and register with backend
 *   - Listen for incoming notifications and taps
 *   - Navigate on notification tap via deep link data
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import * as api from "../api/client";
import type { RootStackParamList } from "../navigation/types";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowInForeground: true,
  }),
});

type Nav = NavigationProp<RootStackParamList>;

export function usePushNotifications() {
  const navigation = useNavigation<Nav>();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Register for push notifications
    registerForPush().catch(console.warn);

    // Listener for notifications received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        // Notification received in foreground — handler above shows it
      });

    // Listener for when user taps a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data, navigation);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [navigation]);
}

async function registerForPush() {
  // Check / request permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return;
  }

  // Get Expo push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn("[push] No EAS project ID found");
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const pushToken = tokenData.data;

  // Register with backend
  try {
    await api.registerPushToken(
      pushToken,
      Platform.OS === "ios" ? "ios" : "android",
    );
  } catch (err) {
    console.warn("[push] Failed to register token:", err);
  }

  // Android notification channel
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "FlowB",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7c6cf0",
    });
  }
}

function handleNotificationNavigation(
  data: Record<string, unknown> | undefined,
  navigation: any,
) {
  if (!data?.url) return;

  const url = String(data.url);

  // Parse deep links: flowb://meeting/123, flowb://event/abc, etc.
  const meetingMatch = url.match(/meeting\/(.+)/);
  if (meetingMatch) {
    navigation.navigate("MeetingDetail", { meetingId: meetingMatch[1] });
    return;
  }

  const eventMatch = url.match(/event\/(.+)/);
  if (eventMatch) {
    navigation.navigate("EventDetail", { eventId: eventMatch[1] });
    return;
  }

  const leadMatch = url.match(/lead\/(.+)/);
  if (leadMatch) {
    navigation.navigate("LeadDetail", { leadId: leadMatch[1] });
    return;
  }

  const crewMatch = url.match(/crew\/([^/]+)\/(.+)/);
  if (crewMatch) {
    navigation.navigate("CrewDetail", {
      crewId: crewMatch[1],
      crewName: crewMatch[2],
      crewEmoji: "",
    });
    return;
  }
}
