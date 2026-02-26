/**
 * Leads Plugin Types
 */

export interface LeadsPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface OrgLead {
  id: string;
  org_id: string;
  submitted_by: string;
  submitted_by_name: string | null;
  name: string;
  contact: string | null;
  contact_type: string;
  company: string | null;
  notes: string | null;
  tags: string[];
  source: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface Org {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  display_name: string | null;
  role: string;
  created_at: string;
}

export const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const LEAD_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type LeadPriority = typeof LEAD_PRIORITIES[number];

export const CONTACT_TYPES = ["email", "phone", "telegram", "twitter", "other"] as const;
export type ContactType = typeof CONTACT_TYPES[number];
