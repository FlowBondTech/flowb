import type { FlowBConfig, EGatorPluginConfig } from "./core/types.js";

// ============================================================================
// Auth Mode Feature Flag
// ============================================================================

export type AuthMode = "privy" | "dual" | "supabase";

/** Current auth mode: privy (legacy), dual (both work), supabase (target) */
export function getAuthMode(): AuthMode {
  const mode = process.env.FLOWB_AUTH_MODE;
  if (mode === "privy" || mode === "dual" || mode === "supabase") return mode;
  return "dual"; // default to dual during migration
}

/** Whether Privy auth paths should be active */
export function isPrivyEnabled(): boolean {
  return getAuthMode() !== "supabase";
}

/** Whether Supabase Auth paths should be active */
export function isSupabaseAuthEnabled(): boolean {
  return getAuthMode() !== "privy";
}

export function loadConfig(): FlowBConfig {
  return {
    plugins: {
      danz: process.env.SUPABASE_URL ? {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY!,
      } : undefined,
      egator: buildEgatorConfig(),
      neynar: process.env.NEYNAR_API_KEY ? {
        apiKey: process.env.NEYNAR_API_KEY,
        agentToken: process.env.NEYNAR_AGENT_TOKEN,
      } : undefined,
      privy: process.env.PRIVY_APP_ID ? {
        appId: process.env.PRIVY_APP_ID,
        appSecret: process.env.PRIVY_APP_SECRET!,
      } : undefined,
      points: process.env.SUPABASE_URL ? {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY!,
      } : undefined,
      cdp: process.env.CDP_API_KEY_NAME ? {
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY!,
        walletSecret: process.env.CDP_WALLET_SECRET!,
        accountAddress: process.env.CDP_ACCOUNT_ADDRESS!,
      } : undefined,
      flow: process.env.SUPABASE_URL ? {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY!,
      } : undefined,
      social: process.env.POSTIZ_BASE_URL ? {
        supabaseUrl: process.env.SUPABASE_URL!,
        supabaseKey: process.env.SUPABASE_KEY!,
        postizBaseUrl: process.env.POSTIZ_BASE_URL,
        postizMasterApiKey: process.env.POSTIZ_MASTER_API_KEY!,
        encryptionKey: process.env.SOCIAL_ENCRYPTION_KEY!,
      } : undefined,
      meeting: process.env.SUPABASE_URL ? {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY!,
      } : undefined,
      agents: process.env.SUPABASE_URL ? {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY!,
      } : undefined,
    },
  };
}

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  appSecret?: string;
}

export function loadWhatsAppConfig(): WhatsAppConfig | undefined {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!accessToken || !phoneNumberId || !verifyToken) return undefined;
  return {
    accessToken,
    phoneNumberId,
    verifyToken,
    appSecret: process.env.WHATSAPP_APP_SECRET,
  };
}

export interface SignalConfig {
  apiUrl: string;
  botNumber: string;
  webhookSecret?: string;
}

export function loadSignalConfig(): SignalConfig | undefined {
  const apiUrl = process.env.SIGNAL_API_URL;
  const botNumber = process.env.SIGNAL_BOT_NUMBER;
  if (!apiUrl || !botNumber) return undefined;
  return {
    apiUrl,
    botNumber,
    webhookSecret: process.env.SIGNAL_WEBHOOK_SECRET,
  };
}

function buildEgatorConfig(): EGatorPluginConfig | undefined {
  const sources: EGatorPluginConfig["sources"] = {};
  let hasAny = false;

  if (process.env.LUMA_API_KEY) {
    sources.luma = { apiKey: process.env.LUMA_API_KEY };
    hasAny = true;
  }
  // DuckDuckGo adapter (free, replaces Tavily - no API key needed)
  // Enable with TAVILY_API_KEY (compat, ignored) or DDG_EVENTS=1
  if (process.env.TAVILY_API_KEY || process.env.DDG_EVENTS) {
    sources.tavily = { apiKey: process.env.TAVILY_API_KEY || "", enabled: true };
    hasAny = true;
  }
  if (process.env.EVENTBRITE_API_KEY) {
    sources.eventbrite = { apiKey: process.env.EVENTBRITE_API_KEY };
    hasAny = true;
  }
  if (process.env.BRAVE_API_KEY) {
    sources.brave = { apiKey: process.env.BRAVE_API_KEY };
    hasAny = true;
  }
  if (process.env.EGATOR_RA_ENABLED === "true" || process.env.EGATOR_RA === "true") {
    sources.ra = { enabled: true };
    hasAny = true;
  }
  if (process.env.EGATOR_LEMONADE_ENABLED === "true" || process.env.EGATOR_LEMONADE === "true") {
    sources.lemonade = { enabled: true };
    hasAny = true;
  }
  if (process.env.SHEEETS_SPREADSHEET_ID) {
    sources.sheeets = {
      spreadsheetId: process.env.SHEEETS_SPREADSHEET_ID,
      apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    };
    hasAny = true;
  }
  if (process.env.GOOGLE_PLACES_API_KEY) {
    sources.googlePlaces = { apiKey: process.env.GOOGLE_PLACES_API_KEY };
    hasAny = true;
  }
  if (process.env.SUPADATA_API_KEY) {
    sources.supadata = { apiKey: process.env.SUPADATA_API_KEY };
    hasAny = true;
  }
  if (process.env.SERPAPI_API_KEY) {
    sources.serpapi = { apiKey: process.env.SERPAPI_API_KEY };
    hasAny = true;
  }

  if (!hasAny) return undefined;
  return { sources };
}
