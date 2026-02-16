import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { ScheduleEntry } from "../api/types";
import { getSchedule, checkinScheduleEntry } from "../api/client";

interface Props {
  onNavigate: (s: Screen) => void;
}

function groupByDate(entries: ScheduleEntry[]): Map<string, ScheduleEntry[]> {
  const groups = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    const date = new Date(entry.starts_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    const existing = groups.get(date) || [];
    existing.push(entry);
    groups.set(date, existing);
  }
  return groups;
}

function ScheduleSkeleton() {
  return (
    <>
      {[1, 2].map((i) => (
        <div key={i} className="skeleton">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div className="skeleton-line skeleton-line-title" />
              <div className="skeleton-line skeleton-line-sub" />
            </div>
            <div className="skeleton-line" style={{ width: 50, marginLeft: 12 }} />
          </div>
          <div className="skeleton-line skeleton-line-short" style={{ marginTop: 10 }} />
        </div>
      ))}
    </>
  );
}

export function Schedule({ onNavigate }: Props) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchedule()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCheckin = async (entry: ScheduleEntry) => {
    try {
      await checkinScheduleEntry(entry.id);
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, checked_in: true } : e)),
      );
      const tg = (window as any).Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error("Checkin failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="screen">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Schedule</h1>
        <ScheduleSkeleton />
      </div>
    );
  }

  const grouped = groupByDate(entries);

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Schedule</h1>

      {entries.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">{"\uD83D\uDCC5"}</div>
            <div className="empty-state-title">No events scheduled</div>
            <div className="empty-state-text">
              Browse and RSVP to events to build your schedule!
            </div>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate({ name: "home" })}
            >
              Browse Events
            </button>
          </div>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([date, dayEntries]) => (
          <div key={date}>
            <div className="section-title">{date}</div>
            {dayEntries.map((entry) => {
              const time = new Date(entry.starts_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div key={entry.id} className="card">
                  <div className="card-header">
                    <div style={{ flex: 1 }}>
                      <div className="card-title">{entry.event_title}</div>
                      {entry.venue_name && (
                        <div className="card-subtitle">{entry.venue_name}</div>
                      )}
                    </div>
                    <span className="time-tag">{time}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span className={`badge ${entry.rsvp_status === "going" ? "badge-green" : "badge-yellow"}`}>
                      {entry.rsvp_status}
                    </span>

                    {entry.checked_in ? (
                      <span className="checked-in">Checked In</span>
                    ) : (
                      <button
                        className="btn btn-sm checkin-btn"
                        onClick={() => handleCheckin(entry)}
                      >
                        Check In
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
