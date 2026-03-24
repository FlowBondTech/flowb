import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "FlowB VIP",
  slug: "flowb-vip",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  scheme: "flowbvip",
  assetBundlePatterns: ["**/*"],
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0a0a0a",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "me.flowb.alert",
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      "com.apple.developer.usernotifications.time-sensitive": true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0a0a0a",
    },
    package: "me.flowb.alert",
    versionCode: 1,
    permissions: ["VIBRATE"],
  },
  plugins: [
    "expo-font",
    "expo-secure-store",
    "expo-router",
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#6366f1",
        sounds: [],
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "ad9a75a4-13fc-4b39-b7a5-6d1cd72085f0",
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://flowb.fly.dev",
    router: {
      origin: false,
    },
  },
  notification: {
    icon: "./assets/icon.png",
    color: "#6366f1",
  },
  owner: "kohx",
});
