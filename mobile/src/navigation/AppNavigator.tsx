import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../stores/useAuthStore";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { IntroCarouselScreen } from "../screens/auth/IntroCarouselScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { PrivyLoginScreen } from "../screens/auth/PrivyLoginScreen";
import { OnboardingScreen } from "../screens/auth/OnboardingScreen";
import { TabNavigator } from "./TabNavigator";
import { EventDetailScreen } from "../screens/home/EventDetailScreen";
import { CrewDetailScreen } from "../screens/crew/CrewDetailScreen";
import { CreateCrewScreen } from "../screens/crew/CreateCrewScreen";
import { CheckinScreen } from "../screens/crew/CheckinScreen";
import { CrewBizScreen } from "../screens/crew/CrewBizScreen";
import { CrewBizSettingsScreen } from "../screens/crew/CrewBizSettingsScreen";
import { AdminDashboard } from "../screens/admin/AdminDashboard";
import { PluginManager } from "../screens/admin/PluginManager";
import { EventCurator } from "../screens/admin/EventCurator";
import { UserManager } from "../screens/admin/UserManager";
import { CastComposer } from "../screens/admin/CastComposer";
import { NotificationCenter } from "../screens/admin/NotificationCenter";
import { SettingsEditor } from "../screens/admin/SettingsEditor";
import { PreferencesScreen } from "../screens/profile/PreferencesScreen";
import { FriendsScreen } from "../screens/profile/FriendsScreen";
import { AboutScreen } from "../screens/profile/AboutScreen";
import { MeetingListScreen } from "../screens/meetings/MeetingListScreen";
import { MeetingDetailScreen } from "../screens/meetings/MeetingDetailScreen";
import { CreateMeetingScreen } from "../screens/meetings/CreateMeetingScreen";
import { LeadListScreen } from "../screens/leads/LeadListScreen";
import { LeadDetailScreen } from "../screens/leads/LeadDetailScreen";
import { CreateLeadScreen } from "../screens/leads/CreateLeadScreen";
import { EditLeadScreen } from "../screens/leads/EditLeadScreen";
import { KanbanScreen } from "../screens/leads/KanbanScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const INTRO_SEEN_KEY = "flowb_intro_seen";

export function AppNavigator() {
  const { token, isLoading, restore } = useAuthStore();
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);

  // Register for push notifications when authenticated
  usePushNotifications();

  useEffect(() => {
    async function init() {
      // Check intro flag
      const seen = await SecureStore.getItemAsync(INTRO_SEEN_KEY);
      setHasSeenIntro(seen === "true");
      // Restore auth
      await restore();
      // Mark intro as seen for next launch
      if (!seen) {
        await SecureStore.setItemAsync(INTRO_SEEN_KEY, "true");
      }
    }
    init();
  }, []);

  if (isLoading || hasSeenIntro === null) {
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
          animationDuration: 250,
          gestureEnabled: true,
          gestureDirection: "horizontal",
        }}
      >
        {!token ? (
          <>
            {!hasSeenIntro && (
              <Stack.Screen
                name="IntroCarousel"
                component={IntroCarouselScreen}
                options={{ animation: "fade" }}
              />
            )}
            <Stack.Screen
              name="Login"
              component={PrivyLoginScreen}
              options={{ animation: "fade" }}
            />
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ animation: "slide_from_bottom" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={TabNavigator}
              options={{ animation: "fade" }}
            />

            {/* Push screens — slide from right */}
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="CrewDetail" component={CrewDetailScreen} />
            <Stack.Screen
              name="CrewBiz"
              component={CrewBizScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CrewBizSettings"
              component={CrewBizSettingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Preferences" component={PreferencesScreen} />
            <Stack.Screen name="Friends" component={FriendsScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="PluginManager" component={PluginManager} />
            <Stack.Screen name="EventCurator" component={EventCurator} />
            <Stack.Screen name="UserManager" component={UserManager} />
            <Stack.Screen name="NotificationCenter" component={NotificationCenter} />
            <Stack.Screen name="SettingsEditor" component={SettingsEditor} />
            <Stack.Screen
              name="MeetingList"
              component={MeetingListScreen}
              options={{
                headerShown: true,
                headerTitle: "Meetings",
                headerBackTitle: "Back",
                headerStyle: { backgroundColor: "#0a0a1a" },
                headerTintColor: "#f8f8ff",
              }}
            />
            <Stack.Screen name="MeetingDetail" component={MeetingDetailScreen} />
            <Stack.Screen
              name="LeadList"
              component={LeadListScreen}
              options={{
                headerShown: true,
                headerTitle: "Leads",
                headerBackTitle: "Back",
                headerStyle: { backgroundColor: "#0a0a1a" },
                headerTintColor: "#f8f8ff",
              }}
            />
            <Stack.Screen name="LeadDetail" component={LeadDetailScreen} />
            <Stack.Screen
              name="Kanban"
              component={KanbanScreen}
              options={{
                headerShown: true,
                headerTitle: "Pipeline",
                headerBackTitle: "Back",
                headerStyle: { backgroundColor: "#0a0a1a" },
                headerTintColor: "#f8f8ff",
              }}
            />

            {/* Modal screens — slide up with scale-behind effect */}
            <Stack.Screen
              name="CreateCrew"
              component={CreateCrewScreen}
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="Checkin"
              component={CheckinScreen}
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="CastComposer"
              component={CastComposer}
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="CreateMeeting"
              component={CreateMeetingScreen}
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="CreateLead"
              component={CreateLeadScreen}
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="EditLead"
              component={EditLeadScreen}
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
