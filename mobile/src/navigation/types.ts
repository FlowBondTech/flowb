import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  EventDetail: { eventId: string };
  CrewDetail: { crewId: string; crewName: string; crewEmoji: string };
  CreateCrew: undefined;
  Checkin: { crewId: string; crewName: string };
  Preferences: undefined;
  Friends: undefined;
  AdminDashboard: undefined;
  PluginManager: undefined;
  EventCurator: undefined;
  UserManager: undefined;
  CastComposer: undefined;
  NotificationCenter: undefined;
  SettingsEditor: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  ScheduleTab: undefined;
  CrewTab: undefined;
  PointsTab: undefined;
  ProfileTab: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
export type TabScreenProps<T extends keyof TabParamList> =
  BottomTabScreenProps<TabParamList, T>;
