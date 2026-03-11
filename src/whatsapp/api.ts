/**
 * WhatsApp Cloud API Client
 *
 * Wraps the Meta WhatsApp Business Platform Cloud API for sending
 * messages, marking as read, and handling media.
 */

import type {
  SendMessageResponse,
  SendTemplateMessage,
  TemplateComponent,
} from "./types.js";
import { log } from "../utils/logger.js";

const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error("WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID required");
  }
  return { accessToken, phoneNumberId };
}

async function sendRequest(phoneNumberId: string, accessToken: string, body: any): Promise<SendMessageResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      log.error("[wa-api]", `Send failed (${res.status}): ${err}`);
      return null;
    }

    return (await res.json()) as SendMessageResponse;
  } catch (err: any) {
    log.error("[wa-api]", `Send error: ${err.message}`);
    return null;
  }
}

// ============================================================================
// Public API
// ============================================================================

export async function sendText(to: string, body: string): Promise<SendMessageResponse | null> {
  const { accessToken, phoneNumberId } = getConfig();
  return sendRequest(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: true, body },
  });
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  header?: string,
  footer?: string,
): Promise<SendMessageResponse | null> {
  if (buttons.length > 3) {
    log.error("[wa-api]", `Button limit exceeded: ${buttons.length} (max 3)`);
    buttons = buttons.slice(0, 3);
  }

  const { accessToken, phoneNumberId } = getConfig();
  return sendRequest(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      ...(header ? { header: { type: "text", text: header } } : {}),
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action: {
        buttons: buttons.map((b) => ({
          type: "reply" as const,
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

export async function sendList(
  to: string,
  body: string,
  buttonText: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>,
  header?: string,
  footer?: string,
): Promise<SendMessageResponse | null> {
  const { accessToken, phoneNumberId } = getConfig();
  return sendRequest(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      ...(header ? { header: { type: "text", text: header } } : {}),
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action: {
        button: buttonText,
        sections,
      },
    },
  });
}

export async function sendCTAUrl(
  to: string,
  body: string,
  displayText: string,
  url: string,
  header?: string,
  footer?: string,
): Promise<SendMessageResponse | null> {
  const { accessToken, phoneNumberId } = getConfig();
  return sendRequest(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "cta_url",
      ...(header ? { header: { type: "text", text: header } } : {}),
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action: {
        name: "cta_url",
        parameters: { display_text: displayText, url },
      },
    },
  });
}

export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: TemplateComponent[],
): Promise<SendMessageResponse | null> {
  const { accessToken, phoneNumberId } = getConfig();
  const body: SendTemplateMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components?.length ? { components } : {}),
    },
  };
  return sendRequest(phoneNumberId, accessToken, body);
}

export async function sendImage(
  to: string,
  imageUrl: string,
  caption?: string,
): Promise<SendMessageResponse | null> {
  const { accessToken, phoneNumberId } = getConfig();
  return sendRequest(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  });
}

export async function markAsRead(messageId: string): Promise<boolean> {
  try {
    const { accessToken, phoneNumberId } = getConfig();
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
