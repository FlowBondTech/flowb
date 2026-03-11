import type { Screen } from "../App";

interface SettingsProps {
  onNavigate: (s: Screen) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Settings</h1>
      </header>

      <div style={{ padding: 16 }}>
        <div className="settings-section">
          <h3>Account</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Signed in via WhatsApp. Connect your Telegram or Farcaster account
            to sync your FlowB across platforms.
          </p>
        </div>

        <div className="settings-section" style={{ marginTop: 24 }}>
          <h3>About FlowB</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
            Discover events, earn points, and connect with your crew.
          </p>
          <a
            href="https://flowb.me"
            target="_blank"
            rel="noopener"
            style={{ color: "var(--accent)", fontSize: 13 }}
          >
            flowb.me
          </a>
        </div>
      </div>
    </div>
  );
}
