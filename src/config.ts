import type { FlowBConfig } from "./core/types.js";

export function loadConfig(): FlowBConfig {
  return {
    plugins: {
      danz: process.env.DANZ_SUPABASE_URL ? {
        supabaseUrl: process.env.DANZ_SUPABASE_URL,
        supabaseKey: process.env.DANZ_SUPABASE_KEY!,
      } : undefined,
      egator: process.env.EGATOR_API_URL ? {
        apiBaseUrl: process.env.EGATOR_API_URL,
      } : undefined,
      neynar: process.env.NEYNAR_API_KEY ? {
        apiKey: process.env.NEYNAR_API_KEY,
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
    },
  };
}
