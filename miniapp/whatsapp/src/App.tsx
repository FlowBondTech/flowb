import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { Home } from "./screens/Home";
import { EventDetail } from "./screens/EventDetail";
import { Schedule } from "./screens/Schedule";
import { Crew } from "./screens/Crew";
import { Points } from "./screens/Points";
import { Settings } from "./screens/Settings";
import { BottomNav } from "./components/BottomNav";

export type Screen =
  | { name: "home" }
  | { name: "event"; id: string }
  | { name: "schedule" }
  | { name: "crew"; id?: string }
  | { name: "points" }
  | { name: "settings" };

export default function App() {
  const { user, loading, error } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  // Parse event deep link from URL if present
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");
    if (eventId) setScreen({ name: "event", id: eventId });
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="screen" style={{ padding: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>FlowB</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
          {error === "Missing auth params"
            ? "Open this link from the FlowB WhatsApp bot to get started."
            : error || "Something went wrong. Try reopening from WhatsApp."}
        </p>
        <a
          href="https://flowb.me"
          style={{
            display: "inline-block",
            background: "var(--accent)",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Visit flowb.me
        </a>
      </div>
    );
  }

  const navigate = (s: Screen) => setScreen(s);

  return (
    <div className="app">
      {screen.name === "home" && <Home onNavigate={navigate} />}
      {screen.name === "event" && <EventDetail eventId={screen.id} onNavigate={navigate} />}
      {screen.name === "schedule" && <Schedule onNavigate={navigate} />}
      {screen.name === "crew" && <Crew crewId={screen.id} onNavigate={navigate} />}
      {screen.name === "points" && <Points onNavigate={navigate} />}
      {screen.name === "settings" && <Settings onNavigate={navigate} />}

      <BottomNav current={screen.name} onNavigate={navigate} />
    </div>
  );
}
