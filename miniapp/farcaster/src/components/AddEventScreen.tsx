"use client";

import { useState } from "react";
import { submitEvent } from "../api/client";

interface Props {
  onBack: () => void;
}

export function AddEventScreen({ onBack }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; eventId?: string } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Event title is required");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      let startTime: string | undefined;
      if (date) {
        const d = new Date(date);
        if (!isNaN(d.getTime()) && time) {
          const [h, m] = time.split(":");
          d.setHours(parseInt(h, 10), parseInt(m || "0", 10));
        }
        if (!isNaN(d.getTime())) startTime = d.toISOString();
      }

      const res = await submitEvent({
        title: title.trim(),
        startTime,
        venue: venue.trim() || undefined,
        url: url.trim() || undefined,
        description: description.trim() || undefined,
        city: "Austin",
        isFree,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to submit event");
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.ok) {
    return (
      <div className="screen">
        <div className="card" style={{ textAlign: "center", padding: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", background: "var(--accent, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="28" height="28">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Event Listed!</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
            <b>{title}</b> has been added to FlowB. Others can now discover it when browsing events.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => {
              setTitle(""); setDate(""); setTime(""); setVenue(""); setUrl("");
              setDescription(""); setIsFree(true); setResult(null);
            }}>
              Add Another
            </button>
            <button className="btn btn-secondary" onClick={onBack}>
              Browse Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <button
        className="btn btn-sm btn-secondary"
        onClick={onBack}
        style={{ marginBottom: 12 }}
      >
        Back
      </button>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.01em" }}>
        List Your Event
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        Add your event so others can discover it on FlowB
      </p>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>
            Event Title *
          </label>
          <input
            className="input"
            placeholder="e.g. Web3 Mixer at Rainey St"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>
              Date
            </label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>
              Time
            </label>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>
            Venue
          </label>
          <input
            className="input"
            placeholder="e.g. Convention Center Hall B"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>
            Event URL
          </label>
          <input
            className="input"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>
            Description
          </label>
          <textarea
            className="input"
            placeholder="What's the event about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ resize: "vertical" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--accent, #6366f1)" }}
            />
            <span style={{ fontSize: 14 }}>Free event</span>
          </label>
        </div>

        {error && (
          <div style={{ color: "var(--red, #ef4444)", fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary btn-block"
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          style={{ opacity: submitting || !title.trim() ? 0.6 : 1 }}
        >
          {submitting ? "Submitting..." : "Submit Event"}
        </button>
      </div>
    </div>
  );
}
