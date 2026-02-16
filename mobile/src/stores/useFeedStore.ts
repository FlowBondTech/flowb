import { create } from "zustand";
import * as api from "../api/client";
import type { FeedCast } from "../api/types";

interface FeedState {
  casts: FeedCast[];
  isLoading: boolean;
  error: string | null;

  fetchFeed: (channel?: string) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set) => ({
  casts: [],
  isLoading: false,
  error: null,

  fetchFeed: async (channel = "ethdenver") => {
    set({ isLoading: true, error: null });
    try {
      const casts = await api.getFeed(channel, 15);
      set({ casts, isLoading: false });
    } catch {
      set({ isLoading: false, error: "Failed to load feed" });
    }
  },
}));
