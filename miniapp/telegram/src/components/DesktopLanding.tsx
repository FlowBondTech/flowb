/**
 * DesktopLanding – shown when tg.flowb.me is opened outside the Telegram app
 * (e.g. on a desktop browser). Offers a direct link to open Telegram and
 * a fallback link to the main web app.
 */

const TG_BOT_LINK = "https://t.me/Flow_b_bot/flowb";

export function DesktopLanding({ startParam }: { startParam?: string }) {
  const tgLink = startParam
    ? `${TG_BOT_LINK}?startapp=${startParam}`
    : TG_BOT_LINK;

  return (
    <div className="desktop-landing">
      <div className="desktop-landing-content">
        <div className="desktop-landing-logo">
          <img src="/icon.png" alt="FlowB" width={80} height={80} style={{ borderRadius: 20 }} />
        </div>

        <h1 className="desktop-landing-title">FlowB</h1>
        <p className="desktop-landing-subtitle">
          Get in the Flow and Just B.<br />
          Discover events, form crews, and earn points.
        </p>

        <p className="desktop-landing-hint">
          This mini app runs inside Telegram.
          Open it there to get the full experience.
        </p>

        <div className="desktop-landing-buttons">
          <a href={tgLink} className="desktop-landing-btn desktop-landing-btn-primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8, flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Open in Telegram
          </a>

          <a href="https://flowb.me" className="desktop-landing-btn desktop-landing-btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
            Continue on Web
          </a>
        </div>
      </div>
    </div>
  );
}
