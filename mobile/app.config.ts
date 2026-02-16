import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "FlowB",
  slug: "flowb-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  scheme: "flowb",
  assetBundlePatterns: ["**/*"],
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#050510",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "me.flowb.app",
    buildNumber: "1",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "FlowB uses your location for crew check-ins and nearby events",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#050510",
    },
    package: "me.flowb.app",
    versionCode: 1,
    permissions: ["ACCESS_FINE_LOCATION", "VIBRATE"],
    edgeToEdgeEnabled: true,
  },
  plugins: [
    "expo-font",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#7c6cf0",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "FlowB uses your location for crew check-ins and nearby events",
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "7e6741c9-a856-4320-9fde-796b9e783238",
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://flowb.fly.dev",
  },
  notification: {
    icon: "./assets/icon.png",
    color: "#7c6cf0",
  },
  owner: "kohx",
});
