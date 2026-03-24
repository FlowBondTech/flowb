import { create } from 'zustand';
import * as api from '../api/client';
import type { AdminStats, HealthStatus } from '../api/types';

interface AdminState {
  stats: AdminStats | null;
  health: HealthStatus | null;
  statsLoading: boolean;
  healthLoading: boolean;

  fetchStats: () => Promise<void>;
  fetchHealth: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: null,
  health: null,
  statsLoading: false,
  healthLoading: false,

  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const stats = await api.getAdminStats();
      set({ stats, statsLoading: false });
    } catch {
      set({ statsLoading: false });
    }
  },

  fetchHealth: async () => {
    set({ healthLoading: true });
    try {
      const health = await api.getHealth();
      set({ health, healthLoading: false });
    } catch {
      set({ healthLoading: false });
    }
  },
}));
