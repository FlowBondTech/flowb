import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../stores/useAuthStore";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OnboardingScreen } from "../screens/auth/OnboardingScreen";
import { TabNavigator } from "./TabNavigator";
import { EventDetailScreen } from "../screens/home/EventDetailScreen";
import { CrewDetailScreen } from "../screens/crew/CrewDetailScreen";
import { CreateCrewScreen } from "../screens/crew/CreateCrewScreen";
import { CheckinScreen } from "../screens/crew/CheckinScreen";
import { AdminDashboard } from "../screens/admin/AdminDashboard";
import { PluginManager } from "../screens/admin/PluginManager";
import { EventCurator } from "../screens/admin/EventCurator";
import { UserManager } from "../screens/admin/UserManager";
import { CastComposer } from "../screens/admin/CastComposer";
import { NotificationCenter } from "../screens/admin/NotificationCenter";
import { SettingsEditor } from "../screens/admin/SettingsEditor";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { token, isLoading, restore } = useAuthStore();

  useEffect(() => {
    restore();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050510" }}>
        <ActivityIndicator size="large" color="#7c6cf0" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: "#7c6cf0",
          background: "#050510",
          card: "#0a0a1a",
          text: "#f8f8ff",
          border: "rgba(255,255,255,0.10)",
          notification: "#7c6cf0",
        },
        fonts: {
          regular: { fontFamily: "System", fontWeight: "400" },
          medium: { fontFamily: "System", fontWeight: "500" },
          bold: { fontFamily: "System", fontWeight: "700" },
          heavy: { fontFamily: "System", fontWeight: "900" },
        },
      }}
    >
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#050510" },
          animation: "slide_from_right",
        }}
      >
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="CrewDetail" component={CrewDetailScreen} />
            <Stack.Screen
              name="CreateCrew"
              component={CreateCrewScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="Checkin"
              component={CheckinScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="PluginManager" component={PluginManager} />
            <Stack.Screen name="EventCurator" component={EventCurator} />
            <Stack.Screen name="UserManager" component={UserManager} />
            <Stack.Screen
              name="CastComposer"
              component={CastComposer}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="NotificationCenter" component={NotificationCenter} />
            <Stack.Screen name="SettingsEditor" component={SettingsEditor} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
