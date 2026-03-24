import { useState, useEffect, useMemo } from "react";
import type { Screen } from "../App";
import type { EventResult } from "../api/types";
import { universalCheckin, getEvents } from "../api/client";
import { useLocation } from "../hooks/useLocation";

interface Props {
  onNavigate: (s: Screen) => void;
  prefilledEvent?: { id: string; title: string; venue?: string };
}

export function CheckIn({ onNavigate, prefilledEvent }: Props) {
  const gps = useLocation();
  const tg = (window as any).Telegram?.WebApp;

  const [venue, setVenue] = useState(prefilledEvent?.venue || "");
  const [status, setStatus] = useState<"here" | "heading" | "leaving">("here");
  const [message, setMessage] = useState("");
  const [linkedEvent, setLinkedEvent] = useState<{ id: string; title: string } | null>(
    prefilledEvent ? { id: prefilledEvent.id, title: prefilledEvent.title } : null,
  );
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Today's events for linking suggestions
  const [todayEvents, setTodayEvents] = useState<EventResult[]>([]);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [eventSearch, setEventSearch] = useState("");

  useEffect(() => {
    getEvents("Austin", 30)
      .then((events) => {
        const now = Date.now();
        const relevant = events.filter((e) => {
          const start = new Date(e.startTime).getTime();
          const end = e.endTime ? new Date(e.endTime).getTime() : start + 3600000;
          // Show events happening now or starting in the next 4 hours
          return (now >= start && now <= end) || (start > now && start - now < 4 * 3600000);
        });
        setTodayEvents(relevant);
      })
      .catch(console.error);
  }, []);

  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return todayEvents.slice(0, 8);
    const q = eventSearch.toLowerCase();
    return todayEvents
      .filter((e) => e.title.toLowerCase().includes(q) || e.locationName?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [todayEvents, eventSearch]);

  const handleSubmit = async () => {
    if (!venue.trim() || submitting) return;
    setSubmitting(true);
    try {
      await universalCheckin({
        venue: venue.trim(),
        status,
        message: message.trim() || undefined,
        eventId: linkedEvent?.id,
        ...(gpsEnabled && gps.location
          ? { latitude: gps.location.latitude, longitude: gps.location.longitude }
          : {}),
      });
      setSuccess(true);
      tg?.HapticFeedback?.notificationOccurred("success");
      // Auto-navigate back after a moment
      setTimeout(() => onNavigate({ name: "home" }), 1500);
    } catch (err) {
      console.error("Check-in failed:", err);
      tg?.showAlert?.("Check-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{status === "here" ? "\u2705" : status === "heading" ? "\u27A1\uFE0F" : "\u{1F44B}"}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Checked in!</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>
          {status === "here" ? "At" : status === "heading" ? "Heading to" : "Leaving"}{" "}
          <strong>{venue}</strong>
          {linkedEvent && (
            <div style={{ marginTop: 4, fontSize: 13 }}>
              Event: {linkedEvent.title}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--purple)", marginTop: 12 }}>
          Your crew has been pinged!
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Check In</h1>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        Let your crew know where you are
      </div>

      {/* Venue input */}
      <div className="card" style={{ padding: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" }}>
          Where are you / what are you up to?
        </label>
        <input
          className="input"
          type="text"
          placeholder="Coffee at Blue Bottle, SXSW main stage, chillin at home..."
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          autoFocus
          style={{ fontSize: 15 }}
        />
      </div>

      {/* Status picker */}
      <div style={{ display: "flex", gap: 6, margin: "12px 0" }}>
        {(["here", "heading", "leaving"] as const).map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${status === s ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setStatus(s)}
            style={{ flex: 1, textTransform: "capitalize", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
          >
            <span className={`status-dot status-${s}`} />
            {s === "here" ? "I'm here" : s === "heading" ? "Heading there" : "Leaving"}
          </button>
        ))}
      </div>

      {/* Link to event */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: linkedEvent || showEventPicker ? 10 : 0 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Link to event
          </label>
          {!linkedEvent && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowEventPicker(!showEventPicker)}
              style={{ fontSize: 11 }}
            >
              {showEventPicker ? "Hide" : todayEvents.length > 0 ? `${todayEvents.length} nearby` : "Search"}
            </button>
          )}
        </div>

        {/* Linked event chip */}
        {linkedEvent && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: "var(--radius-sm)",
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #6366f1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{linkedEvent.title}</span>
            <button
              onClick={() => setLinkedEvent(null)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, fontSize: 16 }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Event picker */}
        {showEventPicker && !linkedEvent && (
          <div>
            <input
              className="input"
              type="text"
              placeholder="Search events..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              style={{ marginBottom: 8, fontSize: 13 }}
            />
            {filteredEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "center", padding: 12 }}>
                No events found. You can still check in without linking an event.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                {filteredEvents.map((e) => {
                  const start = new Date(e.startTime);
                  const isNow = Date.now() >= start.getTime() && Date.now() <= (e.endTime ? new Date(e.endTime).getTime() : start.getTime() + 3600000);
                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        setLinkedEvent({ id: e.id, title: e.title });
                        if (!venue.trim() && e.locationName) setVenue(e.locationName);
                        setShowEventPicker(false);
                        setEventSearch("");
                        tg?.HapticFeedback?.impactOccurred("light");
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: "var(--radius-sm)",
                        background: "var(--surface)", border: "1px solid var(--border)",
                        cursor: "pointer", textAlign: "left", fontSize: 13,
                        fontFamily: "inherit", color: "var(--text)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.title}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                          {e.locationName || ""}
                          {isNow && <span style={{ color: "var(--green)", fontWeight: 600, marginLeft: 4 }}>LIVE</span>}
                          {!isNow && (
                            <span style={{ marginLeft: 4 }}>
                              {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!linkedEvent && !showEventPicker && (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
            Optional — link your check-in to a specific event
          </div>
        )}
      </div>

      {/* Optional message */}
      <div style={{ margin: "12px 0" }}>
        <input
          className="input"
          type="text"
          placeholder="Add a message (optional) — e.g. 'come find me!'"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* GPS toggle */}
      <div
        className="card"
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", cursor: "pointer",
        }}
        onClick={() => {
          if (!gpsEnabled) gps.requestLocation();
          setGpsEnabled(!gpsEnabled);
        }}
      >
        <div style={{
          width: 40, height: 22, borderRadius: 11,
          background: gpsEnabled ? "var(--green)" : "var(--border)",
          position: "relative", transition: "background 0.2s", flexShrink: 0,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: "#fff", position: "absolute", top: 2,
            left: gpsEnabled ? 20 : 2, transition: "left 0.2s",
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Share GPS location</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
            Let friends navigate to you
          </div>
        </div>
        {gps.loading && <div className="spinner" style={{ width: 16, height: 16 }} />}
        {gpsEnabled && gps.location && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Submit */}
      <button
        className="btn btn-primary btn-block"
        onClick={handleSubmit}
        disabled={!venue.trim() || submitting}
        style={{ marginTop: 16, padding: "14px 20px", fontSize: 15, fontWeight: 600 }}
      >
        {submitting ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div className="spinner" style={{ width: 16, height: 16, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
            Checking in...
          </span>
        ) : (
          <>
            {status === "here" ? "Check In" : status === "heading" ? "Share Status" : "Share Status"}
            {linkedEvent ? " + Event" : ""}
          </>
        )}
      </button>

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>
        Your crew and friends will be notified
      </div>
    </div>
  );
}
