"use client";

import { useState, useEffect, useMemo } from "react";
import { submitEvent, previewUrl, getCategories } from "../api/client";
import type { CategoryItem, UrlPreview } from "../api/client";

interface Props {
  onBack: () => void;
}

const EVENT_TYPES = [
  { value: "side_event", label: "Side Event" },
  { value: "party", label: "Party" },
  { value: "workshop", label: "Workshop" },
  { value: "meetup", label: "Meetup" },
  { value: "hackathon", label: "Hackathon" },
  { value: "activation", label: "Activation" },
] as const;

export function AddEventScreen({ onBack }: Props) {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [eventType, setEventType] = useState("side_event");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(true);
  const [submitterName, setSubmitterName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // UI state
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; eventId?: string } | null>(null);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Load categories on mount
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  // URL fetch handler
  const handleFetchUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setError("Please enter a valid URL");
      return;
    }
    setError("");
    setFetching(true);
    try {
      const meta: UrlPreview = await previewUrl(trimmed);
      if (meta.title && !title) setTitle(meta.title);
      if (meta.description && !description) setDescription(meta.description);
      if (meta.image) setImageUrl(meta.image);
      if (meta.venue && !venue) setVenue(meta.venue);
      if (meta.city && !city) setCity(meta.city);
      if (meta.isFree !== undefined) setIsFree(meta.isFree);
      if (meta.startsAt) {
        const d = new Date(meta.startsAt);
        if (!isNaN(d.getTime())) {
          if (!startDate) setStartDate(d.toISOString().split("T")[0]);
          if (!startTime) setStartTime(d.toTimeString().slice(0, 5));
        }
      }
      if (meta.endsAt) {
        const d = new Date(meta.endsAt);
        if (!isNaN(d.getTime())) {
          if (!endDate) setEndDate(d.toISOString().split("T")[0]);
          if (!endTime) setEndTime(d.toTimeString().slice(0, 5));
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch URL info");
    } finally {
      setFetching(false);
    }
  };

  // Category toggle (max 3)
  const toggleCategory = (slug: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(slug)) return prev.filter(s => s !== slug);
      if (prev.length >= 3) return prev;
      return [...prev, slug];
    });
  };

  // Build ISO datetime from date + time
  const buildIso = (d: string, t: string): string | undefined => {
    if (!d) return undefined;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return undefined;
    if (t) {
      const [h, m] = t.split(":");
      dt.setHours(parseInt(h, 10), parseInt(m || "0", 10));
    }
    return dt.toISOString();
  };

  // Validation
  const validate = (): string | null => {
    if (!title.trim()) return "Event title is required";
    if (url.trim()) {
      try { new URL(url.trim()); } catch { return "Invalid event URL"; }
    }
    if (endDate && startDate && endDate < startDate) return "End date must be on or after start date";
    if (endDate && startDate && endDate === startDate && endTime && startTime && endTime < startTime) {
      return "End time must be after start time";
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setSubmitting(true);

    try {
      const res = await submitEvent({
        title: title.trim(),
        url: url.trim() || undefined,
        startTime: buildIso(startDate, startTime),
        endTime: buildIso(endDate, endTime),
        venue: venue.trim() || undefined,
        city: city.trim() || undefined,
        description: description.trim() || undefined,
        isFree,
        submitterName: submitterName.trim() || undefined,
        imageUrl: imageUrl || undefined,
        eventType,
        categories: selectedCategories.length ? selectedCategories : undefined,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to submit event");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setUrl(""); setTitle(""); setDescription(""); setStartDate(""); setStartTime("");
    setEndDate(""); setEndTime(""); setVenue(""); setCity(""); setEventType("side_event");
    setSelectedCategories([]); setIsFree(true); setSubmitterName(""); setImageUrl("");
    setResult(null); setError("");
  };

  // Success screen
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
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.5 }}>
            <b>{title}</b> has been added to FlowB.
          </div>
          <div style={{ fontSize: 13, color: "var(--green)", marginBottom: 16 }}>
            +10 pts earned!
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={resetForm}>Add Another</button>
            <button className="btn btn-secondary" onClick={onBack}>Browse Events</button>
          </div>
        </div>
      </div>
    );
  }

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" } as const;

  return (
    <div className="screen">
      {/* Back button */}
      <button
        className="btn btn-sm btn-secondary"
        onClick={onBack}
        style={{ marginBottom: 12 }}
      >
        Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
          List Your Event
        </h1>
        <span className="points-badge">+10 pts</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        Add your event so others can discover it
      </p>

      <div className="card" style={{ padding: 16 }}>
        {/* URL field with Fetch */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Event URL</label>
          <div className="url-input-row">
            <input
              className="input"
              placeholder="https://lu.ma/your-event"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
            />
            <button
              className="url-fetch-btn"
              onClick={handleFetchUrl}
              disabled={fetching || !url.trim()}
            >
              {fetching ? "..." : "Fetch"}
            </button>
          </div>
        </div>

        {/* Image preview */}
        {imageUrl && (
          <div className="event-form-preview">
            <img src={imageUrl} alt="Event preview" onError={() => setImageUrl("")} />
            <button className="event-form-preview-clear" onClick={() => setImageUrl("")}>
              &times;
            </button>
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Event Title *</label>
          <input
            className="input"
            placeholder="e.g. Web3 Mixer at Rainey St"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            className="input"
            placeholder="What's the event about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ resize: "vertical" }}
          />
        </div>

        {/* Start date + time */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start Date</label>
            <input className="input" type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start Time</label>
            <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
        </div>

        {/* End date + time */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>End Date</label>
            <input className="input" type="date" value={endDate} min={startDate || today} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>End Time</label>
            <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        {/* Venue */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Venue</label>
          <input
            className="input"
            placeholder="e.g. Convention Center Hall B"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>

        {/* City */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>City</label>
          <input
            className="input"
            placeholder="e.g. Denver"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        {/* Event Type chips */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Event Type</label>
          <div className="chip-grid">
            {EVENT_TYPES.map(t => (
              <button
                key={t.value}
                className={`filter-chip${eventType === t.value ? " active" : ""}`}
                onClick={() => setEventType(t.value)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>
              Categories {selectedCategories.length > 0 && `(${selectedCategories.length}/3)`}
            </label>
            <div className="chip-grid">
              {categories.map(c => (
                <button
                  key={c.slug}
                  className={`filter-chip${selectedCategories.includes(c.slug) ? " active" : ""}`}
                  onClick={() => toggleCategory(c.slug)}
                  type="button"
                  style={selectedCategories.length >= 3 && !selectedCategories.includes(c.slug) ? { opacity: 0.4 } : undefined}
                >
                  {c.icon ? `${c.icon} ` : ""}{c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Free checkbox */}
        <div style={{ marginBottom: 14 }}>
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

        {/* Submitter name */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Your Name (optional)</label>
          <input
            className="input"
            placeholder="How should we credit you?"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: "var(--red, #ef4444)", fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Submit */}
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
