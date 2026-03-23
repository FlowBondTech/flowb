import "dotenv/config";

export interface BotConfig {
  botToken: string;
  supabaseUrl: string;
  supabaseKey: string;
  miniAppUrl: string;
  botUsername: string;
}

export function loadConfig(): BotConfig {
  const botToken = process.env.DANZNOW_TELEGRAM_BOT_TOKEN;
  const supabaseUrl = process.env.DANZ_SUPABASE_URL;
  const supabaseKey = process.env.DANZ_SUPABASE_KEY;

  if (!botToken) throw new Error("DANZNOW_TELEGRAM_BOT_TOKEN is required");
  if (!supabaseUrl) throw new Error("DANZ_SUPABASE_URL is required");
  if (!supabaseKey) throw new Error("DANZ_SUPABASE_KEY is required");

  return {
    botToken,
    supabaseUrl,
    supabaseKey,
    miniAppUrl: process.env.DANZNOW_MINIAPP_URL || "https://danz.now",
    botUsername: process.env.DANZNOW_BOT_USERNAME || "DanzNowBot",
  };
}
