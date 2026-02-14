import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { EventResult } from "../api/types";
import { getEvents } from "../api/client";
import { EventCard } from "../components/EventCard";

interface Props {
  onNavigate: (s: Screen) => void;
}

export function Home({ onNavigate }: Props) {
  const [events, setEvents] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents("Denver", 30)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();

  // Split events into "happening now" and "upcoming"
  const happeningNow = events.filter((e) => {
    const start = new Date(e.startTime).getTime();
    const end = e.endTime ? new Date(e.endTime).getTime() : start + 3600000;
    return now >= start && now <= end;
  });

  const upcoming = events.filter((e) => {
    const start = new Date(e.startTime).getTime();
    return start > now;
  });

  // Next 2 hours
  const twoHoursFromNow = now + 2 * 3600000;
  const nextUp = upcoming.filter((e) => new Date(e.startTime).getTime() <= twoHoursFromNow);
  const later = upcoming.filter((e) => new Date(e.startTime).getTime() > twoHoursFromNow);

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="screen">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>FlowB</h1>
        <div style={{ fontSize: 13, color: "var(--hint)" }}>{today} - Denver</div>
      </div>

      {happeningNow.length > 0 && (
        <>
          <div className="section-title">Happening Now</div>
          {happeningNow.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onClick={() => onNavigate({ name: "event", id: e.id })}
            />
          ))}
        </>
      )}

      {nextUp.length > 0 && (
        <>
          <div className="section-title">Next Up</div>
          {nextUp.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onClick={() => onNavigate({ name: "event", id: e.id })}
            />
          ))}
        </>
      )}

      {later.length > 0 && (
        <>
          <div className="section-title">Later</div>
          {later.slice(0, 15).map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onClick={() => onNavigate({ name: "event", id: e.id })}
            />
          ))}
        </>
      )}

      {events.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{"\\uD83D\\uDD0D"}</div>
          <div style={{ color: "var(--hint)" }}>No events found in Denver right now. Check back soon!</div>
        </div>
      )}
    </div>
  );
}
