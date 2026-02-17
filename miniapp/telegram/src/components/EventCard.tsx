import { useState } from "react";
import type { EventResult } from "../api/types";

interface Props {
  event: EventResult;
  flowGoing?: number;
  onClick: () => void;
}

/** Compress images via wsrv.nl proxy - converts to webp ~30-80KB */
function optimizeImageUrl(url: string | undefined, w = 400, h = 200): string | null {
  if (!url) return null;
  if (url.includes("evbuc.com")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&h=${h}&fit=cover&output=webp&q=75`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isHappeningNow(start: string, end?: string): boolean {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : s + 3600000;
  return now >= s && now <= e;
}

const SOURCE_COLORS: Record<string, string> = {
  luma: "#FF5C00",
  eventbrite: "#F05537",
  ra: "#D4FC79",
  brave: "#FB542B",
  tavily: "#7C3AED",
  egator: "#3b82f6",
};

export function EventCard({ event, flowGoing, onClick }: Props) {
  const live = isHappeningNow(event.startTime, event.endTime);
  const thumbUrl = optimizeImageUrl(event.imageUrl);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="card card-clickable" onClick={onClick}>
      {thumbUrl && !imgError ? (
        <img
          className="event-card-img"
          src={thumbUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      ) : event.imageUrl && !imgError ? (
        <img
          className="event-card-img"
          src={event.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      ) : null}

      <div className="card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title">{event.title}</div>
          {event.locationName && (
            <div className="card-subtitle" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {event.locationName}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
          <span className={`time-tag ${live ? "time-tag-live" : ""}`}>
            {live ? "LIVE" : formatTime(event.startTime)}
          </span>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
            {formatDate(event.startTime)}
          </div>
        </div>
      </div>

      {event.description && (
        <div className="card-description">
          {event.description}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {event.isFree && <span className="badge badge-green">Free</span>}
        {event.source && (
          <span
            className="category-badge"
            style={{
              textTransform: "capitalize",
              borderColor: SOURCE_COLORS[event.source] || undefined,
              color: SOURCE_COLORS[event.source] || undefined,
            }}
          >
            {event.source}
          </span>
        )}
      </div>

      {flowGoing !== undefined && flowGoing > 0 && (
        <div className="social-proof">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span>{flowGoing} from your crew going</span>
        </div>
      )}
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="skeleton">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <div className="skeleton-line skeleton-line-title" />
          <div className="skeleton-line skeleton-line-sub" />
        </div>
        <div className="skeleton-line" style={{ width: 50, marginLeft: 12 }} />
      </div>
      <div className="skeleton-line" style={{ width: "85%", marginTop: 10, height: 12 }} />
      <div className="skeleton-line skeleton-line-short" style={{ marginTop: 10 }} />
    </div>
  );
}
