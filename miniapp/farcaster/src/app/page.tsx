"use client";

import { useState, useEffect, useCallback } from "react";
import { initFarcaster, quickAuth, composeCast, promptAddMiniApp, isInMiniApp, shareToX, copyToClipboard, openUrl } from "../lib/farcaster";
import { authFarcasterQuick, getEvents, getEvent, rsvpEvent, getSchedule, checkinScheduleEntry, claimPendingPoints, sendChat } from "../api/client";
import { getPendingActions, clearPendingActions } from "../lib/pendingPoints";
import type { EventResult, ScheduleEntry } from "../api/types";
import { EventCard, EventCardSkeleton } from "../components/EventCard";
import { BottomNav } from "../components/BottomNav";
import { CrewScreen } from "../components/CrewScreen";
import { PointsScreen } from "../components/PointsScreen";
import { OnboardingScreen } from "../components/OnboardingScreen";
import { WebLanding } from "../components/WebLanding";
import { FlowBChat } from "../components/FlowBChat";

type Screen = "home" | "event" | "schedule" | "crew" | "points" | "chat";

// ============================================================================
// Featured Events - Date-aware picks for EthDenver Feb 15-27
// ============================================================================
interface FeaturedEvent {
  title: string;
  date: string;
  time: string;
  location: string;
  badge: string;
  url: string;
  isFree: boolean;
}

function getFeaturedEvents(): FeaturedEvent[] {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed, Feb = 1
  const day = today.getDate();

  // Only show during EthDenver range (Feb 15-27)
  if (month !== 1 || day < 15 || day > 27) {
    return getDefaultFeatured();
  }

  const dayEvents: Record<number, FeaturedEvent[]> = {
    15: [
      { title: "Camp BUIDL Kickoff", date: "Sat, Feb 15", time: "10:00 AM - 6:00 PM MT", location: "National Western Center, Denver", badge: "Pre-Event", url: "https://www.ethdenver.com", isFree: true },
    ],
    16: [
      { title: "Camp BUIDL Day 2", date: "Sun, Feb 16", time: "10:00 AM - 6:00 PM MT", location: "National Western Center, Denver", badge: "Pre-Event", url: "https://www.ethdenver.com", isFree: true },
      { title: "Multichain Day", date: "Sun, Feb 16", time: "All Day", location: "Denver, CO", badge: "Side Event", url: "https://www.ethdenver.com", isFree: false },
    ],
    17: [
      { title: "EthDenver Opening Day", date: "Mon, Feb 17", time: "9:00 AM - 10:00 PM MT", location: "National Western Center, Denver", badge: "Main Event", url: "https://www.ethdenver.com", isFree: true },
    ],
    18: [
      { title: "Purple Party", date: "Tue, Feb 18", time: "6:00 - 10:00 PM MT", location: "Kismet Casa, Denver", badge: "Featured", url: "https://lu.ma/qe7f65ue", isFree: true },
    ],
    19: [
      { title: "EthDenver Main Stage", date: "Wed, Feb 19", time: "9:00 AM - 10:00 PM MT", location: "National Western Center, Denver", badge: "Main Event", url: "https://www.ethdenver.com", isFree: true },
    ],
    20: [
      { title: "EthDenver Day 4", date: "Thu, Feb 20", time: "9:00 AM - 10:00 PM MT", location: "National Western Center, Denver", badge: "Main Event", url: "https://www.ethdenver.com", isFree: true },
    ],
    21: [
      { title: "BUIDLathon Awards & Finality Party", date: "Fri, Feb 21", time: "4:00 PM - 2:00 AM MT", location: "National Western Center, Denver", badge: "Closing", url: "https://www.ethdenver.com", isFree: true },
    ],
    22: [
      { title: "SporkDAO Mountain Retreat", date: "Feb 22-27", time: "All Day", location: "Colorado Mountains", badge: "Post-Event", url: "https://www.ethdenver.com", isFree: false },
    ],
  };

  // For days 23-27, reuse mountain retreat
  for (let d = 23; d <= 27; d++) {
    dayEvents[d] = dayEvents[22];
  }

  return dayEvents[day] || getDefaultFeatured();
}

function getDefaultFeatured(): FeaturedEvent[] {
  return [
    { title: "Purple Party", date: "Tue, Feb 18", time: "6:00 - 10:00 PM MT", location: "Kismet Casa, Denver", badge: "Featured", url: "https://lu.ma/qe7f65ue", isFree: true },
  ];
}

// ============================================================================
// Category Filter Options
// ============================================================================
const FILTER_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "now", label: "Happening Now" },
  { id: "hackathon", label: "Hackathon" },
  { id: "defi", label: "DeFi" },
  { id: "ai", label: "AI & Agents" },
  { id: "panels", label: "Panels" },
  { id: "parties", label: "Parties" },
  { id: "workshops", label: "Workshops" },
];

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

  // Category filter
  const [activeFilter, setActiveFilter] = useState("all");

  // Share feedback
  const [linkCopied, setLinkCopied] = useState(false);

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

  // Load events on home — with category filter support
  useEffect(() => {
    if (screen === "home" && !showOnboarding) {
      setEventsLoading(true);
      const cats = activeFilter !== "all" && activeFilter !== "now" ? [activeFilter] : undefined;
      getEvents("Denver", 30, cats)
        .then(setEvents)
        .catch(console.error)
        .finally(() => setEventsLoading(false));
    }
  }, [screen, showOnboarding, activeFilter]);

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

  const handleShareEventFarcaster = (event: EventResult) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://flowb-farcaster.netlify.app";
    composeCast(
      `I'm going to ${event.title}! Who's joining?`,
      [`${appUrl}?event=${event.id}`],
    );
  };

  const handleShareEventX = (event: EventResult) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://flowb-farcaster.netlify.app";
    shareToX(
      `I'm going to ${event.title}! Who's joining? - found on FlowB`,
      event.url || `${appUrl}?event=${event.id}`,
    );
  };

  const handleCopyEventLink = async (event: EventResult) => {
    const url = event.url || `${process.env.NEXT_PUBLIC_APP_URL || "https://flowb-farcaster.netlify.app"}?event=${event.id}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    }
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

  const navigateTab = useCallback((tab: "home" | "schedule" | "crew" | "points" | "chat") => {
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

  // If "Happening Now" filter is active, only show live events
  const isNowFilter = activeFilter === "now";

  // Featured events
  const featured = getFeaturedEvents();

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

          {/* Featured Events - Date Aware */}
          {featured.map((feat, i) => (
            <a
              key={i}
              href={feat.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={(e) => {
                e.preventDefault();
                openUrl(feat.url);
              }}
            >
              <div className="featured-card">
                <div className="featured-img" />
                <div className="featured-body">
                  <span className="featured-badge">{feat.badge}</span>
                  <div className="featured-title">{feat.title}</div>
                  <div className="featured-meta">
                    <div className="featured-meta-row">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {feat.date} &middot; {feat.time}
                    </div>
                    <div className="featured-meta-row">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      {feat.location}
                    </div>
                  </div>
                  <div className="featured-footer">
                    <span className={`badge ${feat.isFree ? "badge-green" : "badge-yellow"}`}>
                      {feat.isFree ? "Free" : "Paid"}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>EthDenver 2026</span>
                  </div>
                </div>
              </div>
            </a>
          ))}

          {/* Category Filter Chips */}
          <div className="filter-chips">
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`filter-chip ${activeFilter === cat.id ? "active" : ""}`}
                onClick={() => setActiveFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

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
                  {activeFilter !== "all"
                    ? `No ${activeFilter} events right now. Try a different filter!`
                    : "No events in Denver right now. Check back soon!"}
                </div>
                {activeFilter !== "all" && (
                  <button className="btn btn-secondary" onClick={() => setActiveFilter("all")}>
                    Show All Events
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* "Happening Now" filter shows only live events */}
              {isNowFilter ? (
                happeningNow.length > 0 ? (
                  <>
                    <div className="section-title">Happening Now</div>
                    {happeningNow.map((e) => (
                      <EventCard key={e.id} event={e} onClick={() => openEvent(e.id)} />
                    ))}
                  </>
                ) : (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-state-emoji">{"\u23F0"}</div>
                      <div className="empty-state-title">Nothing happening right now</div>
                      <div className="empty-state-text">Check back soon or browse upcoming events!</div>
                      <button className="btn btn-secondary" onClick={() => setActiveFilter("all")}>
                        Show All Events
                      </button>
                    </div>
                  </div>
                )
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

          {/* Share Row: Farcaster | X | Copy Link */}
          <div className="share-row">
            <button
              className="btn btn-secondary share-btn"
              onClick={() => handleShareEventFarcaster(selectedEvent)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ width: 16, height: 16 }}>
                <path d="M2 5l7 3v11l-7-3V5zm9 0l7-3v11l-7 3V5zm-2 0v11l-5 2V7l5-2z" />
              </svg>
              Farcaster
            </button>
            <button
              className="btn btn-secondary share-btn"
              onClick={() => handleShareEventX(selectedEvent)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ width: 16, height: 16 }}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X
            </button>
            <button
              className="btn btn-secondary share-btn"
              onClick={() => handleCopyEventLink(selectedEvent)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ width: 16, height: 16 }}>
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {linkCopied ? "Copied!" : "Copy"}
            </button>
          </div>
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

      {/* Chat Screen */}
      {screen === "chat" && <FlowBChat authed={authed} username={username} />}

      {/* Bottom Navigation */}
      <BottomNav current={screen === "event" ? "home" : (screen as any)} onNavigate={navigateTab} />
    </div>
  );
}
