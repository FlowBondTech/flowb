import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useSettingsStore } from "../src/stores/useSettingsStore";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { colors } from "../src/utils/constants";

export default function RootLayout() {
  const { isLoading, restore } = useAuthStore();
  const { restore: restoreSettings } = useSettingsStore();

  // Restore persisted session + settings on app launch
  useEffect(() => {
    restore();
    restoreSettings();
  }, []);

  // Initialize push notifications (registers after auth is restored)
  usePushNotifications();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="onboarding"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
});
