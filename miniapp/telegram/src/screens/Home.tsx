import { useState, useEffect, useMemo } from "react";
import type { Screen } from "../App";
import type { EventResult, FeedItem, CrewInfo, CrewCheckin, CrewMember } from "../api/types";
import { getEvents, getCrews, getCrewMembers } from "../api/client";
import { EventCard, EventCardSkeleton } from "../components/EventCard";

interface Props {
  onNavigate: (s: Screen) => void;
  initialTab?: "discover" | "feed" | "vibes";
}

type HomeTab = "discover" | "feed" | "vibes";

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
  imageUrl?: string;
}

function optimizeImageUrl(url: string | undefined, w = 450, h = 250): string | null {
  if (!url) return null;
  if (url.includes("evbuc.com")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&h=${h}&fit=cover&output=webp&q=75`;
}

function getFeaturedEvents(): FeaturedEvent[] {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed, Feb = 1
  const day = today.getDate();

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
// Date Filter - EthDenver Feb 15-27
// ============================================================================
const ETHDENVER_DATES = (() => {
  const dates: { id: string; label: string; date: Date }[] = [];
  for (let d = 15; d <= 27; d++) {
    const dt = new Date(2026, 1, d);
    const weekday = dt.toLocaleDateString("en-US", { weekday: "short" });
    dates.push({ id: `feb${d}`, label: `${weekday} ${d}`, date: dt });
  }
  return dates;
})();

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

function FeedSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="feed-item">
          <div className="skeleton-circle" style={{ width: 32, height: 32 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-line" style={{ width: "80%", height: 14, marginBottom: 6 }} />
            <div className="skeleton-line" style={{ width: "40%", height: 10 }} />
          </div>
        </div>
      ))}
    </>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getInitial(name?: string, userId?: string): string {
  if (name) return name.charAt(0).toUpperCase();
  if (userId) return userId.replace(/^(telegram_|farcaster_)/, "").charAt(0).toUpperCase();
  return "?";
}

export function Home({ onNavigate, initialTab = "discover" }: Props) {
  const [activeTab, setActiveTab] = useState<HomeTab>(initialTab);
  const [events, setEvents] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeDate, setActiveDate] = useState("any");

  // Feed state
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedLoaded, setFeedLoaded] = useState(false);

  // Vibes state
  const [crewRsvpEventIds, setCrewRsvpEventIds] = useState<Set<string>>(new Set());
  const [vibesLoaded, setVibesLoaded] = useState(false);
  const [vibesLoading, setVibesLoading] = useState(false);

  // Load events with category filter support
  useEffect(() => {
    setLoading(true);
    const cats = activeFilter !== "all" && activeFilter !== "now" ? [activeFilter] : undefined;
    getEvents("Denver", 50, cats)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeFilter]);

  // Load feed when Feed tab is first activated
  useEffect(() => {
    if (activeTab !== "feed" || feedLoaded) return;
    setFeedLoading(true);
    loadFeedData()
      .then(setFeedItems)
      .catch(console.error)
      .finally(() => {
        setFeedLoading(false);
        setFeedLoaded(true);
      });
  }, [activeTab, feedLoaded]);

  // Load vibes crew data when Vibes tab is first activated
  useEffect(() => {
    if (activeTab !== "vibes" || vibesLoaded) return;
    setVibesLoading(true);
    loadVibesData()
      .then(setCrewRsvpEventIds)
      .catch(console.error)
      .finally(() => {
        setVibesLoading(false);
        setVibesLoaded(true);
      });
  }, [activeTab, vibesLoaded]);

  async function loadFeedData(): Promise<FeedItem[]> {
    const items: FeedItem[] = [];
    try {
      const crews = await getCrews();
      if (crews.length === 0) return items;

      const memberResults = await Promise.all(
        crews.map(async (crew: CrewInfo) => {
          try {
            const { members, checkins } = await getCrewMembers(crew.id);
            return { crew, members, checkins };
          } catch {
            return { crew, members: [] as CrewMember[], checkins: [] as CrewCheckin[] };
          }
        }),
      );

      for (const { crew, members, checkins } of memberResults) {
        for (const checkin of checkins) {
          const displayName = checkin.display_name || checkin.user_id.replace(/^(telegram_|farcaster_)/, "@");
          items.push({
            type: "checkin",
            user_id: checkin.user_id,
            display_name: displayName,
            text: `checked in at ${checkin.venue_name}`,
            crew_name: crew.name,
            venue_name: checkin.venue_name,
            created_at: checkin.created_at,
          });
        }

        const recentJoinThreshold = Date.now() - 24 * 60 * 60 * 1000;
        for (const member of members) {
          if (new Date(member.joined_at).getTime() > recentJoinThreshold) {
            const displayName = member.display_name || member.user_id.replace(/^(telegram_|farcaster_)/, "@");
            items.push({
              type: "join",
              user_id: member.user_id,
              display_name: displayName,
              text: `joined ${crew.emoji} ${crew.name}`,
              crew_name: crew.name,
              created_at: member.joined_at,
            });
          }
        }
      }

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
      console.error("Feed load error:", err);
    }
    return items;
  }

  async function loadVibesData(): Promise<Set<string>> {
    const eventIds = new Set<string>();
    try {
      const crews = await getCrews();
      for (const crew of crews) {
        if (crew.event_context) {
          eventIds.add(crew.event_context);
        }
      }
    } catch (err) {
      console.error("Vibes load error:", err);
    }
    return eventIds;
  }

  const now = Date.now();

  // Apply date filter
  const dateFiltered = useMemo(() => {
    if (activeDate === "any") return events;
    return events.filter((e) => {
      const entry = ETHDENVER_DATES.find((d) => d.id === activeDate);
      if (!entry) return true;
      const evStart = new Date(e.startTime);
      return (
        evStart.getFullYear() === entry.date.getFullYear() &&
        evStart.getMonth() === entry.date.getMonth() &&
        evStart.getDate() === entry.date.getDate()
      );
    });
  }, [events, activeDate]);

  const happeningNow = dateFiltered.filter((e) => {
    const start = new Date(e.startTime).getTime();
    const end = e.endTime ? new Date(e.endTime).getTime() : start + 3600000;
    return now >= start && now <= end;
  });

  const upcoming = dateFiltered.filter((e) => new Date(e.startTime).getTime() > now);
  const twoHoursFromNow = now + 2 * 3600000;
  const nextUp = upcoming.filter((e) => new Date(e.startTime).getTime() <= twoHoursFromNow);
  const later = upcoming.filter((e) => new Date(e.startTime).getTime() > twoHoursFromNow);

  const isNowFilter = activeFilter === "now";
  const featured = getFeaturedEvents();

  // Vibes tab data
  const vibesEvents = useMemo(() => {
    const hotNow = events
      .filter((e) => {
        const start = new Date(e.startTime).getTime();
        const end = e.endTime ? new Date(e.endTime).getTime() : start + 3600000;
        return now >= start && now <= end;
      })
      .sort((a, b) => {
        const scoreA = (a.isFree ? 2 : 0) + (a.description ? 1 : 0) + (a.locationName ? 1 : 0);
        const scoreB = (b.isFree ? 2 : 0) + (b.description ? 1 : 0) + (b.locationName ? 1 : 0);
        return scoreB - scoreA;
      });

    const crewPicks = events.filter((e) => crewRsvpEventIds.has(e.id));

    const trendingUpcoming = events
      .filter((e) => new Date(e.startTime).getTime() > now)
      .map((e) => {
        let score = 0;
        if (e.isFree) score += 3;
        if (e.description && e.description.length > 50) score += 2;
        if (e.locationName) score += 1;
        if (e.source === "luma" || e.source === "eventbrite") score += 1;
        return { event: e, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.event);

    return { hotNow, crewPicks, trendingUpcoming };
  }, [events, now, crewRsvpEventIds]);

  const handleTabChange = (tab: HomeTab) => {
    setActiveTab(tab);
    (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  };

  const openUrl = (url: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>FlowB</h1>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>EthDenver - Denver</div>
      </div>

      {/* Top Tabs */}
      <div className="top-tabs">
        <button className={`top-tab ${activeTab === "discover" ? "active" : ""}`} onClick={() => handleTabChange("discover")}>Discover</button>
        <button className={`top-tab ${activeTab === "feed" ? "active" : ""}`} onClick={() => handleTabChange("feed")}>Feed</button>
        <button className={`top-tab ${activeTab === "vibes" ? "active" : ""}`} onClick={() => handleTabChange("vibes")}>Vibes</button>
      </div>

      {/* =================== DISCOVER TAB =================== */}
      {activeTab === "discover" && (
        <>
          {/* Featured Events - Date Aware */}
          {featured.map((feat, i) => (
            <div
              key={i}
              className="featured-card"
              style={{ cursor: "pointer" }}
              onClick={() => openUrl(feat.url)}
            >
              {feat.imageUrl ? (
                <img
                  className="featured-img"
                  src={optimizeImageUrl(feat.imageUrl, 600, 200) || feat.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="featured-img" />
              )}
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
          ))}

          {/* Date Filter Chips */}
          <div className="filter-chips" style={{ marginBottom: 6 }}>
            <button
              className={`filter-chip ${activeDate === "any" ? "active" : ""}`}
              onClick={() => setActiveDate("any")}
            >
              All Days
            </button>
            {ETHDENVER_DATES.map((d) => (
              <button
                key={d.id}
                className={`filter-chip ${activeDate === d.id ? "active" : ""}`}
                onClick={() => setActiveDate(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>

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

          {loading ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : dateFiltered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\uD83D\uDD0D"}</div>
                <div className="empty-state-title">No events found</div>
                <div className="empty-state-text">
                  {activeDate !== "any"
                    ? `No events on ${ETHDENVER_DATES.find((d) => d.id === activeDate)?.label || "that day"}. Try another date!`
                    : activeFilter !== "all"
                    ? `No ${activeFilter} events right now. Try a different filter!`
                    : "No events in Denver right now. Check back soon!"}
                </div>
                {(activeFilter !== "all" || activeDate !== "any") && (
                  <button className="btn btn-secondary" onClick={() => { setActiveFilter("all"); setActiveDate("any"); }}>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {isNowFilter ? (
                happeningNow.length > 0 ? (
                  <>
                    <div className="section-title">Happening Now</div>
                    {happeningNow.map((e) => (
                      <EventCard key={e.id} event={e} onClick={() => onNavigate({ name: "event", id: e.id })} />
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
                        <EventCard key={e.id} event={e} onClick={() => onNavigate({ name: "event", id: e.id })} />
                      ))}
                    </>
                  )}

                  {nextUp.length > 0 && (
                    <>
                      <div className="section-title">Next Up</div>
                      {nextUp.map((e) => (
                        <EventCard key={e.id} event={e} onClick={() => onNavigate({ name: "event", id: e.id })} />
                      ))}
                    </>
                  )}

                  {later.length > 0 && (
                    <>
                      <div className="section-title">Later</div>
                      {later.slice(0, 15).map((e) => (
                        <EventCard key={e.id} event={e} onClick={() => onNavigate({ name: "event", id: e.id })} />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* =================== FEED TAB =================== */}
      {activeTab === "feed" && (
        <>
          {feedLoading ? (
            <div className="card"><FeedSkeleton /></div>
          ) : feedItems.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\uD83D\uDC65"}</div>
                <div className="empty-state-title">No activity yet</div>
                <div className="empty-state-text">Join a crew to see what your friends are up to</div>
                <button className="btn btn-primary" onClick={() => onNavigate({ name: "crew" })}>Find a Crew</button>
              </div>
            </div>
          ) : (
            <div className="card">
              {feedItems.map((item, i) => (
                <div key={`${item.user_id}-${item.created_at}-${i}`} className="feed-item">
                  <div className="feed-avatar">{getInitial(item.display_name, item.user_id)}</div>
                  <div className="feed-content">
                    <div className="feed-text">
                      <strong>{item.display_name || item.user_id.replace(/^(telegram_|farcaster_)/, "@")}</strong>{" "}
                      {item.text}
                      {item.type === "checkin" && (
                        <span className="feed-badge">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                          </svg>
                          here
                        </span>
                      )}
                      {item.type === "join" && (
                        <span className="feed-badge" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--green)" }}>new</span>
                      )}
                    </div>
                    <div className="feed-time">{timeAgo(item.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* =================== VIBES TAB =================== */}
      {activeTab === "vibes" && (
        <>
          {loading || vibesLoading ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : events.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\uD83C\uDF1F"}</div>
                <div className="empty-state-title">No vibes yet</div>
                <div className="empty-state-text">Events will show up here once they start happening</div>
              </div>
            </div>
          ) : (
            <>
              {vibesEvents.hotNow.length > 0 && (
                <>
                  <div className="section-title">Hot Right Now</div>
                  {vibesEvents.hotNow.slice(0, 5).map((e) => (
                    <div key={e.id} style={{ position: "relative" }}>
                      <EventCard event={e} onClick={() => onNavigate({ name: "event", id: e.id })} />
                      <span className="vibe-score-badge">{"\uD83D\uDD25"} LIVE</span>
                    </div>
                  ))}
                </>
              )}

              {vibesEvents.crewPicks.length > 0 && (
                <>
                  <div className="section-title">Your Crew Picks</div>
                  {vibesEvents.crewPicks.slice(0, 5).map((e) => (
                    <div key={e.id} style={{ position: "relative" }}>
                      <EventCard event={e} onClick={() => onNavigate({ name: "event", id: e.id })} />
                      <span className="vibe-score-badge" style={{ background: "rgba(168, 85, 247, 0.12)", color: "var(--purple)" }}>
                        {"\uD83D\uDC65"} crew pick
                      </span>
                    </div>
                  ))}
                </>
              )}

              {vibesEvents.trendingUpcoming.length > 0 && (
                <>
                  <div className="section-title">Trending</div>
                  {vibesEvents.trendingUpcoming.slice(0, 10).map((e, idx) => (
                    <div key={e.id} style={{ position: "relative" }}>
                      <EventCard event={e} onClick={() => onNavigate({ name: "event", id: e.id })} />
                      {idx < 3 && (
                        <span className="vibe-score-badge">
                          {"\uD83D\uDD25"} {idx === 0 ? "top pick" : idx === 1 ? "rising" : "hot"}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )}

              {vibesEvents.hotNow.length === 0 && vibesEvents.crewPicks.length === 0 && vibesEvents.trendingUpcoming.length === 0 && (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state-emoji">{"\uD83C\uDF1F"}</div>
                    <div className="empty-state-title">Vibes incoming</div>
                    <div className="empty-state-text">Events will show up here once they start happening. Check back later!</div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
