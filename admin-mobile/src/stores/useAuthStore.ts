import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../utils/supabase';
import * as api from '../api/client';

interface AuthState {
  ready: boolean;
  token: string | null;
  user: any | null;
  isAdmin: boolean;
  error: string | null;
  loading: boolean;

  init: () => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'flowb_admin_token';

export const useAuthStore = create<AuthState>((set, get) => ({
  ready: false,
  token: null,
  user: null,
  isAdmin: false,
  error: null,
  loading: false,

  init: async () => {
    try {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (saved) {
        api.setToken(saved);
        const result = await api.verifyAdmin();
        if (result.admin) {
          set({ token: saved, user: result.user, isAdmin: true, ready: true });
          return;
        }
      }
    } catch {
      // token expired or invalid
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      api.clearAuth();
    }
    set({ ready: true });
  },

  sendOtp: async (email: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw new Error(error.message);
      set({ loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message });
    }
  },

  verifyOtp: async (email: string, code: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });
      if (error) throw new Error(error.message);
      if (!data.session?.access_token) throw new Error('No session');

      // Exchange Supabase token for FlowB JWT
      const passport = await api.authPassport(data.session.access_token, email);

      // Verify admin
      const adminCheck = await api.verifyAdmin();
      if (!adminCheck.admin) {
        api.clearAuth();
        throw new Error('Not an admin. Access denied.');
      }

      await SecureStore.setItemAsync(TOKEN_KEY, passport.token);

      set({
        token: passport.token,
        user: adminCheck.user,
        isAdmin: true,
        loading: false,
      });
    } catch (e: any) {
      api.clearAuth();
      set({ loading: false, error: e.message });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    api.clearAuth();
    await supabase.auth.signOut();
    set({ token: null, user: null, isAdmin: false, error: null });
  },
}));
