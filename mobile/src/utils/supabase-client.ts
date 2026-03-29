/**
 * Supabase client for FlowB mobile app (FlowB Passport auth).
 *
 * Uses AsyncStorage-compatible SecureStore for session persistence.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://eoajujwpdkfuicnoxetk.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg";

/** SecureStore-backed storage adapter for Supabase Auth session persistence */
const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

let client: SupabaseClient | null = null;

/** Get or create the Supabase client singleton */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: secureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Not applicable in React Native
      },
    });
  }
  return client;
}
