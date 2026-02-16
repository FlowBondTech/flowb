import type { EventResult } from "../api/types";

interface Props {
  event: EventResult;
  flowGoing?: number;
  onClick: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isHappeningNow(start: string, end?: string): boolean {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : s + 3600000;
  return now >= s && now <= e;
}

export function EventCard({ event, flowGoing, onClick }: Props) {
  const live = isHappeningNow(event.startTime, event.endTime);

  return (
    <div className="card card-clickable" onClick={onClick}>
      <div className="card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title">{event.title}</div>
          {event.locationName && (
            <div className="card-subtitle">{event.locationName}</div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
          <span className={`time-tag ${live ? "time-tag-live" : ""}`}>
            {live ? "LIVE" : formatTime(event.startTime)}
          </span>
          <div style={{ fontSize: 11, color: "var(--hint)" }}>
            {formatDate(event.startTime)}
          </div>
        </div>
      </div>

      {event.description && (
        <div className="card-description">
          {event.description}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          flexWrap: "wrap",
        }}
      >
        {event.isFree && <span className="badge badge-green">Free</span>}
        {event.source && (
          <span className="category-badge" style={{ textTransform: "capitalize" }}>
            {event.source}
          </span>
        )}
      </div>

      {flowGoing !== undefined && flowGoing > 0 && (
        <div className="social-proof">
          <span>
            {flowGoing} from your crew going
          </span>
        </div>
      )}
    </div>
  );
}

/** Skeleton loader matching EventCard dimensions */
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
      <div
        className="skeleton-line"
        style={{ width: "85%", marginTop: 10, height: 12 }}
      />
      <div
        className="skeleton-line skeleton-line-short"
        style={{ marginTop: 10 }}
      />
    </div>
  );
}
