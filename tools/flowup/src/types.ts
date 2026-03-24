/** All interfaces for the FlowUp automation tool. */

export interface FlowUpConfig {
  /** Cities to discover events in (Partiful slug or full name) */
  cities: string[];
  /** Default RSVP status */
  defaultRsvpStatus: "going" | "maybe";
  /** Timing configuration for human-like behavior */
  timing: TimingConfig;
  /** Browser profile name for session isolation */
  profile: string;
  /** Run headless by default */
  headless: boolean;
  /** Keywords to filter events */
  keywords: string[];
  /** Default batch size for invite operations */
  inviteBatchSize: number;
}

export interface TimingConfig {
  /** Page load wait range [min, max] in ms */
  pageLoad: [number, number];
  /** Delay between actions [min, max] in ms */
  betweenActions: [number, number];
  /** Typing delay per character [min, max] in ms */
  typing: [number, number];
  /** Cooldown between RSVPs [min, max] in ms */
  rsvpCooldown: [number, number];
  /** Cooldown between invite batches [min, max] in ms */
  inviteBatchCooldown: [number, number];
  /** Scroll delay [min, max] in ms */
  scroll: [number, number];
}

export interface DiscoveredEvent {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
  city?: string;
  url: string;
  imageUrl?: string;
  hostName?: string;
  rsvpCount?: number;
  tags?: string[];
  isFree?: boolean;
}

export interface RSVPResult {
  eventId: string;
  eventTitle?: string;
  url: string;
  status: "going" | "maybe";
  success: boolean;
  error?: string;
  dryRun: boolean;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  coverImagePath?: string;
  visibility?: "public" | "private";
}

export interface CreateEventResult {
  success: boolean;
  eventUrl?: string;
  eventId?: string;
  error?: string;
  dryRun: boolean;
}

export interface Contact {
  name?: string;
  phone?: string;
  email?: string;
}

export interface InviteResult {
  eventId: string;
  totalContacts: number;
  invited: number;
  failed: number;
  errors: string[];
  dryRun: boolean;
}

export interface DiscoverOptions {
  cities?: string[];
  keywords?: string[];
  limit?: number;
  json?: boolean;
}

export interface RSVPOptions {
  status?: "going" | "maybe";
  message?: string;
  dryRun?: boolean;
}

export interface CreateOptions {
  templatePath?: string;
  title?: string;
  date?: string;
  dryRun?: boolean;
}

export interface InviteOptions {
  contactsPath?: string;
  batchSize?: number;
  dryRun?: boolean;
}

export interface AuthOptions {
  headed?: boolean;
  check?: boolean;
}
