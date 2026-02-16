import { create } from "zustand";
import * as api from "../api/client";
import type { PointsInfo, LeaderboardEntry, GlobalCrewRanking } from "../api/types";

interface PointsState {
  points: PointsInfo | null;
  leaderboard: LeaderboardEntry[];
  globalLeaderboard: GlobalCrewRanking[];
  isLoading: boolean;

  fetchPoints: () => Promise<void>;
  fetchLeaderboard: (crewId: string) => Promise<void>;
  fetchGlobalLeaderboard: () => Promise<void>;
}

export const usePointsStore = create<PointsState>((set) => ({
  points: null,
  leaderboard: [],
  globalLeaderboard: [],
  isLoading: false,

  fetchPoints: async () => {
    set({ isLoading: true });
    try {
      const points = await api.getPoints();
      set({ points, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchLeaderboard: async (crewId: string) => {
    try {
      const leaderboard = await api.getCrewLeaderboard(crewId);
      set({ leaderboard });
    } catch {}
  },

  fetchGlobalLeaderboard: async () => {
    try {
      const data = await api.getGlobalLeaderboard();
      set({ globalLeaderboard: data.crews ?? [] });
    } catch {}
  },
}));
