import { useState, useEffect } from "react";
import type { Screen } from "../App";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../../../shared/i18n/useI18n";
import { LanguagePicker } from "../../../shared/components/LanguagePicker";
import { updatePreferences } from "../api/client";

interface Props {
  onNavigate: (s: Screen) => void;
}

const FAQ_ITEMS = [
  {
    q: "What is FlowB?",
    a: "FlowB is your event discovery companion. We aggregate side events, hackathons, parties, and meetups into one place so you never miss what matters. Form crews with friends, earn points, and explore together.",
  },
  {
    q: "How do I earn points?",
    a: "RSVP to events, check in at venues with your crew, invite friends, complete daily quests, and engage with the community. Points unlock milestones and leaderboard rankings.",
  },
  {
    q: "What are crews?",
    a: "Crews are groups of friends exploring events together. Create or join a crew to coordinate schedules, check in together at events, and earn bonus crew points.",
  },
  {
    q: "Is FlowB free?",
    a: "Yes, completely free. No sign-up required to browse events. Create an account to RSVP, join crews, and earn points.",
  },
  {
    q: "How do reminders work?",
    a: "Set a reminder on any event and FlowB will notify you before it starts. Reminders are delivered right here in Telegram as a DM from the FlowB bot.",
  },
  {
    q: "Where can I use FlowB?",
    a: "FlowB is available right here in Telegram, on the web at flowb.me, as a Farcaster mini app, and soon as a native mobile app.",
  },
];

const TOGGLE_DEFAULTS = {
  notifications: true,
  reminders: true,
  crewUpdates: true,
  pointsAlerts: true,
};

export function Settings({ onNavigate }: Props) {
  const { user } = useAuth();
  const { t, locale, changeLocale, detectLocale, locales } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [toggles, setToggles] = useState(TOGGLE_DEFAULTS);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("flowb_settings");
      if (saved) setToggles({ ...TOGGLE_DEFAULTS, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const setToggle = (key: keyof typeof TOGGLE_DEFAULTS, val: boolean) => {
    const next = { ...toggles, [key]: val };
    setToggles(next);
    try { localStorage.setItem("flowb_settings", JSON.stringify(next)); } catch {}
    const tg = (window as any).Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred("light");
  };

  const openLink = (url: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const clearCache = () => {
    try {
      localStorage.removeItem("flowb_onboarded");
      localStorage.removeItem("flowb_settings");
      const tg = (window as any).Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred("success");
      tg?.showAlert?.(t("settings.cache_cleared"));
    } catch {}
  };

  const saveLocaleToApi = (code: string) => {
    updatePreferences({ locale: code }).catch(() => {});
  };

  /** Find the native name for the current locale */
  const currentLocaleName =
    locales.find((l: { code: string; nativeName: string }) => l.code === locale)?.nativeName || locale;

  return (
    <div className="screen" style={{ paddingBottom: 100 }}>
      <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
        {t("nav.settings")}
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
        {t("settings.customize")}
      </p>

      {/* User Info */}
      {user && (
        <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
            {(user.firstName || user.username || "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {user.firstName} {user.lastName || ""}
            </div>
            {user.username && (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>@{user.username}</div>
            )}
          </div>
          <div className="badge badge-accent" style={{ fontSize: 10 }}>Telegram</div>
        </div>
      )}

      {/* Account Linking CTA */}
      <div
        className="card"
        style={{
          marginBottom: 16, padding: "14px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12,
          background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))",
          border: "1px solid rgba(99,102,241,0.25)",
        }}
        onClick={() => openLink("https://flowb.me/settings?from=telegram")}
      >
        <span style={{ fontSize: 22, flexShrink: 0 }}>{"\uD83D\uDD17"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
            {t("settings.link_accounts")}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.5 }}>
            {t("settings.link_accounts_desc")}
          </div>
        </div>
        <span style={{ color: "var(--accent-light)", fontSize: 18 }}>{"\u203A"}</span>
      </div>

      {/* Language Picker */}
      <div className="section-title">{t("settings.language")}</div>
      <div className="card" style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "12px 14px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onClick={() => {
            setLangOpen(!langOpen);
            const tg = (window as any).Telegram?.WebApp;
            tg?.HapticFeedback?.selectionChanged();
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                background: "var(--accent, #6366f1)",
                color: "#fff",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              {locale}
            </span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text, #e4e4ec)" }}>
                {currentLocaleName}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {t("settings.change_language")}
              </div>
            </div>
          </div>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              width: 16,
              height: 16,
              flexShrink: 0,
              transition: "transform 0.2s",
              transform: langOpen ? "rotate(180deg)" : "rotate(0deg)",
              color: "var(--text-muted)",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {langOpen && (
          <div style={{ borderTop: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <LanguagePicker
              locale={locale}
              locales={locales}
              t={t}
              onChangeLocale={(code: string) => {
                changeLocale(code);
                const tg = (window as any).Telegram?.WebApp;
                tg?.HapticFeedback?.impactOccurred("light");
              }}
              onAutoDetect={() => {
                const detected = detectLocale();
                const tg = (window as any).Telegram?.WebApp;
                tg?.HapticFeedback?.impactOccurred("light");
                return detected;
              }}
              onSaveToApi={saveLocaleToApi}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="section-title">{t("settings.notifications")}</div>
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <ToggleRow
          label={t("settings.event_reminders")}
          desc={t("settings.event_reminders_desc")}
          value={toggles.reminders}
          onChange={(v) => setToggle("reminders", v)}
        />
        <ToggleRow
          label={t("settings.crew_updates")}
          desc={t("settings.crew_updates_desc")}
          value={toggles.crewUpdates}
          onChange={(v) => setToggle("crewUpdates", v)}
          border
        />
        <ToggleRow
          label={t("settings.points_alerts")}
          desc={t("settings.points_alerts_desc")}
          value={toggles.pointsAlerts}
          onChange={(v) => setToggle("pointsAlerts", v)}
          border
        />
        <ToggleRow
          label={t("settings.push_notifications")}
          desc={t("settings.push_notifications_desc")}
          value={toggles.notifications}
          onChange={(v) => setToggle("notifications", v)}
          border
        />
      </div>

      {/* Platforms */}
      <div className="section-title">{t("settings.platforms")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        <PlatformRow
          name={t("settings.web_app")}
          desc={t("settings.web_app_desc")}
          url="https://flowb.me"
          icon={<GlobeIcon />}
          onOpen={openLink}
        />
        <PlatformRow
          name={t("settings.telegram_app")}
          desc={t("settings.telegram_app_desc")}
          icon={<TelegramIcon />}
        />
        <PlatformRow
          name={t("settings.farcaster_app")}
          desc={t("settings.farcaster_app_desc")}
          url="https://warpcast.com/flowb"
          icon={<FarcasterIcon />}
          onOpen={openLink}
        />
        <PlatformRow
          name={t("settings.mobile_app")}
          desc={t("settings.mobile_app_desc")}
          icon={<PhoneIcon />}
        />
      </div>

      {/* Creators */}
      <div className="section-title">{t("settings.created_by")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        <button
          className="card"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", cursor: "pointer",
            border: "none", textAlign: "left", width: "100%",
          }}
          onClick={() => openLink("https://farcaster.xyz/koh")}
        >
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>K</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>@koh</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("settings.cocreator")}</div>
          </div>
          <span style={{ color: "var(--accent-light)", fontSize: 12, fontWeight: 500 }}>{t("settings.follow")}</span>
        </button>
        <button
          className="card"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", cursor: "pointer",
            border: "none", textAlign: "left", width: "100%",
          }}
          onClick={() => openLink("https://farcaster.xyz/step-by-steph")}
        >
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, background: "linear-gradient(135deg, #ec4899, #a855f7)" }}>S</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>@step-by-steph</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("settings.cocreator")}</div>
          </div>
          <span style={{ color: "var(--accent-light)", fontSize: 12, fontWeight: 500 }}>{t("settings.follow")}</span>
        </button>
      </div>

      {/* FAQ */}
      <div className="section-title">{t("settings.faq")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "12px 14px", background: "none", border: "none",
                color: "var(--text, #e4e4ec)", fontWeight: 600, fontSize: 14,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              {item.q}
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{
                  width: 16, height: 16, flexShrink: 0,
                  transition: "transform 0.2s",
                  transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                  color: "var(--text-muted)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openFaq === i && (
              <div style={{ padding: "0 14px 12px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* App Info */}
      <div className="section-title">{t("settings.app_info")}</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("common.version")}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>1.0.0</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("common.platform")}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Telegram Mini App</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("events.category")}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>FlowB</span>
        </div>
      </div>

      {/* Clear Cache */}
      <button
        className="btn btn-secondary btn-block"
        onClick={clearCache}
        style={{ marginBottom: 16, fontSize: 13 }}
      >
        {t("settings.clear_cache")}
      </button>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
          {t("settings.built_with_love")}
        </div>
      </div>
    </div>
  );
}

/* ===== Toggle Row Component ===== */
function ToggleRow({ label, desc, value, onChange, border }: {
  label: string; desc: string; value: boolean;
  onChange: (v: boolean) => void; border?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px",
        borderTop: border ? "1px solid var(--border)" : "none",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 26, borderRadius: 13, padding: 2,
          background: value ? "var(--accent)" : "var(--border)",
          border: "none", cursor: "pointer", position: "relative",
          transition: "background 0.2s", flexShrink: 0, marginLeft: 12,
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 11,
          background: "#fff", transition: "transform 0.2s",
          transform: value ? "translateX(18px)" : "translateX(0)",
        }} />
      </button>
    </div>
  );
}

/* ===== Platform Row Component ===== */
function PlatformRow({ name, desc, url, icon, onOpen }: {
  name: string; desc: string; url?: string;
  icon: React.ReactNode; onOpen?: (url: string) => void;
}) {
  return (
    <button
      className="card"
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", cursor: url ? "pointer" : "default",
        opacity: url ? 1 : 0.5, border: "none", textAlign: "left", width: "100%",
      }}
      onClick={() => url && onOpen?.(url)}
      disabled={!url}
    >
      <span style={{ color: "var(--accent-light)", flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</div>
      </div>
    </button>
  );
}

/* ===== SVG Icons ===== */
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
function FarcasterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
      <path d="M18.24 2.4H5.76C3.96 2.4 2.4 3.96 2.4 5.76v12.48c0 1.8 1.56 3.36 3.36 3.36h12.48c1.8 0 3.36-1.56 3.36-3.36V5.76c0-1.8-1.56-3.36-3.36-3.36zm-.84 14.4h-1.44l-.72-3.6-.72 3.6H13.2l-1.2-6h1.44l.6 3.6.72-3.6h1.2l.72 3.6.6-3.6h1.44l-1.32 6z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
