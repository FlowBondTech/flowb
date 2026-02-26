/**
 * WhatsApp Cloud API Type Definitions
 *
 * Based on the Meta WhatsApp Business Platform Cloud API.
 * Covers webhook payloads, message types, and interactive message schemas.
 */

// ============================================================================
// Webhook Payload Types (incoming)
// ============================================================================

export interface WebhookPayload {
  object: "whatsapp_business_account";
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: "messages";
}

export interface WebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: IncomingMessage[];
  statuses?: MessageStatus[];
}

export interface WebhookContact {
  profile: { name: string };
  wa_id: string;
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "interactive" | "button" | "image" | "location" | "reaction";
  text?: { body: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { text: string; payload: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  reaction?: { message_id: string; emoji: string };
  context?: { from: string; id: string };
}

export interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}

// ============================================================================
// Outgoing Message Types
// ============================================================================

export interface SendTextMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: { preview_url?: boolean; body: string };
}

export interface SendImageMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "image";
  image: { link: string; caption?: string };
}

export interface SendInteractiveButtonMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "button";
    header?: { type: "text"; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      buttons: Array<{
        type: "reply";
        reply: { id: string; title: string };
      }>;
    };
  };
}

export interface SendInteractiveListMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "list";
    header?: { type: "text"; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

export interface SendInteractiveCTAMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "cta_url";
    header?: { type: "text"; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      name: "cta_url";
      parameters: { display_text: string; url: string };
    };
  };
}

export interface SendTemplateMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components?: TemplateComponent[];
  };
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters?: Array<{
    type: "text" | "image" | "document";
    text?: string;
    image?: { link: string };
  }>;
  sub_type?: "url" | "quick_reply";
  index?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SendMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface APIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// ============================================================================
// Session & Bot Types
// ============================================================================

export interface WaSession {
  events: import("../core/types.js").EventResult[];
  filteredEvents: import("../core/types.js").EventResult[];
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

export type OutgoingMessage =
  | SendTextMessage
  | SendImageMessage
  | SendInteractiveButtonMessage
  | SendInteractiveListMessage
  | SendInteractiveCTAMessage
  | SendTemplateMessage;
