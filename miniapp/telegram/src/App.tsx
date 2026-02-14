import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { BottomNav } from "./components/BottomNav";
import { Home } from "./screens/Home";
import { EventDetail } from "./screens/EventDetail";
import { Schedule } from "./screens/Schedule";
import { Crew } from "./screens/Crew";
import { Points } from "./screens/Points";

export type Screen =
  | { name: "home" }
  | { name: "event"; id: string }
  | { name: "schedule" }
  | { name: "crew"; id?: string }
  | { name: "points" };

export default function App() {
  const { user, loading, error } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  // Parse deep link from startapp parameter
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const startParam = tg?.initDataUnsafe?.start_param;
    if (!startParam) return;

    if (startParam.startsWith("event_")) {
      setScreen({ name: "event", id: startParam.slice(6) });
    } else if (startParam.startsWith("crew_")) {
      setScreen({ name: "crew", id: startParam.slice(5) });
    } else if (startParam === "schedule") {
      setScreen({ name: "schedule" });
    } else if (startParam === "points") {
      setScreen({ name: "points" });
    }
  }, []);

  // Set up Telegram back button
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton) return;

    if (screen.name === "home") {
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
    return (
      <div className="screen">
        <div className="error-box">
          {error || "Open this app from Telegram to get started."}
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

  return (
    <div className="app">
      {screen.name === "home" && <Home onNavigate={navigate} />}
      {screen.name === "event" && <EventDetail eventId={screen.id} onNavigate={navigate} />}
      {screen.name === "schedule" && <Schedule onNavigate={navigate} />}
      {screen.name === "crew" && <Crew crewId={screen.id} onNavigate={navigate} />}
      {screen.name === "points" && <Points onNavigate={navigate} />}

      <BottomNav current={screen.name} onNavigate={navigate} />
    </div>
  );
}
