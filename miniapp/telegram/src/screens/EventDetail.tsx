import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { EventResult, EventSocial } from "../api/types";
import { getEvent, getEventSocial, rsvpEvent, cancelRsvp } from "../api/client";

interface Props {
  eventId: string;
  onNavigate: (s: Screen) => void;
}

export function EventDetail({ eventId }: Props) {
  const [event, setEvent] = useState<EventResult | null>(null);
  const [social, setSocial] = useState<EventSocial | null>(null);
  const [flowGoing, setFlowGoing] = useState<string[]>([]);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getEvent(eventId).then((d) => {
        setEvent(d.event);
        setFlowGoing(d.flow.going);
      }),
      getEventSocial(eventId).then(setSocial),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleRsvp = async (status: "going" | "maybe") => {
    try {
      await rsvpEvent(eventId, status);
      setRsvpStatus(status);
      const tg = (window as any).Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error("RSVP failed:", err);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelRsvp(eventId);
      setRsvpStatus(null);
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  };

  if (loading || !event) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  const startDate = new Date(event.startTime);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const totalGoing = (social?.goingCount || 0);

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{event.title}</h1>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "var(--hint)", marginBottom: 4 }}>
          {dateStr} at {timeStr}
        </div>
        {event.locationName && (
          <div style={{ fontSize: 14, marginBottom: 2 }}>{event.locationName}</div>
        )}
        {event.locationCity && (
          <div style={{ fontSize: 13, color: "var(--hint)" }}>{event.locationCity}</div>
        )}
      </div>

      {event.isFree !== undefined && (
        <div style={{ marginBottom: 12 }}>
          <span className={`badge ${event.isFree ? "badge-green" : "badge-yellow"}`}>
            {event.isFree ? "Free" : event.price ? `$${event.price}` : "Paid"}
          </span>
        </div>
      )}

      {event.description && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--hint)" }}>
            {event.description.slice(0, 300)}
            {event.description.length > 300 ? "..." : ""}
          </div>
        </div>
      )}

      {/* Social proof */}
      {(totalGoing > 0 || flowGoing.length > 0) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ margin: "0 0 8px" }}>Who's Going</div>
          {flowGoing.length > 0 && (
            <div className="social-proof" style={{ marginBottom: 4 }}>
              {flowGoing.length} from your flow
            </div>
          )}
          {totalGoing > 0 && (
            <div style={{ fontSize: 13, color: "var(--hint)" }}>
              {totalGoing} total going
              {social?.maybeCount ? ` + ${social.maybeCount} maybe` : ""}
            </div>
          )}
        </div>
      )}

      {/* RSVP buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {rsvpStatus === "going" ? (
          <>
            <button className="btn btn-primary btn-block" disabled style={{ opacity: 0.6 }}>
              You're Going!
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
              Cancel
            </button>
          </>
        ) : rsvpStatus === "maybe" ? (
          <>
            <button className="btn btn-secondary btn-block" onClick={() => handleRsvp("going")}>
              Upgrade to Going
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-block" onClick={() => handleRsvp("going")}>
              I'm Going
            </button>
            <button className="btn btn-secondary" onClick={() => handleRsvp("maybe")}>
              Maybe
            </button>
          </>
        )}
      </div>

      {/* External link */}
      {event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener"
          style={{
            display: "block",
            textAlign: "center",
            color: "var(--link)",
            fontSize: 14,
            padding: 12,
          }}
        >
          View on {event.source}
        </a>
      )}
    </div>
  );
}
