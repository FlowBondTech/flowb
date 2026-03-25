import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { GlassTabBar } from "../components/glass/GlassTabBar";
import { HomeScreen } from "../screens/home/HomeScreen";
import { EventMapScreen } from "../screens/home/EventMapScreen";
import { ScheduleScreen } from "../screens/schedule/ScheduleScreen";
import { ChatScreen } from "../screens/chat/ChatScreen";
import { BizDashboardScreen } from "../screens/biz/BizDashboardScreen";
import { CrewListScreen } from "../screens/crew/CrewListScreen";
import { PointsScreen } from "../screens/points/PointsScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { colors } from "../theme/colors";
import type { TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  // Register for push notifications (must be inside NavigationContainer)
  usePushNotifications();

  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={EventMapScreen}
        options={{
          tabBarLabel: "Map",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="BizTab"
        component={BizDashboardScreen}
        options={{
          tabBarLabel: "Biz",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "briefcase" : "briefcase-outline"}
              size={22}
              color={focused ? colors.accent.primary : colors.text.tertiary}
            />
          ),
        }}
      />
      <Tab.Screen
        name="CrewTab"
        component={CrewListScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="PointsTab"
        component={PointsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
