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
    },
  };
}
