import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { EventResult } from "../api/types";
import { getEvent, rsvpEvent } from "../api/client";

interface EventDetailProps {
  eventId: string;
  onNavigate: (s: Screen) => void;
}

export function EventDetail({ eventId, onNavigate }: EventDetailProps) {
  const [event, setEvent] = useState<EventResult | null>(null);
  const [going, setGoing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    getEvent(eventId)
      .then((data) => {
        setEvent(data.event);
        setGoing(data.flow?.going || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleRsvp = async () => {
    setRsvpLoading(true);
    try {
      await rsvpEvent(eventId, "going");
      setGoing((prev) => [...prev, "you"]);
    } catch {}
    setRsvpLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!event) return <div className="error-box">Event not found</div>;

  const date = new Date(event.startTime).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="screen">
      <button className="back-btn" onClick={() => onNavigate({ name: "home" })}>
        Back
      </button>

      {event.coverUrl && (
        <img src={event.coverUrl} alt="" className="event-detail-image" />
      )}

      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>{event.title}</h1>
        <p className="event-card-meta">{date}</p>
        {event.locationName && (
          <p className="event-card-meta">{event.locationName}</p>
        )}

        {event.isFree && <span className="tag tag-free" style={{ marginTop: 8 }}>Free</span>}

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={handleRsvp}
            disabled={rsvpLoading}
          >
            {rsvpLoading ? "..." : "Going"}
          </button>
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener" className="btn btn-secondary">
              Details
            </a>
          )}
        </div>

        {going.length > 0 && (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
            {going.length} going
          </p>
        )}

        {event.description && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>About</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
              {event.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
