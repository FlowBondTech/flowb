import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// ── Tab param lists ──────────────────────────────────────────────────
export type DashboardStackParams = {
  Dashboard: undefined;
  Health: undefined;
  Plugins: undefined;
};

export type ContentStackParams = {
  Events: undefined;
  Festivals: undefined;
  Booths: undefined;
  Venues: undefined;
  EGator: undefined;
};

export type PeopleStackParams = {
  Users: undefined;
  Crews: undefined;
  Admins: undefined;
  Points: undefined;
};

export type ToolsStackParams = {
  Notifications: undefined;
  Chat: undefined;
  Support: undefined;
  SupportDetail: { ticketId: string };
  Settings: undefined;
};

// ── Main tabs ────────────────────────────────────────────────────────
export type MainTabParams = {
  DashboardTab: NavigatorScreenParams<DashboardStackParams>;
  ContentTab: NavigatorScreenParams<ContentStackParams>;
  PeopleTab: NavigatorScreenParams<PeopleStackParams>;
  ToolsTab: NavigatorScreenParams<ToolsStackParams>;
};

// ── Root ─────────────────────────────────────────────────────────────
export type RootStackParams = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParams>;
};

// ── Screen props helpers ─────────────────────────────────────────────
export type RootScreenProps<T extends keyof RootStackParams> = NativeStackScreenProps<
  RootStackParams,
  T
>;
