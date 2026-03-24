import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "FlowB Admin",
  slug: "flowb-admin",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  // newArchEnabled: true,
  scheme: "flowb-admin",
  assetBundlePatterns: ["**/*"],
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#050510",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "me.flowb.admin",
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#050510",
    },
    package: "me.flowb.admin",
    versionCode: 1,
    // edgeToEdgeEnabled: true,
  },
  plugins: ["expo-secure-store"],
  extra: {
    eas: {
      projectId: "flowb-admin",
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://flowb.fly.dev",
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      "https://eoajujwpdkfuicnoxetk.supabase.co",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
  },
  owner: "kohx",
});
