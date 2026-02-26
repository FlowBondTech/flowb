import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { EventResult } from "../api/types";
import { getEvents } from "../api/client";
import { EventCard } from "../components/EventCard";

interface HomeProps {
  onNavigate: (s: Screen) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const [events, setEvents] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEvents("Denver", 50)
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Events</h1>
      </header>

      {loading && <div className="loading"><div className="spinner" /></div>}
      {error && <div className="error-box">{error}</div>}

      <div className="event-list">
        {events.map((evt) => (
          <EventCard
            key={evt.id}
            event={evt}
            onClick={() => onNavigate({ name: "event", id: evt.id })}
          />
        ))}
      </div>

      {!loading && !error && events.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>
          No events found. Check back later!
        </p>
      )}
    </div>
  );
}
