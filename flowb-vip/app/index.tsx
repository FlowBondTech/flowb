import { useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useSettingsStore } from "../src/stores/useSettingsStore";

/**
 * Root redirect: if not authenticated or onboarding not complete,
 * go to onboarding. Otherwise, go to the feed tab.
 */
export default function Index() {
  const { token } = useAuthStore();
  const { onboardingComplete } = useSettingsStore();

  useEffect(() => {
    if (!token || !onboardingComplete) {
      router.replace("/onboarding");
    } else {
      router.replace("/(tabs)/feed");
    }
  }, [token, onboardingComplete]);

  return null;
}
