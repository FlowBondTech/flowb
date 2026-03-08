import { create } from "zustand";
import * as api from "../api/client";

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  stage: LeadStage;
  source?: string;
  value?: number;
  notes?: string;
  tags?: string[];
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  activity_type: string;
  description: string;
  user_id: string;
  created_at: string;
}

interface PipelineData {
  [stage: string]: Lead[];
}

interface LeadsState {
  leads: Lead[];
  pipeline: PipelineData | null;
  selectedLead: Lead | null;
  timeline: LeadActivity[];
  total: number;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  stageFilter: LeadStage | null;
  searchQuery: string;

  fetchLeads: (opts?: { stage?: string; q?: string }) => Promise<void>;
  fetchPipeline: () => Promise<void>;
  fetchLead: (id: string) => Promise<void>;
  fetchTimeline: (id: string) => Promise<void>;
  createLead: (data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
    value?: number;
    notes?: string;
    tags?: string[];
  }) => Promise<Lead | null>;
  updateLead: (id: string, data: Record<string, any>) => Promise<boolean>;
  deleteLead: (id: string) => Promise<boolean>;
  advanceStage: (id: string, currentStage: LeadStage) => Promise<boolean>;
  setStageFilter: (stage: LeadStage | null) => void;
  setSearchQuery: (q: string) => void;
  scheduleLeadMeeting: (leadId: string) => Promise<{ meeting_id: string; share_link: string } | null>;
}

const STAGE_ORDER: LeadStage[] = ["new", "contacted", "qualified", "proposal", "won"];

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  pipeline: null,
  selectedLead: null,
  timeline: [],
  total: 0,
  isLoading: false,
  isCreating: false,
  error: null,
  stageFilter: null,
  searchQuery: "",

  fetchLeads: async (opts) => {
    set({ isLoading: true, error: null });
    try {
      const { stageFilter, searchQuery } = get();
      const res = await api.getLeads({
        stage: opts?.stage || stageFilter || undefined,
        q: opts?.q || searchQuery || undefined,
        limit: 50,
      });
      set({ leads: res.leads, total: res.total, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchPipeline: async () => {
    try {
      const res = await api.getLeadPipeline();
      set({ pipeline: res.pipeline });
    } catch (err: any) {
      console.warn("Pipeline fetch failed:", err.message);
    }
  },

  fetchLead: async (id) => {
    set({ isLoading: true });
    try {
      const lead = await api.getLead(id);
      set({ selectedLead: lead, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchTimeline: async (id) => {
    try {
      const res = await api.getLeadTimeline(id);
      set({ timeline: res.activities || [] });
    } catch {
      set({ timeline: [] });
    }
  },

  createLead: async (data) => {
    set({ isCreating: true, error: null });
    try {
      const lead = await api.createLead(data);
      const { leads } = get();
      set({ leads: [lead, ...leads], isCreating: false });
      return lead;
    } catch (err: any) {
      set({ error: err.message, isCreating: false });
      return null;
    }
  },

  updateLead: async (id, data) => {
    try {
      await api.updateLead(id, data);
      get().fetchLead(id);
      get().fetchLeads();
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  deleteLead: async (id) => {
    try {
      await api.deleteLead(id);
      const { leads } = get();
      set({ leads: leads.filter((l) => l.id !== id) });
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  advanceStage: async (id, currentStage) => {
    const idx = STAGE_ORDER.indexOf(currentStage);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return false;
    const nextStage = STAGE_ORDER[idx + 1];
    return get().updateLead(id, { stage: nextStage });
  },

  setStageFilter: (stage) => {
    set({ stageFilter: stage });
    get().fetchLeads();
  },

  setSearchQuery: (q) => {
    set({ searchQuery: q });
  },

  scheduleLeadMeeting: async (leadId) => {
    try {
      const res = await api.scheduleLeadMeeting(leadId);
      return res;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },
}));
