import { create } from "zustand";
import * as api from "../api/client";

export type MeetingType = "call" | "coffee" | "lunch" | "virtual" | "office";
export type MeetingStatus = "scheduled" | "completed" | "cancelled";

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  duration_min?: number;
  location?: string;
  meeting_type: MeetingType;
  status: MeetingStatus;
  notes?: string;
  share_code?: string;
  attendee_count?: number;
  organizer?: { id: string; name: string };
  attendees?: { id: string; name: string; rsvp_status: string }[];
  created_at: string;
}

interface MeetingsState {
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  isLoading: boolean;
  isCreating: boolean;
  actionLoading: string | null;
  error: string | null;

  fetchMeetings: (filter?: string) => Promise<void>;
  fetchMeeting: (id: string) => Promise<void>;
  createMeeting: (data: {
    title: string;
    description?: string;
    starts_at: string;
    duration_min?: number;
    location?: string;
    meeting_type?: string;
    notes?: string;
  }) => Promise<Meeting | null>;
  updateMeeting: (id: string, data: Record<string, any>) => Promise<boolean>;
  deleteMeeting: (id: string) => Promise<boolean>;
  completeMeeting: (
    id: string,
    data?: { outcome_notes?: string; action_items?: string[] },
  ) => Promise<boolean>;
  getBriefing: (id: string) => Promise<string | null>;
  getFollowUp: (id: string) => Promise<string | null>;
  inviteAttendee: (
    id: string,
    data: { user_id?: string; name?: string; email?: string },
  ) => Promise<boolean>;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],
  selectedMeeting: null,
  isLoading: false,
  isCreating: false,
  actionLoading: null,
  error: null,

  fetchMeetings: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.getMeetings(filter || "upcoming");
      set({ meetings: res.meetings, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchMeeting: async (id) => {
    set({ isLoading: true });
    try {
      const meeting = await api.getMeeting(id);
      set({ selectedMeeting: meeting, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  createMeeting: async (data) => {
    set({ isCreating: true, error: null });
    try {
      const meeting = await api.createMeeting(data);
      const { meetings } = get();
      set({ meetings: [meeting, ...meetings], isCreating: false });
      return meeting;
    } catch (e: any) {
      set({ error: e.message, isCreating: false });
      return null;
    }
  },

  updateMeeting: async (id, data) => {
    try {
      await api.updateMeeting(id, data);
      get().fetchMeeting(id);
      get().fetchMeetings();
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },

  deleteMeeting: async (id) => {
    try {
      await api.deleteMeeting(id);
      const { meetings } = get();
      set({ meetings: meetings.filter((m) => m.id !== id) });
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },

  completeMeeting: async (id, data) => {
    set({ actionLoading: "complete" });
    try {
      await api.completeMeeting(id, data);
      get().fetchMeeting(id);
      set({ actionLoading: null });
      return true;
    } catch (e: any) {
      set({ error: e.message, actionLoading: null });
      return false;
    }
  },

  getBriefing: async (id) => {
    set({ actionLoading: "briefing" });
    try {
      const res = await api.getMeetingBriefing(id);
      set({ actionLoading: null });
      return res.briefing;
    } catch (e: any) {
      set({ error: e.message, actionLoading: null });
      return null;
    }
  },

  getFollowUp: async (id) => {
    set({ actionLoading: "follow-up" });
    try {
      const res = await api.getMeetingFollowUp(id);
      set({ actionLoading: null });
      return res.follow_up;
    } catch (e: any) {
      set({ error: e.message, actionLoading: null });
      return null;
    }
  },

  inviteAttendee: async (id, data) => {
    try {
      await api.inviteMeetingAttendee(id, data);
      get().fetchMeeting(id);
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },
}));
