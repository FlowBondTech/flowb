/**
 * FlowB i18n — zero-dependency translation engine
 *
 * Static imports for all locale bundles so both Vite (Telegram mini app)
 * and Next.js (Farcaster mini app) can tree-shake and bundle correctly.
 */

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import de from "./locales/de.json";
import tr from "./locales/tr.json";
import ar from "./locales/ar.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupportedLocale {
  code: string;
  name: string;
  nativeName: string;
}

type Messages = Record<string, string>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Espanol" },
  { code: "fr", name: "French", nativeName: "Francais" },
  { code: "pt", name: "Portuguese", nativeName: "Portugues" },
  { code: "zh", name: "Chinese", nativeName: "zhong wen" },
  { code: "ja", name: "Japanese", nativeName: "ri ben yu" },
  { code: "ko", name: "Korean", nativeName: "han gug eo" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "tr", name: "Turkish", nativeName: "Turkce" },
  { code: "ar", name: "Arabic", nativeName: "al earabiya" },
];

const RTL_LOCALES = new Set(["ar"]);

const LOCALE_STORAGE_KEY = "flowb_locale";

// ---------------------------------------------------------------------------
// Locale bundles (flattened on first access)
// ---------------------------------------------------------------------------

const RAW_BUNDLES: Record<string, Record<string, unknown>> = {
  en,
  es,
  fr,
  pt,
  zh,
  ja,
  ko,
  de,
  tr,
  ar,
};

/** Cache of flattened bundles so we only flatten once per locale */
const flatCache: Record<string, Messages> = {};

/**
 * Recursively flatten a nested JSON object into dot-separated keys.
 *   { common: { ok: "OK" } }  =>  { "common.ok": "OK" }
 */
function flatten(
  obj: Record<string, unknown>,
  prefix = "",
): Messages {
  const result: Messages = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(result, flatten(val as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(val ?? "");
    }
  }
  return result;
}

function getMessages(locale: string): Messages {
  if (!flatCache[locale]) {
    const raw = RAW_BUNDLES[locale] ?? RAW_BUNDLES.en;
    flatCache[locale] = flatten(raw);
  }
  return flatCache[locale];
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

let currentLocale = "en";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Translate a key with optional parameter interpolation.
 *
 * Lookup chain: current locale -> English fallback -> raw key.
 * Supports `{{param}}` placeholders:
 *   t("greeting", { name: "koH" })  // "Hello, koH!"
 */
export function t(key: string, params?: Record<string, string>): string {
  const msgs = getMessages(currentLocale);
  let value = msgs[key];

  // Fallback to English if key is missing in current locale
  if (value === undefined && currentLocale !== "en") {
    const enMsgs = getMessages("en");
    value = enMsgs[key];
  }

  // Ultimate fallback: return the raw key
  if (value === undefined) {
    return key;
  }

  // Interpolate {{param}} placeholders
  if (params) {
    for (const [param, replacement] of Object.entries(params)) {
      value = value.replace(
        new RegExp(`\\{\\{${param}\\}\\}`, "g"),
        replacement,
      );
    }
  }

  return value;
}

/**
 * Set the active locale. If the code is not supported, falls back to "en".
 */
export function setLocale(code: string): void {
  const normalized = code.toLowerCase().split("-")[0];
  currentLocale = RAW_BUNDLES[normalized] ? normalized : "en";
}

/**
 * Get the current active locale code.
 */
export function getLocale(): string {
  return currentLocale;
}

/**
 * Detect the best locale from available signals.
 *
 * Priority chain:
 *  1. localStorage  `flowb_locale`
 *  2. Telegram WebApp language
 *  3. Browser navigator.language
 *  4. "en"
 */
export function detectLocale(): string {
  // 1. Persisted preference
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && RAW_BUNDLES[stored]) {
      return stored;
    }
  } catch {
    // localStorage unavailable (SSR, sandboxed iframe, etc.)
  }

  // 2. Telegram WebApp language
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram as
      | { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } }
      | undefined;
    const tgLang = tg?.WebApp?.initDataUnsafe?.user?.language_code;
    if (tgLang) {
      const normalized = tgLang.toLowerCase().split("-")[0];
      if (RAW_BUNDLES[normalized]) {
        return normalized;
      }
    }
  } catch {
    // Not in Telegram context
  }

  // 3. Browser navigator
  try {
    const navLang =
      (typeof navigator !== "undefined" && navigator.language) || "";
    const normalized = navLang.toLowerCase().split("-")[0];
    if (normalized && RAW_BUNDLES[normalized]) {
      return normalized;
    }
  } catch {
    // navigator unavailable
  }

  // 4. Default
  return "en";
}

/**
 * Returns true when the current locale is a right-to-left language.
 */
export function isRtl(): boolean {
  return RTL_LOCALES.has(currentLocale);
}
