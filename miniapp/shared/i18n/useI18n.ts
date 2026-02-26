import { useState, useCallback } from "react";
import {
  t as translate,
  setLocale,
  getLocale,
  detectLocale as detect,
  isRtl as checkRtl,
  SUPPORTED_LOCALES,
} from "./index";

const LOCALE_STORAGE_KEY = "flowb_locale";

/**
 * React hook that wraps the core i18n module.
 *
 * Provides a reactive `t` function — calling `changeLocale` triggers a
 * re-render so all translated strings update in place.
 *
 * Usage:
 * ```tsx
 * const { t, locale, changeLocale, isRtl, locales } = useI18n();
 * return <h1>{t("onboarding.welcome_title")}</h1>;
 * ```
 */
export function useI18n() {
  const [locale, setLocaleState] = useState<string>(getLocale);

  /**
   * Change the active locale, persist to localStorage, and trigger
   * a re-render so all `t()` calls pick up the new language.
   */
  const changeLocale = useCallback((code: string) => {
    setLocale(code);
    const resolved = getLocale(); // may differ if code was unsupported

    // Persist preference
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, resolved);
    } catch {
      // localStorage unavailable
    }

    // Trigger re-render
    setLocaleState(resolved);
  }, []);

  /**
   * Run locale detection and apply the result.
   * Returns the detected locale code.
   */
  const detectLocale = useCallback((): string => {
    const detected = detect();
    setLocale(detected);
    setLocaleState(detected);
    return detected;
  }, []);

  /**
   * Translate helper — identical signature to the core `t()` but captured
   * here so it participates in the React dependency graph via `locale`.
   */
  const t = useCallback(
    (key: string, params?: Record<string, string>): string => {
      // `locale` is intentionally referenced to ensure re-render triggers
      // a fresh call when it changes.
      void locale;
      return translate(key, params);
    },
    [locale],
  );

  const isRtl = useCallback((): boolean => {
    void locale;
    return checkRtl();
  }, [locale]);

  return {
    t,
    locale,
    changeLocale,
    detectLocale,
    isRtl,
    locales: SUPPORTED_LOCALES,
  } as const;
}
