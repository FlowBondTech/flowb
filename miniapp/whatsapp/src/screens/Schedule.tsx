import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { ScheduleEntry } from "../api/types";
import { getSchedule } from "../api/client";

interface ScheduleProps {
  onNavigate: (s: Screen) => void;
}

export function Schedule({ onNavigate }: ScheduleProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchedule()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>My Schedule</h1>
      </header>

      {loading && <div className="loading"><div className="spinner" /></div>}

      {!loading && entries.length === 0 && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
            No upcoming events on your schedule.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate({ name: "home" })}>
            Browse Events
          </button>
        </div>
      )}

      <div className="schedule-list">
        {entries.map((entry) => {
          const date = new Date(entry.start_time).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <div
              key={entry.id}
              className="schedule-item"
              onClick={() => onNavigate({ name: "event", id: entry.event_id })}
            >
              <div className="schedule-item-date">{date}</div>
              <div className="schedule-item-title">{entry.title}</div>
              {entry.location_name && (
                <div className="schedule-item-location">{entry.location_name}</div>
              )}
              {entry.checked_in && <span className="tag tag-free">Checked In</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
