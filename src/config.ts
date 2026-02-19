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
    },
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
