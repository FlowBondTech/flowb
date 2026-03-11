import { create } from "zustand";
import * as api from "../api/client";
import type { CrewInfo, CrewMember, CrewCheckin, CrewMission } from "../api/types";

interface DiscoveredCrew {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  join_code: string;
  join_mode: string;
  member_count: number;
}

interface CrewState {
  crews: CrewInfo[];
  discoveredCrews: DiscoveredCrew[];
  isLoading: boolean;
  isDiscoverLoading: boolean;

  fetchCrews: () => Promise<void>;
  fetchDiscoverCrews: () => Promise<void>;
  createCrew: (name: string, emoji?: string) => Promise<void>;
  joinCrew: (code: string) => Promise<void>;
  getMembers: (crewId: string) => Promise<{ members: CrewMember[]; checkins: CrewCheckin[] }>;
  checkin: (crewId: string, venue: string, opts?: { status?: string; message?: string }) => Promise<void>;
  getMissions: (crewId: string) => Promise<CrewMission[]>;
}

export const useCrewStore = create<CrewState>((set, get) => ({
  crews: [],
  discoveredCrews: [],
  isLoading: false,
  isDiscoverLoading: false,

  fetchCrews: async () => {
    set({ isLoading: true });
    try {
      const crews = await api.getCrews();
      set({ crews, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchDiscoverCrews: async () => {
    set({ isDiscoverLoading: true });
    try {
      const discoveredCrews = await api.discoverCrews();
      set({ discoveredCrews, isDiscoverLoading: false });
    } catch {
      set({ isDiscoverLoading: false });
    }
  },

  createCrew: async (name: string, emoji?: string) => {
    await api.createCrew(name, emoji);
    get().fetchCrews();
  },

  joinCrew: async (code: string) => {
    await api.joinCrew(code);
    get().fetchCrews();
  },

  getMembers: async (crewId: string) => {
    return api.getCrewMembers(crewId);
  },

  checkin: async (crewId: string, venue: string, opts?) => {
    await api.crewCheckin(crewId, venue, opts);
  },

  getMissions: async (crewId: string) => {
    return api.getCrewMissions(crewId);
  },
}));
