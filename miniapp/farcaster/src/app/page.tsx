"use client";

import { useState, useEffect, useCallback } from "react";
import { initFarcaster, signIn, composeCast } from "../lib/farcaster";
import { authFarcaster, getEvents, getEvent, rsvpEvent, getSchedule, getCrews, getCrewMembers, crewCheckin, getPoints, getCrewLeaderboard } from "../api/client";
import type { EventResult, ScheduleEntry, CrewInfo, CrewMember, CrewCheckin as CrewCheckinType, PointsInfo, LeaderboardEntry } from "../api/types";

type Screen = "home" | "event" | "schedule" | "crew" | "points";

export default function FarcasterApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [eventId, setEventId] = useState<string>("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("");

  // Data
  const [events, setEvents] = useState<EventResult[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventResult | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [crews, setCrews] = useState<CrewInfo[]>([]);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [checkins, setCheckins] = useState<CrewCheckinType[]>([]);
  const [points, setPoints] = useState<PointsInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");

  // Init
  useEffect(() => {
    (async () => {
      const ctx = await initFarcaster();
      if (ctx.username) setUsername(ctx.username);

      // Auto sign in
      const creds = await signIn();
      if (creds) {
        try {
          const result = await authFarcaster(creds.message, creds.signature);
          setAuthed(true);
          if (result.user.username) setUsername(result.user.username);
        } catch (err) {
          console.error("Auth failed:", err);
        }
      }
      setLoading(false);
    })();
  }, []);

  // Load events on home
  useEffect(() => {
    if (screen === "home") {
      getEvents("Denver", 30).then(setEvents).catch(console.error);
    }
  }, [screen]);

  // Load schedule
  useEffect(() => {
    if (screen === "schedule" && authed) {
      getSchedule().then(setSchedule).catch(console.error);
    }
  }, [screen, authed]);

  // Load crews
  useEffect(() => {
    if (screen === "crew" && authed) {
      getCrews().then((c) => {
        setCrews(c);
        if (c.length && !selectedCrewId) setSelectedCrewId(c[0].id);
      }).catch(console.error);
    }
  }, [screen, authed, selectedCrewId]);

  // Load crew members
  useEffect(() => {
    if (selectedCrewId && screen === "crew") {
      getCrewMembers(selectedCrewId).then(({ members: m, checkins: c }) => {
        setMembers(m);
        setCheckins(c);
      }).catch(console.error);
    }
  }, [selectedCrewId, screen]);

  // Load points
  useEffect(() => {
    if (screen === "points" && authed) {
      getPoints().then(setPoints).catch(console.error);
      if (selectedCrewId) getCrewLeaderboard(selectedCrewId).then(setLeaderboard).catch(console.error);
    }
  }, [screen, authed, selectedCrewId]);

  // Load event detail
  useEffect(() => {
    if (screen === "event" && eventId) {
      getEvent(eventId).then(({ event }) => setSelectedEvent(event)).catch(console.error);
    }
  }, [screen, eventId]);

  const openEvent = useCallback((id: string) => {
    setEventId(id);
    setScreen("event");
  }, []);

  const handleRsvp = async (status: "going" | "maybe") => {
    if (!eventId) return;
    await rsvpEvent(eventId, status);
  };

  const handleShareEvent = (event: EventResult) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    composeCast(
      `I'm going to ${event.title}! Who's joining?`,
      [`${appUrl}?event=${event.id}`],
    );
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  return (
    <div className="app">
      {/* Screens */}
      {screen === "home" && (
        <div className="screen">
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>FlowB</h1>
            <div style={{ fontSize: 13, color: "var(--hint)" }}>
              EthDenver - Denver{username ? ` | @${username}` : ""}
            </div>
          </div>

          <div className="section-title">Events</div>
          {events.map((e) => (
            <div key={e.id} className="card" onClick={() => openEvent(e.id)} style={{ cursor: "pointer" }}>
              <div className="card-header">
                <div style={{ flex: 1 }}>
                  <div className="card-title">{e.title}</div>
                  {e.locationName && <div className="card-subtitle">{e.locationName}</div>}
                </div>
                <span className="time-tag">
                  {new Date(e.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              {e.isFree && <span className="badge badge-green">Free</span>}
            </div>
          ))}
        </div>
      )}

      {screen === "event" && selectedEvent && (
        <div className="screen">
          <button className="btn btn-sm btn-secondary" onClick={() => setScreen("home")} style={{ marginBottom: 12 }}>
            Back
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{selectedEvent.title}</h1>
          <div style={{ fontSize: 14, color: "var(--hint)", marginBottom: 4 }}>
            {new Date(selectedEvent.startTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" at "}
            {new Date(selectedEvent.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
          {selectedEvent.locationName && <div style={{ fontSize: 14, marginBottom: 16 }}>{selectedEvent.locationName}</div>}

          {selectedEvent.description && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--hint)" }}>
                {selectedEvent.description.slice(0, 300)}{selectedEvent.description.length > 300 ? "..." : ""}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn btn-primary btn-block" onClick={() => handleRsvp("going")}>
              I'm Going
            </button>
            <button className="btn btn-secondary" onClick={() => handleRsvp("maybe")}>
              Maybe
            </button>
          </div>

          <button
            className="btn btn-secondary btn-block"
            onClick={() => handleShareEvent(selectedEvent)}
          >
            Share on Farcaster
          </button>
        </div>
      )}

      {screen === "schedule" && (
        <div className="screen">
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Schedule</h1>
          {schedule.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--hint)" }}>
              No events scheduled. Browse and RSVP to get started!
            </div>
          ) : (
            schedule.map((s) => (
              <div key={s.id} className="card">
                <div className="card-title">{s.event_title}</div>
                <div className="card-subtitle">{s.venue_name}</div>
                <div style={{ fontSize: 12, color: "var(--hint)", marginTop: 4 }}>
                  {new Date(s.starts_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
                <span className={`badge ${s.rsvp_status === "going" ? "badge-green" : "badge-yellow"}`} style={{ marginTop: 6 }}>
                  {s.rsvp_status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {screen === "crew" && (
        <div className="screen">
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Crew</h1>
          {crews.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--hint)" }}>
              No crews yet. Join one from a friend's invite!
            </div>
          ) : (
            <>
              {crews.length > 1 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto" }}>
                  {crews.map((c) => (
                    <button key={c.id} className={`btn btn-sm ${selectedCrewId === c.id ? "btn-primary" : "btn-secondary"}`} onClick={() => setSelectedCrewId(c.id)}>
                      {c.emoji} {c.name}
                    </button>
                  ))}
                </div>
              )}
              {checkins.length > 0 && (
                <>
                  <div className="section-title">Right Now</div>
                  {checkins.map((c, i) => (
                    <div key={i} className="member-row">
                      <span className={`status-dot status-${c.status}`} />
                      <div>
                        <div className="member-name">{c.user_id.replace(/^(telegram_|farcaster_)/, "@")}</div>
                        <div className="member-status">{c.venue_name}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div className="section-title">Members ({members.length})</div>
              {members.map((m) => (
                <div key={m.user_id} className="member-row">
                  <div className="member-name">{m.user_id.replace(/^(telegram_|farcaster_)/, "@")}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {screen === "points" && (
        <div className="screen">
          <div className="points-hero">
            <div className="points-value">{points?.points || 0}</div>
            <div className="points-label">Points</div>
          </div>
          {leaderboard.length > 0 && (
            <>
              <div className="section-title">Leaderboard</div>
              <div className="card">
                {leaderboard.map((e, i) => (
                  <div key={e.user_id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < leaderboard.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <span>{i + 1}. {e.user_id.replace(/^(telegram_|farcaster_)/, "@")}</span>
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>{e.total_points}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {[
          { name: "home" as const, icon: "\u26A1", label: "Now" },
          { name: "schedule" as const, icon: "\uD83D\uDCC5", label: "Schedule" },
          { name: "crew" as const, icon: "\uD83D\uDC65", label: "Crew" },
          { name: "points" as const, icon: "\u2B50", label: "Points" },
        ].map((tab) => (
          <button key={tab.name} className={`nav-item ${screen === tab.name ? "active" : ""}`} onClick={() => setScreen(tab.name)}>
            <span className="nav-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
