/**
 * Signal Bot Type Definitions
 *
 * Based on the signal-cli-rest-api (bbernhard/signal-cli-rest-api).
 * Covers webhook payloads, message types, and session types.
 */

import type { EventResult } from "../core/types.js";

// ============================================================================
// Webhook Payload Types (incoming from signal-cli REST API)
// ============================================================================

export interface SignalWebhookPayload {
  envelope: SignalEnvelope;
  account: string;
}

export interface SignalEnvelope {
  source: string; // Phone number with + prefix
  sourceNumber: string;
  sourceName?: string;
  sourceDevice: number;
  timestamp: number;
  dataMessage?: SignalDataMessage;
  receiptMessage?: SignalReceiptMessage;
  typingMessage?: SignalTypingMessage;
}

export interface SignalDataMessage {
  timestamp: number;
  message: string | null;
  expiresInSeconds: number;
  viewOnce: boolean;
  groupInfo?: SignalGroupInfo;
  attachments?: SignalAttachment[];
  reaction?: SignalReaction;
  quote?: SignalQuote;
  mentions?: SignalMention[];
}

export interface SignalGroupInfo {
  groupId: string;
  type: "DELIVER" | "UPDATE" | "QUIT";
}

export interface SignalAttachment {
  contentType: string;
  filename?: string;
  id: string;
  size: number;
  width?: number;
  height?: number;
}

export interface SignalReaction {
  emoji: string;
  targetAuthor: string;
  targetSentTimestamp: number;
  isRemove: boolean;
}

export interface SignalQuote {
  id: number;
  author: string;
  text: string;
}

export interface SignalMention {
  start: number;
  length: number;
  uuid: string;
}

export interface SignalReceiptMessage {
  when: number;
  isDelivery: boolean;
  isRead: boolean;
  timestamps: number[];
}

export interface SignalTypingMessage {
  action: "STARTED" | "STOPPED";
  timestamp: number;
}

// ============================================================================
// Outgoing Message Types (signal-cli REST API v2)
// ============================================================================

export interface SendMessageRequest {
  message: string;
  number: string; // Bot's number
  recipients: string[]; // Recipient phone numbers
  text_mode?: "normal" | "styled";
  attachments?: string[]; // Base64 encoded attachments
}

export interface SendMessageResponse {
  timestamp: string;
}

// ============================================================================
// Session & Bot Types
// ============================================================================

export interface SignalSession {
  events: EventResult[];
  filteredEvents: EventResult[];
  cardIndex: number;
  categoryFilter: string;
  dateFilter: string;
  verified: boolean;
  displayName?: string;
  awaitingInput?: string;
  awaitingCrewName?: boolean;
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
  lastActive: number;
}
