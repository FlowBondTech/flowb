import Constants from "expo-constants";

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "https://flowb.fly.dev";

export const DEEP_LINK_SCHEME = "flowb";

export const REQUEST_TIMEOUT = 15000;

export const CIRCLES = [
  { id: "defi", label: "DeFi", emoji: "💰" },
  { id: "ai", label: "AI & Agents", emoji: "🤖" },
  { id: "infra", label: "Infrastructure", emoji: "🔧" },
  { id: "build", label: "Builder", emoji: "🛠" },
  { id: "social", label: "Social", emoji: "👥" },
  { id: "wellness", label: "Wellness", emoji: "🧘" },
  { id: "party", label: "Parties", emoji: "🎉" },
  { id: "talks", label: "Talks", emoji: "🎤" },
] as const;

export type CircleId = (typeof CIRCLES)[number]["id"];
