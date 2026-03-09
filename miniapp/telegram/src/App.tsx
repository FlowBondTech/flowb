import { useState, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";

import { BottomNav } from "./components/BottomNav";
import { DesktopLanding } from "./components/DesktopLanding";
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

/** Detect whether we are running inside the Telegram WebApp context */
function isInsideTelegram(): boolean {
  const tg = (window as any).Telegram?.WebApp;
  // initData is only populated when opened inside Telegram
  if (tg?.initData && tg.initData.length > 0) return true;
  // Also check the UA for the Telegram in-app browser
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("telegram") || ua.includes("tgweb")) return true;
  return false;
}

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
  | { name: "about" }
  | { name: "settings" };

export default function App() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Detect if we're running outside Telegram (e.g. desktop browser)
  const inTelegram = isInsideTelegram();

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

  // If opened outside Telegram (e.g. desktop browser), show a landing page
  // that directs the user to open the app in Telegram instead.
  if (!inTelegram) {
    // Forward any URL search params as a startapp deep link hint
    const urlParam = new URLSearchParams(window.location.search).get("startapp");
    const tgStart = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param;
    return <DesktopLanding startParam={urlParam || tgStart || undefined} />;
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
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
      {!user && !bannerDismissed && (
        <div style={{ background: "var(--bg-elevated, #1a1a2e)", borderBottom: "1px solid var(--border, #333)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted, #999)" }}>
          <span style={{ flex: 1 }}>Sign in via Telegram to unlock the full FlowBond ecosystem — points, leaderboards, and more.</span>
          <button onClick={() => setBannerDismissed(true)} style={{ background: "none", border: "none", color: "var(--text-muted, #999)", cursor: "pointer", padding: 4, fontSize: 16, lineHeight: 1 }}>×</button>
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
      {screen.name === "settings" && <Settings onNavigate={navigate} />}

      <BottomNav current={screen.name === "feed" ? "feed" : screen.name} onNavigate={navigate} />
    </div>
  );
}
