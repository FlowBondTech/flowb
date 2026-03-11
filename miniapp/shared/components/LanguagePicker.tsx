/**
 * Shared LanguagePicker component for FlowB mini apps.
 *
 * Renders a list of supported languages with native names,
 * highlights the current locale, and provides an auto-detect option.
 *
 * Works in both Vite (Telegram) and Next.js (Farcaster) environments.
 */

import { useState } from "react";

interface SupportedLocale {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguagePickerProps {
  /** Current active locale code */
  locale: string;
  /** Array of supported locales from the i18n module */
  locales: readonly SupportedLocale[];
  /** Translation function for UI strings */
  t: (key: string) => string;
  /** Called when user picks a language */
  onChangeLocale: (code: string) => void;
  /** Called when user taps auto-detect */
  onAutoDetect: () => string;
  /** Optional: persist to the API */
  onSaveToApi?: (locale: string) => void;
}

export function LanguagePicker({
  locale,
  locales,
  t,
  onChangeLocale,
  onAutoDetect,
  onSaveToApi,
}: LanguagePickerProps) {
  const [saving, setSaving] = useState(false);

  const selectLocale = (code: string) => {
    onChangeLocale(code);
    if (onSaveToApi) {
      setSaving(true);
      onSaveToApi(code);
      // Brief visual feedback, then clear
      setTimeout(() => setSaving(false), 600);
    }
  };

  const handleAutoDetect = () => {
    const detected = onAutoDetect();
    if (onSaveToApi) {
      setSaving(true);
      onSaveToApi(detected);
      setTimeout(() => setSaving(false), 600);
    }
  };

  return (
    <div>
      {/* Auto-detect row */}
      <button
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "11px 14px",
          background: "none",
          border: "none",
          borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
        onClick={handleAutoDetect}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))",
            color: "var(--accent-light, #818cf8)",
            flexShrink: 0,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 15, height: 15 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text, #e4e4ec)",
            }}
          >
            {t("settings.language_auto")}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted, #888)" }}>
            {t("settings.language_auto_desc")}
          </div>
        </div>
      </button>

      {/* Language list */}
      {locales.map((loc, i) => {
        const isActive = loc.code === locale;
        return (
          <button
            key={loc.code}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "11px 14px",
              background: isActive
                ? "rgba(99,102,241,0.08)"
                : "none",
              border: "none",
              borderBottom:
                i < locales.length - 1
                  ? "1px solid var(--border, rgba(255,255,255,0.08))"
                  : "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            onClick={() => selectLocale(loc.code)}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: isActive
                  ? "var(--accent, #6366f1)"
                  : "var(--card-bg, rgba(255,255,255,0.04))",
                color: isActive ? "#fff" : "var(--text-muted, #888)",
                flexShrink: 0,
                textTransform: "uppercase",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {loc.code}
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive
                    ? "var(--text, #e4e4ec)"
                    : "var(--text, #e4e4ec)",
                }}
              >
                {loc.nativeName}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted, #888)" }}>
                {loc.name}
              </div>
            </div>
            {isActive && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent, #6366f1)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 18, height: 18, flexShrink: 0 }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}

      {/* Saving indicator */}
      {saving && (
        <div
          style={{
            textAlign: "center",
            padding: "8px 0",
            fontSize: 12,
            color: "var(--accent-light, #818cf8)",
            fontWeight: 500,
          }}
        >
          {t("onboarding.saving")}
        </div>
      )}
    </div>
  );
}
