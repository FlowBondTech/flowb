import type { User } from '../generated/graphql'

// Root Stack Navigator param list
export type RootStackParamList = {
  // Auth screens
  Login: undefined
  Onboarding: undefined

  // Main tab navigator
  TabNavigator: undefined

  // Stack screens
  EventDetails: { eventId: string; event: Event }
  EditEvent: { eventId: string }
  CreateEvent: undefined
  EditProfile: undefined
  UserProfile: { userId: string; user?: User }
  OrganizerEvents: { organizerId: string; organizerName?: string }
  UserEvents: undefined
  Challenges: undefined
  Checkin: { eventId?: string; mode?: 'scan' | 'code' }
  Leaderboard: undefined
  Gigs: undefined
  GigManager: undefined

  // Modal screens
  AccessibilitySettings: undefined
  DanceScreen: { sessionId?: string }
  Wallet: undefined
  Notifications: undefined
  NotificationSettings: undefined
}

// Tab Navigator param list
export type TabParamList = {
  Home: undefined
  Events: undefined
  Feed: undefined
  Profile: undefined
}

import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { RouteProp } from '@react-navigation/native'
// Type helpers for navigation props
import type { StackNavigationProp } from '@react-navigation/stack'
import type { Event } from '../generated/graphql'

// Stack navigation props
export type RootStackNavigationProp<T extends keyof RootStackParamList> = StackNavigationProp<
  RootStackParamList,
  T
>

export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>

// Tab navigation props
export type TabNavigationProp<T extends keyof TabParamList> = BottomTabNavigationProp<
  TabParamList,
  T
>

export type TabRouteProp<T extends keyof TabParamList> = RouteProp<TabParamList, T>

// Screen props types
export type ScreenProps<T extends keyof RootStackParamList> = {
  navigation: RootStackNavigationProp<T>
  route: RootStackRouteProp<T>
}

export type TabScreenProps<T extends keyof TabParamList> = {
  navigation: TabNavigationProp<T>
  route: TabRouteProp<T>
}
