import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { BottomNav } from "./components/BottomNav";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { Home } from "./screens/Home";
import { EventDetail } from "./screens/EventDetail";
import { Schedule } from "./screens/Schedule";
import { Crew } from "./screens/Crew";
import { Points } from "./screens/Points";
import { Chat } from "./screens/Chat";
import { About } from "./screens/About";

export type Screen =
  | { name: "home" }
  | { name: "feed" }
  | { name: "event"; id: string }
  | { name: "schedule" }
  | { name: "chat" }
  | { name: "crew"; id?: string; checkinCode?: string }
  | { name: "points" }
  | { name: "about" };

export default function App() {
  const { user, loading, error } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Parse deep link from startapp parameter
  const hasDeepLink = (() => {
    const tg = (window as any).Telegram?.WebApp;
    return !!tg?.initDataUnsafe?.start_param;
  })();

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const startParam = tg?.initDataUnsafe?.start_param;
    if (!startParam) return;

    if (startParam.startsWith("event_")) {
      setScreen({ name: "event", id: startParam.slice(6) });
    } else if (startParam.startsWith("checkin_")) {
      setScreen({ name: "crew", checkinCode: startParam.slice(8) });
    } else if (startParam.startsWith("crew_")) {
      setScreen({ name: "crew", id: startParam.slice(5) });
    } else if (startParam === "schedule") {
      setScreen({ name: "schedule" });
    } else if (startParam === "points") {
      setScreen({ name: "points" });
    } else if (startParam === "chat") {
      setScreen({ name: "chat" });
    }
  }, []);

  // Show onboarding after auth if not completed and no deep link
  useEffect(() => {
    if (!user || hasDeepLink) return;
    try {
      if (!localStorage.getItem("flowb_onboarded")) {
        setShowOnboarding(true);
      }
    } catch {}
  }, [user, hasDeepLink]);

  // Set up Telegram back button
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton) return;

    if (screen.name === "home" || screen.name === "feed") {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
      const handler = () => {
        if (screen.name === "event") setScreen({ name: "home" });
        else setScreen({ name: "home" });
      };
      tg.BackButton.onClick(handler);
      return () => tg.BackButton.offClick(handler);
    }
  }, [screen]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !user) {
    const isNotTelegram = error === "Not in Telegram" || !(window as any).Telegram?.WebApp?.initData;
    if (isNotTelegram) {
      return (
        <div className="web-landing">
          <div className="web-landing-content">
            <div className="web-landing-logo">
              <img src="/icon.png" alt="FlowB" width={80} height={80} style={{ borderRadius: 20 }} />
            </div>
            <h1 className="web-landing-title gradient-text">FlowB</h1>
            <p className="web-landing-subtitle">
              Coordinate your crew, discover events, and earn points at EthDenver.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
              Open in the Telegram app on your phone
            </p>
            <div className="web-landing-buttons">
              <a href="https://t.me/Flow_b_bot?startapp=home" className="btn btn-primary web-landing-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ width: 20, height: 20, marginRight: 8 }}>
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Open in Telegram
              </a>
              <a href="https://flowb.me" className="btn btn-secondary web-landing-btn">
                Visit flowb.me
              </a>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="screen">
        <div className="error-box">
          {error || "Something went wrong. Try reopening the app."}
        </div>
      </div>
    );
  }

  const navigate = (s: Screen) => {
    setScreen(s);
    // Haptic feedback
    const tg = (window as any).Telegram?.WebApp;
    tg?.HapticFeedback?.selectionChanged();
  };

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={() => setShowOnboarding(false)}
        onNavigateCrew={(action) => {
          setShowOnboarding(false);
          setScreen({ name: "crew" });
        }}
      />
    );
  }

  return (
    <div className="app">
      {(screen.name === "home" || screen.name === "feed") && <Home onNavigate={navigate} initialTab={screen.name === "feed" ? "feed" : "discover"} />}
      {screen.name === "event" && <EventDetail eventId={screen.id} onNavigate={navigate} />}
      {screen.name === "schedule" && <Schedule onNavigate={navigate} />}
      {screen.name === "chat" && <Chat onNavigate={navigate} />}
      {screen.name === "crew" && <Crew crewId={screen.id} checkinCode={screen.checkinCode} onNavigate={navigate} />}
      {screen.name === "points" && <Points onNavigate={navigate} />}
      {screen.name === "about" && <About onNavigate={navigate} />}

      <BottomNav current={screen.name === "feed" ? "feed" : screen.name} onNavigate={navigate} />
    </div>
  );
}
