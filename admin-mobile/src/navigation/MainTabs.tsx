import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { GlassTabBar } from '../components/glass/GlassTabBar';
import { colors } from '../theme/colors';
import type {
  MainTabParams,
  DashboardStackParams,
  ContentStackParams,
  PeopleStackParams,
  ToolsStackParams,
} from './types';

// ── Screen imports ────────────────────────────────────────────────────
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { HealthScreen } from '../screens/dashboard/HealthScreen';
import { PluginsScreen } from '../screens/dashboard/PluginsScreen';
import { EventsScreen } from '../screens/content/EventsScreen';
import { FestivalsScreen } from '../screens/content/FestivalsScreen';
import { BoothsScreen } from '../screens/content/BoothsScreen';
import { VenuesScreen } from '../screens/content/VenuesScreen';
import { EGatorScreen } from '../screens/content/EGatorScreen';
import { UsersScreen } from '../screens/people/UsersScreen';
import { CrewsScreen } from '../screens/people/CrewsScreen';
import { AdminsScreen } from '../screens/people/AdminsScreen';
import { PointsScreen } from '../screens/people/PointsScreen';
import { NotificationsScreen } from '../screens/tools/NotificationsScreen';
import { ChatScreen } from '../screens/tools/ChatScreen';
import { SupportScreen } from '../screens/tools/SupportScreen';
import { SupportDetailScreen } from '../screens/tools/SupportDetailScreen';
import { SettingsScreen } from '../screens/tools/SettingsScreen';

// ── Tab icon helper ──────────────────────────────────────────────────
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    DashboardTab: '\u2302', // house
    ContentTab: '\u2606',   // star
    PeopleTab: '\u263A',    // smiley
    ToolsTab: '\u2699',     // gear
  };
  return (
    <Text style={{ fontSize: 20, color: focused ? colors.accent.primary : colors.text.tertiary }}>
      {icons[label] || '?'}
    </Text>
  );
}

// ── Stack navigators for each tab ────────────────────────────────────

const DashStack = createNativeStackNavigator<DashboardStackParams>();
function DashboardStack() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="Dashboard" component={DashboardScreen} />
      <DashStack.Screen name="Health" component={HealthScreen} />
      <DashStack.Screen name="Plugins" component={PluginsScreen} />
    </DashStack.Navigator>
  );
}

const ContStack = createNativeStackNavigator<ContentStackParams>();
function ContentStack() {
  return (
    <ContStack.Navigator screenOptions={{ headerShown: false }}>
      <ContStack.Screen name="Events" component={EventsScreen} />
      <ContStack.Screen name="Festivals" component={FestivalsScreen} />
      <ContStack.Screen name="Booths" component={BoothsScreen} />
      <ContStack.Screen name="Venues" component={VenuesScreen} />
      <ContStack.Screen name="EGator" component={EGatorScreen} />
    </ContStack.Navigator>
  );
}

const PplStack = createNativeStackNavigator<PeopleStackParams>();
function PeopleStack() {
  return (
    <PplStack.Navigator screenOptions={{ headerShown: false }}>
      <PplStack.Screen name="Users" component={UsersScreen} />
      <PplStack.Screen name="Crews" component={CrewsScreen} />
      <PplStack.Screen name="Admins" component={AdminsScreen} />
      <PplStack.Screen name="Points" component={PointsScreen} />
    </PplStack.Navigator>
  );
}

const ToolStack = createNativeStackNavigator<ToolsStackParams>();
function ToolsStack() {
  return (
    <ToolStack.Navigator screenOptions={{ headerShown: false }}>
      <ToolStack.Screen name="Notifications" component={NotificationsScreen} />
      <ToolStack.Screen name="Chat" component={ChatScreen} />
      <ToolStack.Screen name="Support" component={SupportScreen} />
      <ToolStack.Screen name="SupportDetail" component={SupportDetailScreen} />
      <ToolStack.Screen name="Settings" component={SettingsScreen} />
    </ToolStack.Navigator>
  );
}

// ── Main tab navigator ───────────────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabParams>();

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="DashboardTab" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ContentTab"
        component={ContentStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="ContentTab" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="PeopleTab"
        component={PeopleStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="PeopleTab" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ToolsTab"
        component={ToolsStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="ToolsTab" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
