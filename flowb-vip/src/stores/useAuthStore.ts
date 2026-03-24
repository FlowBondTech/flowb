import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import * as api from "../api/client";
import { getSupabaseClient } from "../utils/supabase-client";
import type { UserProfile } from "../api/types";

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  /** Exchange FlowB JWT + user after Supabase session exchange */
  loginWithPassport: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  /** Restore persisted session on app launch */
  restore: () => Promise<void>;
}

const TOKEN_KEY = "flowbvip_token";
const USER_KEY = "flowbvip_user";

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  error: null,

  loginWithPassport: async (token: string, user: UserProfile) => {
    api.setToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ token, user, isLoading: false, error: null });
  },

  logout: async () => {
    // Unregister push token before clearing auth
    try {
      await api.unregisterPushToken();
    } catch {
      // Best-effort
    }

    // Sign out of Supabase
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Best-effort
    }

    api.clearAuth();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ token: null, user: null, isLoading: false, error: null });
  },

  restore: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);

      if (token && userStr) {
        const user = JSON.parse(userStr) as UserProfile;
        api.setToken(token);
        set({ token, user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
