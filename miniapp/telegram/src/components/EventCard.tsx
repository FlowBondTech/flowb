import type { EventResult } from "../api/types";

interface Props {
  event: EventResult;
  flowGoing?: number;
  onClick: () => void;
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

export function EventCard({ event, flowGoing, onClick }: Props) {
  const live = isHappeningNow(event.startTime, event.endTime);

  return (
    <div className="card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="card-header">
        <div style={{ flex: 1 }}>
          <div className="card-title">{event.title}</div>
          {event.locationName && (
            <div className="card-subtitle">{event.locationName}</div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span className={`time-tag ${live ? "time-tag-live" : ""}`}>
            {live ? "LIVE" : formatTime(event.startTime)}
          </span>
          <div style={{ fontSize: 11, color: "var(--hint)" }}>{formatDate(event.startTime)}</div>
        </div>
      </div>

      <div className="card-meta">
        {event.isFree && <span className="badge badge-green">Free</span>}
        {event.source && <span style={{ textTransform: "capitalize" }}>{event.source}</span>}
      </div>

      {flowGoing !== undefined && flowGoing > 0 && (
        <div className="social-proof">
          <span>{flowGoing} from your flow</span>
        </div>
      )}
    </div>
  );
}
