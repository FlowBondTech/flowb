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
      trading: (process.env.CDP_API_KEY_NAME && process.env.DANZ_SUPABASE_URL) ? {
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY!,
        walletSecret: process.env.CDP_WALLET_SECRET!,
        accountAddress: process.env.CDP_ACCOUNT_ADDRESS!,
        supabaseUrl: process.env.DANZ_SUPABASE_URL,
        supabaseKey: process.env.DANZ_SUPABASE_KEY!,
      } : undefined,
      flow: process.env.DANZ_SUPABASE_URL ? {
        supabaseUrl: process.env.DANZ_SUPABASE_URL,
        supabaseKey: process.env.DANZ_SUPABASE_KEY!,
      } : undefined,
    },
  };
}

function buildEgatorConfig(): EGatorPluginConfig | undefined {
  const sources: EGatorPluginConfig["sources"] = {};
  let hasSource = false;

  if (process.env.LUMA_API_KEY) { sources.luma = { apiKey: process.env.LUMA_API_KEY }; hasSource = true; }
  if (process.env.EVENTBRITE_API_KEY) { sources.eventbrite = { apiKey: process.env.EVENTBRITE_API_KEY }; hasSource = true; }
  if (process.env.BRAVE_SEARCH_API_KEY) { sources.brave = { apiKey: process.env.BRAVE_SEARCH_API_KEY }; hasSource = true; }
  if (process.env.TAVILY_API_KEY) { sources.tavily = { apiKey: process.env.TAVILY_API_KEY }; hasSource = true; }
  if (process.env.EGATOR_MEETUP === "true") { sources.meetup = {}; hasSource = true; }
  if (process.env.EGATOR_RA === "true") { sources.ra = {}; hasSource = true; }
  if (process.env.GOOGLE_PLACES_API_KEY) { sources.googlePlaces = { apiKey: process.env.GOOGLE_PLACES_API_KEY }; hasSource = true; }

  const apiBaseUrl = process.env.EGATOR_API_URL;

  if (!hasSource && !apiBaseUrl) return undefined;

  return {
    apiBaseUrl,
    sources: hasSource ? sources : undefined,
  };
}
