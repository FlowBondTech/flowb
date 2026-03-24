import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { NotificationPriority } from "../api/types";
import type { NotificationCategoryId } from "../utils/constants";

interface SettingsState {
  /** Which notification categories are enabled (true = enabled) */
  categories: Record<NotificationCategoryId, boolean>;
  /** Minimum priority to display: p0 = critical only, p1 = important+, p2 = all */
  minPriority: NotificationPriority;
  /** Whether push notifications are enabled */
  pushEnabled: boolean;
  /** Whether onboarding has been completed */
  onboardingComplete: boolean;

  toggleCategory: (id: NotificationCategoryId) => void;
  setMinPriority: (p: NotificationPriority) => void;
  setPushEnabled: (enabled: boolean) => void;
  setOnboardingComplete: (done: boolean) => void;
  restore: () => Promise<void>;
  persist: () => Promise<void>;
}

const SETTINGS_KEY = "flowbvip_settings";

const defaultCategories: Record<NotificationCategoryId, boolean> = {
  crew_checkin: true,
  friend_rsvp: true,
  event_reminder: true,
  crew_message: true,
  meeting: true,
  points: true,
  system: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  categories: { ...defaultCategories },
  minPriority: "p2",
  pushEnabled: true,
  onboardingComplete: false,

  toggleCategory: (id: NotificationCategoryId) => {
    set((state) => ({
      categories: {
        ...state.categories,
        [id]: !state.categories[id],
      },
    }));
    get().persist();
  },

  setMinPriority: (p: NotificationPriority) => {
    set({ minPriority: p });
    get().persist();
  },

  setPushEnabled: (enabled: boolean) => {
    set({ pushEnabled: enabled });
    get().persist();
  },

  setOnboardingComplete: (done: boolean) => {
    set({ onboardingComplete: done });
    get().persist();
  },

  restore: async () => {
    try {
      const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          categories: { ...defaultCategories, ...parsed.categories },
          minPriority: parsed.minPriority || "p2",
          pushEnabled: parsed.pushEnabled ?? true,
          onboardingComplete: parsed.onboardingComplete ?? false,
        });
      }
    } catch {
      // Use defaults
    }
  },

  persist: async () => {
    try {
      const { categories, minPriority, pushEnabled, onboardingComplete } =
        get();
      await SecureStore.setItemAsync(
        SETTINGS_KEY,
        JSON.stringify({ categories, minPriority, pushEnabled, onboardingComplete })
      );
    } catch {
      // Best-effort
    }
  },
}));
