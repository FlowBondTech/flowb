import { create } from "zustand";
import * as api from "../api/client";
import type { EventResult, ScheduleEntry } from "../api/types";

interface EventsState {
  events: EventResult[];
  schedule: ScheduleEntry[];
  selectedCategories: string[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  fetchEvents: (categories?: string) => Promise<void>;
  fetchSchedule: () => Promise<void>;
  setCategories: (cats: string[]) => void;
  setSearch: (q: string) => void;
  rsvp: (eventId: string, status?: "going" | "maybe") => Promise<void>;
  cancelRsvp: (eventId: string) => Promise<void>;
  checkin: (scheduleId: string) => Promise<void>;
  filteredEvents: () => EventResult[];
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  schedule: [],
  selectedCategories: [],
  searchQuery: "",
  isLoading: false,
  error: null,

  fetchEvents: async (categories?: string) => {
    set({ isLoading: true, error: null });
    try {
      const cats =
        categories || get().selectedCategories.join(",") || undefined;
      const events = await api.getEvents("Denver", 50, cats);
      set({ events, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchSchedule: async () => {
    try {
      const schedule = await api.getSchedule();
      set({ schedule });
    } catch {}
  },

  setCategories: (cats: string[]) => {
    set({ selectedCategories: cats });
  },

  setSearch: (q: string) => {
    set({ searchQuery: q });
  },

  rsvp: async (eventId: string, status: "going" | "maybe" = "going") => {
    await api.rsvpEvent(eventId, status);
    get().fetchSchedule();
  },

  cancelRsvp: async (eventId: string) => {
    await api.cancelRsvp(eventId);
    get().fetchSchedule();
  },

  checkin: async (scheduleId: string) => {
    await api.checkinScheduleEntry(scheduleId);
    get().fetchSchedule();
  },

  filteredEvents: () => {
    const { events, searchQuery } = get();
    if (!searchQuery) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.locationName?.toLowerCase().includes(q)
    );
  },
}));
