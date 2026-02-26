import type { FlowBConfig, EGatorPluginConfig } from "./core/types.js";

export function loadConfig(): FlowBConfig {
  return {
    plugins: {
      danz: process.env.DANZ_SUPABASE_URL ? {
        supabaseUrl: process.env.DANZ_SUPABASE_URL,
        supabaseKey: process.env.DANZ_SUPABASE_KEY!,
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
      points: process.env.DANZ_SUPABASE_URL ? {
        supabaseUrl: process.env.DANZ_SUPABASE_URL,
        supabaseKey: process.env.DANZ_SUPABASE_KEY!,
      } : undefined,
      cdp: process.env.CDP_API_KEY_NAME ? {
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY!,
        walletSecret: process.env.CDP_WALLET_SECRET!,
        accountAddress: process.env.CDP_ACCOUNT_ADDRESS!,
      } : undefined,
      flow: process.env.DANZ_SUPABASE_URL ? {
        supabaseUrl: process.env.DANZ_SUPABASE_URL,
        supabaseKey: process.env.DANZ_SUPABASE_KEY!,
      } : undefined,
      social: process.env.POSTIZ_BASE_URL ? {
        supabaseUrl: process.env.DANZ_SUPABASE_URL!,
        supabaseKey: process.env.DANZ_SUPABASE_KEY!,
        postizBaseUrl: process.env.POSTIZ_BASE_URL,
        postizMasterApiKey: process.env.POSTIZ_MASTER_API_KEY!,
        encryptionKey: process.env.SOCIAL_ENCRYPTION_KEY!,
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
  // Luma-only: all event discovery and management via Luma
  if (!process.env.LUMA_API_KEY) return undefined;

  return {
    sources: {
      luma: { apiKey: process.env.LUMA_API_KEY },
    },
  };
}
