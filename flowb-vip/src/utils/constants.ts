import Constants from "expo-constants";

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "https://flowb.fly.dev";

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://eoajujwpdkfuicnoxetk.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg";

export const REQUEST_TIMEOUT = 15_000;

export const POLL_INTERVAL = 30_000;

export const APP_ID = "me.flowb.alert";

export const DEEP_LINK_SCHEME = "flowbvip";

/** Notification category definitions for settings toggles */
export const NOTIFICATION_CATEGORIES = [
  { id: "crew_checkin", label: "Crew Check-ins", icon: "people" },
  { id: "friend_rsvp", label: "Friend RSVPs", icon: "heart" },
  { id: "event_reminder", label: "Event Reminders", icon: "calendar" },
  { id: "crew_message", label: "Crew Messages", icon: "chatbubble" },
  { id: "meeting", label: "Meetings", icon: "videocam" },
  { id: "points", label: "Points & Rewards", icon: "star" },
  { id: "system", label: "System Alerts", icon: "alert-circle" },
] as const;

export type NotificationCategoryId =
  (typeof NOTIFICATION_CATEGORIES)[number]["id"];

/** Colors */
export const colors = {
  bg: "#0a0a0a",
  card: "#1a1a1a",
  cardBorder: "#2a2a2a",
  accent: "#6366f1",
  accentDim: "#4f46e5",
  text: "#ffffff",
  textSecondary: "#a1a1aa",
  textTertiary: "#71717a",
  p0: "#ef4444",
  p1: "#f59e0b",
  p2: "#6b7280",
  success: "#22c55e",
  danger: "#ef4444",
  unreadDot: "#6366f1",
} as const;
