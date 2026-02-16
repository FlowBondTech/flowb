"use client";

import { useState, useEffect, useCallback } from "react";
import { initFarcaster, quickAuth, composeCast, promptAddMiniApp, isInMiniApp } from "../lib/farcaster";
import { authFarcasterQuick, getEvents, getEvent, rsvpEvent, getSchedule, checkinScheduleEntry, claimPendingPoints } from "../api/client";
import { getPendingActions, clearPendingActions } from "../lib/pendingPoints";
import type { EventResult, ScheduleEntry } from "../api/types";
import { EventCard, EventCardSkeleton } from "../components/EventCard";
import { BottomNav } from "../components/BottomNav";
import { CrewScreen } from "../components/CrewScreen";
import { PointsScreen } from "../components/PointsScreen";
import { OnboardingScreen } from "../components/OnboardingScreen";
import { WebLanding } from "../components/WebLanding";

type Screen = "home" | "event" | "schedule" | "crew" | "points";

export default function FarcasterApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [eventId, setEventId] = useState<string>("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("");
  const [inMiniApp, setInMiniApp] = useState<boolean | null>(null);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Data
  const [events, setEvents] = useState<EventResult[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventResult | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [appAdded, setAppAdded] = useState(false);

  // Init — detect context first, then run appropriate flow
  useEffect(() => {
    (async () => {
      const miniApp = await isInMiniApp();
      setInMiniApp(miniApp);

      if (!miniApp) {
        // Outside Farcaster/Base — show web landing
        setLoading(false);
        return;
      }

      // Inside mini app — normal init flow
      const ctx = await initFarcaster();
      if (ctx.username) setUsername(ctx.username);
      if (ctx.added) setAppAdded(true);

      const token = await quickAuth();
      if (token) {
        try {
          const result = await authFarcasterQuick(token);
          setAuthed(true);
          if (result.user.username) setUsername(result.user.username);

          const pending = getPendingActions();
          if (pending.length > 0) {
            claimPendingPoints(pending)
              .then(({ claimed }) => {
                if (claimed > 0) console.log(`[auth] Claimed ${claimed} pending points`);
                clearPendingActions();
              })
              .catch(() => {});
          }
        } catch (err) {
          console.error("Auth failed:", err);
        }
      }

      if (!ctx.added) {
        const addResult = await promptAddMiniApp();
        if (addResult.added) setAppAdded(true);
      }

      try {
        const onboarded = localStorage.getItem("flowb_onboarded");
        if (!onboarded) {
          setShowOnboarding(true);
        }
      } catch {}

      setLoading(false);
    })();
  }, []);

  // Load events on home
  useEffect(() => {
    if (screen === "home" && !showOnboarding) {
      setEventsLoading(true);
      getEvents("Denver", 30)
        .then(setEvents)
        .catch(console.error)
        .finally(() => setEventsLoading(false));
    }
  }, [screen, showOnboarding]);

  // Load schedule
  useEffect(() => {
    if (screen === "schedule" && authed) {
      setScheduleLoading(true);
      getSchedule()
        .then(setSchedule)
        .catch(console.error)
        .finally(() => setScheduleLoading(false));
    }
  }, [screen, authed]);

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

  const handleScheduleCheckin = async (entry: ScheduleEntry) => {
    try {
      await checkinScheduleEntry(entry.id);
      setSchedule((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, checked_in: true } : e)),
      );
    } catch (err) {
      console.error("Checkin failed:", err);
    }
  };

  const navigateTab = useCallback((tab: "home" | "schedule" | "crew" | "points") => {
    setScreen(tab);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleOnboardingCrewNav = useCallback((action: "browse" | "create") => {
    setShowOnboarding(false);
    setScreen("crew");
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  // Outside Farcaster — show simple landing with deep links
  if (inMiniApp === false) {
    return <WebLanding />;
  }

  // Show onboarding if not yet completed
  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        onNavigateCrew={handleOnboardingCrewNav}
      />
    );
  }

  const now = Date.now();
  const happeningNow = events.filter((e) => {
    const start = new Date(e.startTime).getTime();
    const end = e.endTime ? new Date(e.endTime).getTime() : start + 3600000;
    return now >= start && now <= end;
  });
  const upcoming = events.filter((e) => new Date(e.startTime).getTime() > now);
  const twoHoursFromNow = now + 2 * 3600000;
  const nextUp = upcoming.filter((e) => new Date(e.startTime).getTime() <= twoHoursFromNow);
  const later = upcoming.filter((e) => new Date(e.startTime).getTime() > twoHoursFromNow);

  return (
    <div className="app">
      {/* Home Screen */}
      {screen === "home" && (
        <div className="screen">
          <div style={{ marginBottom: 16 }}>
            <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>FlowB</h1>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              EthDenver - Denver{username ? ` | @${username}` : ""}
            </div>
          </div>

          {!appAdded && (
            <button
              className="btn btn-primary btn-block"
              style={{ marginBottom: 12 }}
              onClick={async () => {
                const r = await promptAddMiniApp();
                if (r.added) setAppAdded(true);
              }}
            >
              Add FlowB + Enable Notifications
            </button>
          )}

          {/* Featured Event */}
          <a
            href="https://lu.ma/qe7f65ue"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="featured-card">
              <div className="featured-img" />
              <div className="featured-body">
                <span className="featured-badge">Featured</span>
                <div className="featured-title">Purple Party</div>
                <div className="featured-meta">
                  <div className="featured-meta-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Tue, Feb 18 &middot; 6:00 - 10:00 PM MT
                  </div>
                  <div className="featured-meta-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    Kismet Casa, Denver
                  </div>
                </div>
                <div className="featured-footer">
                  <span className="badge badge-green">Free</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Farcaster Founders Spotlight</span>
                </div>
              </div>
            </div>
          </a>

          {eventsLoading ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : events.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\uD83D\uDD0D"}</div>
                <div className="empty-state-title">No events found</div>
                <div className="empty-state-text">
                  No events in Denver right now. Check back soon!
                </div>
              </div>
            </div>
          ) : (
            <>
              {happeningNow.length > 0 && (
                <>
                  <div className="section-title">Happening Now</div>
                  {happeningNow.map((e) => (
                    <EventCard key={e.id} event={e} onClick={() => openEvent(e.id)} />
                  ))}
                </>
              )}

              {nextUp.length > 0 && (
                <>
                  <div className="section-title">Next Up</div>
                  {nextUp.map((e) => (
                    <EventCard key={e.id} event={e} onClick={() => openEvent(e.id)} />
                  ))}
                </>
              )}

              {later.length > 0 && (
                <>
                  <div className="section-title">Later</div>
                  {later.slice(0, 15).map((e) => (
                    <EventCard key={e.id} event={e} onClick={() => openEvent(e.id)} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Event Detail Screen */}
      {screen === "event" && selectedEvent && (
        <div className="screen">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setScreen("home")}
            style={{ marginBottom: 12 }}
          >
            Back
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            {selectedEvent.title}
          </h1>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 4 }}>
            {new Date(selectedEvent.startTime).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {" at "}
            {new Date(selectedEvent.startTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          {selectedEvent.locationName && (
            <div style={{ fontSize: 14, marginBottom: 16 }}>
              {selectedEvent.locationName}
            </div>
          )}

          {selectedEvent.isFree !== undefined && (
            <div style={{ marginBottom: 12 }}>
              <span className={`badge ${selectedEvent.isFree ? "badge-green" : "badge-yellow"}`}>
                {selectedEvent.isFree ? "Free" : selectedEvent.price ? `$${selectedEvent.price}` : "Paid"}
              </span>
              {selectedEvent.source && (
                <span className="category-badge" style={{ marginLeft: 6, textTransform: "capitalize" }}>
                  {selectedEvent.source}
                </span>
              )}
            </div>
          )}

          {selectedEvent.description && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--text-muted)" }}>
                {selectedEvent.description.slice(0, 400)}
                {selectedEvent.description.length > 400 ? "..." : ""}
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

      {/* Schedule Screen */}
      {screen === "schedule" && (
        <div className="screen">
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, letterSpacing: "-0.01em" }}>My Schedule</h1>

          {scheduleLoading ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : schedule.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\uD83D\uDCC5"}</div>
                <div className="empty-state-title">No events scheduled</div>
                <div className="empty-state-text">
                  Browse and RSVP to events to build your schedule!
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setScreen("home")}
                >
                  Browse Events
                </button>
              </div>
            </div>
          ) : (
            schedule.map((s) => (
              <div key={s.id} className="card">
                <div className="card-header">
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{s.event_title}</div>
                    {s.venue_name && <div className="card-subtitle">{s.venue_name}</div>}
                  </div>
                  <span className="time-tag">
                    {new Date(s.starts_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {new Date(s.starts_at).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span className={`badge ${s.rsvp_status === "going" ? "badge-green" : "badge-yellow"}`}>
                    {s.rsvp_status}
                  </span>
                  {s.checked_in ? (
                    <span style={{ color: "var(--green)", fontSize: 12, fontWeight: 600 }}>
                      Checked In
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleScheduleCheckin(s)}
                    >
                      Check In
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Crew Screen */}
      {screen === "crew" && <CrewScreen authed={authed} />}

      {/* Points Screen */}
      {screen === "points" && <PointsScreen authed={authed} />}

      {/* Bottom Navigation */}
      <BottomNav current={screen === "event" ? "home" : screen} onNavigate={navigateTab} />
    </div>
  );
}
