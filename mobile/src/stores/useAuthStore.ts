import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import * as api from "../api/client";
import type { UserProfile } from "../api/types";

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  adminKey: string | null;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  adminKey: null,
  isLoading: true,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.authApp(username, password);
      await SecureStore.setItemAsync("flowb_token", res.token);
      await SecureStore.setItemAsync("flowb_user", JSON.stringify(res.user));
      if (res.adminKey) {
        await SecureStore.setItemAsync("flowb_admin_key", res.adminKey);
      }
      set({
        token: res.token,
        user: res.user,
        adminKey: res.adminKey || null,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || "Login failed", isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    api.clearAuth();
    await SecureStore.deleteItemAsync("flowb_token");
    await SecureStore.deleteItemAsync("flowb_user");
    await SecureStore.deleteItemAsync("flowb_admin_key");
    set({ token: null, user: null, adminKey: null, isLoading: false, error: null });
  },

  restore: async () => {
    try {
      const token = await SecureStore.getItemAsync("flowb_token");
      const userStr = await SecureStore.getItemAsync("flowb_user");
      const adminKey = await SecureStore.getItemAsync("flowb_admin_key");

      if (token && userStr) {
        const user = JSON.parse(userStr) as UserProfile;
        api.setToken(token);
        if (adminKey) api.setAdminKey(adminKey);
        set({ token, user, adminKey, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  isAdmin: () => {
    const { user } = get();
    return user?.role === "admin";
  },
}));
