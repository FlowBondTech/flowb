import { create } from "zustand";
import * as api from "../api/client";
import type { PointsInfo, LeaderboardEntry } from "../api/types";

interface PointsState {
  points: PointsInfo | null;
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;

  fetchPoints: () => Promise<void>;
  fetchLeaderboard: (crewId: string) => Promise<void>;
}

export const usePointsStore = create<PointsState>((set) => ({
  points: null,
  leaderboard: [],
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
}));
