import { useState, useEffect, useRef } from "react";
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
import { Settings } from "./screens/Settings";
import { Agents } from "./screens/Agents";
import { SocialB } from "./screens/SocialB";
import { AddEvent } from "./screens/AddEvent";
import { Featured } from "./screens/Featured";

export type Screen =
  | { name: "home" }
  | { name: "feed" }
  | { name: "event"; id: string }
  | { name: "schedule" }
  | { name: "chat" }
  | { name: "crew"; id?: string; checkinCode?: string }
  | { name: "points" }
  | { name: "agents" }
  | { name: "socialb" }
  | { name: "addevent" }
  | { name: "featured" }
  | { name: "about" }
  | { name: "settings" };

export default function App() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [loginSkipped, setLoginSkipped] = useState(() => {
    try { return !!localStorage.getItem("flowb_login_skipped"); } catch { return false; }
  });

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
    } else if (startParam === "socialb") {
      setScreen({ name: "socialb" });
    } else if (startParam === "addevent") {
      setScreen({ name: "addevent" });
    } else if (startParam === "featured") {
      setScreen({ name: "featured" });
    }
  }, []);

  // Auto-dismiss splash after a brief moment once loading is done
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setSplashDone(true), 1200);
      return () => clearTimeout(t);
    }
  }, [loading]);

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

  // Track screen views (hooks must be before conditional returns)
  const prevScreen = useRef(screen.name);
  useEffect(() => {
    if (prevScreen.current !== screen.name) {
      prevScreen.current = screen.name;
    }
    const props: Record<string, any> = {};
    if (screen.name === "event" && "id" in screen) props.event_id = screen.id;
    if (screen.name === "crew" && "id" in screen) props.crew_id = screen.id;
    // screen tracking removed
  }, [screen]);

  // ---- Splash screen ----
  if (loading || !splashDone) {
    return (
      <div className="splash-screen">
        <div className="splash-logo">FlowB</div>
        <div className="splash-tagline">Get in the Flow and Just B</div>
        <div className="spinner" style={{ marginTop: 24 }} />
      </div>
    );
  }

  const navigate = (s: Screen) => {
    setScreen(s);
    const tg = (window as any).Telegram?.WebApp;
    tg?.HapticFeedback?.selectionChanged();
  };

  // ---- Login suggestion (shown once after splash if not logged in & not skipped) ----
  if (!user && !loginSkipped && !hasDeepLink) {
    return (
      <div className="login-suggest">
        <div className="login-suggest-content">
          <div className="splash-logo" style={{ fontSize: 32 }}>FlowB</div>
          <p className="login-suggest-text">
            Sign in to unlock the full experience — earn points, join crews, track your schedule, and more.
          </p>
          <div className="login-suggest-perks">
            <div className="login-suggest-perk">
              <span>+</span> Earn & track points across platforms
            </div>
            <div className="login-suggest-perk">
              <span>+</span> Join or create a crew
            </div>
            <div className="login-suggest-perk">
              <span>+</span> Save your schedule & favorites
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--hint)", marginTop: 8 }}>
            You're in Telegram — authentication is instant and automatic.
          </div>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 20 }}
            onClick={() => {
              // Telegram auto-auth happens via useAuth, just reload
              window.location.reload();
            }}
          >
            Sign In
          </button>
          <button
            className="btn btn-block"
            style={{ marginTop: 10, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            onClick={() => {
              try { localStorage.setItem("flowb_login_skipped", "1"); } catch {}
              try { localStorage.setItem("flowb_onboard_skipped_at", new Date().toISOString()); } catch {}
              setLoginSkipped(true);
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => {
          try { localStorage.setItem("flowb_onboard_skipped_at", new Date().toISOString()); } catch {}
          setShowOnboarding(false);
        }}
        onNavigateCrew={(action) => {
          setShowOnboarding(false);
          setScreen({ name: "crew" });
        }}
      />
    );
  }

  return (
    <div className="app">
      {!bannerDismissed && (
        <div style={{ background: "linear-gradient(90deg, #1a1a2e, #2a1a3e)", borderBottom: "1px solid #f59e0b33", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#fbbf24" }}>
          <span style={{ fontSize: 16 }}>&#x1F6A7;</span>
          <span style={{ flex: 1 }}>FlowB is being overhauled — sign-in systems and the coordination layer are changing. Some features may be temporarily unavailable.</span>
          <button onClick={() => setBannerDismissed(true)} style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", padding: 4, fontSize: 16, lineHeight: 1 }}>&times;</button>
        </div>
      )}

      {(screen.name === "home" || screen.name === "feed") && <Home onNavigate={navigate} initialTab={screen.name === "feed" ? "feed" : "discover"} />}
      {screen.name === "event" && <EventDetail eventId={screen.id} onNavigate={navigate} />}
      {screen.name === "about" && <About onNavigate={navigate} />}
      {screen.name === "schedule" && <Schedule onNavigate={navigate} />}
      {screen.name === "chat" && <Chat onNavigate={navigate} />}
      {screen.name === "crew" && <Crew crewId={screen.id} checkinCode={screen.checkinCode} onNavigate={navigate} />}
      {screen.name === "points" && <Points onNavigate={navigate} />}
      {screen.name === "agents" && <Agents onNavigate={navigate} />}
      {screen.name === "socialb" && <SocialB onNavigate={navigate} />}
      {screen.name === "addevent" && <AddEvent onNavigate={navigate} />}
      {screen.name === "featured" && <Featured onNavigate={navigate} />}
      {screen.name === "settings" && <Settings onNavigate={navigate} />}

      <BottomNav current={screen.name === "feed" ? "feed" : screen.name} onNavigate={navigate} />
    </div>
  );
}
