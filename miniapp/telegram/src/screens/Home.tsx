import { useState, useEffect, useMemo } from "react";
import type { Screen } from "../App";
import type { EventResult, FeedItem, CrewInfo, CrewCheckin, CrewMember } from "../api/types";
import { getEvents, getCrews, getCrewMembers } from "../api/client";
import { EventCard } from "../components/EventCard";

interface Props {
  onNavigate: (s: Screen) => void;
}

type HomeTab = "discover" | "feed" | "vibes";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "defi", label: "DeFi" },
  { id: "ai", label: "AI" },
  { id: "social", label: "Social" },
  { id: "nft", label: "NFT" },
  { id: "infra", label: "Infra" },
  { id: "gaming", label: "Gaming" },
  { id: "dao", label: "DAO" },
];

function EventCardSkeleton() {
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

export function Home({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<HomeTab>("discover");
  const [events, setEvents] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Feed state
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedLoaded, setFeedLoaded] = useState(false);

  // Vibes state
  const [crewRsvpEventIds, setCrewRsvpEventIds] = useState<Set<string>>(new Set());
  const [vibesLoaded, setVibesLoaded] = useState(false);
  const [vibesLoading, setVibesLoading] = useState(false);

  // Load events on mount
  useEffect(() => {
    getEvents("Denver", 50)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        // Add check-in feed items
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

        // Add recent member joins as feed items
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

      // Sort by most recent
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
      // For now, we just collect crew context event IDs
      // In the future this could pull crew member RSVPs
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

  // Filter events based on search and category (for Discover tab)
  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.locationName && e.locationName.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)),
      );
    }

    if (activeCategory !== "all") {
      filtered = filtered.filter((e) => {
        const text = `${e.title} ${e.description || ""} ${e.source || ""}`.toLowerCase();
        return text.includes(activeCategory);
      });
    }

    return filtered;
  }, [events, searchQuery, activeCategory]);

  // Split events for Discover tab
  const happeningNow = filteredEvents.filter((e) => {
    const start = new Date(e.startTime).getTime();
    const end = e.endTime ? new Date(e.endTime).getTime() : start + 3600000;
    return now >= start && now <= end;
  });

  const upcoming = filteredEvents.filter((e) => {
    const start = new Date(e.startTime).getTime();
    return start > now;
  });

  const twoHoursFromNow = now + 2 * 3600000;
  const nextUp = upcoming.filter((e) => new Date(e.startTime).getTime() <= twoHoursFromNow);
  const later = upcoming.filter((e) => new Date(e.startTime).getTime() > twoHoursFromNow);

  // Vibes tab data: sorted by social proof (happening now or upcoming, prioritized)
  const vibesEvents = useMemo(() => {
    // "Hot Right Now" = currently happening, sorted by source variety
    const hotNow = events
      .filter((e) => {
        const start = new Date(e.startTime).getTime();
        const end = e.endTime ? new Date(e.endTime).getTime() : start + 3600000;
        return now >= start && now <= end;
      })
      .sort((a, b) => {
        // Prioritize free events and those with more info
        const scoreA = (a.isFree ? 2 : 0) + (a.description ? 1 : 0) + (a.locationName ? 1 : 0);
        const scoreB = (b.isFree ? 2 : 0) + (b.description ? 1 : 0) + (b.locationName ? 1 : 0);
        return scoreB - scoreA;
      });

    // "Your Crew Picks" = events matching crew context or from popular sources
    const crewPicks = events.filter((e) => crewRsvpEventIds.has(e.id));

    // "Trending" = upcoming events sorted by a vibe score
    const trendingUpcoming = events
      .filter((e) => new Date(e.startTime).getTime() > now)
      .map((e) => {
        // Compute a "vibe score" based on attributes
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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const handleTabChange = (tab: HomeTab) => {
    setActiveTab(tab);
    (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  };

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>FlowB</h1>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{today} - Denver</div>
      </div>

      {/* Top Tabs - Segmented Control */}
      <div className="top-tabs">
        <button
          className={`top-tab ${activeTab === "discover" ? "active" : ""}`}
          onClick={() => handleTabChange("discover")}
        >
          Discover
        </button>
        <button
          className={`top-tab ${activeTab === "feed" ? "active" : ""}`}
          onClick={() => handleTabChange("feed")}
        >
          Feed
        </button>
        <button
          className={`top-tab ${activeTab === "vibes" ? "active" : ""}`}
          onClick={() => handleTabChange("vibes")}
        >
          Vibes
        </button>
      </div>

      {/* =================== DISCOVER TAB =================== */}
      {activeTab === "discover" && (
        <>
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

          {/* Search bar */}
          <div className="search-wrapper">
            <span className="search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              className="search-bar"
              type="text"
              placeholder="Search events, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category filter chips */}
          <div className="filter-chips">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`filter-chip ${activeCategory === cat.id ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.id)}
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
          ) : filteredEvents.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\uD83D\uDD0D"}</div>
                <div className="empty-state-title">
                  {searchQuery || activeCategory !== "all" ? "No matching events" : "No events found"}
                </div>
                <div className="empty-state-text">
                  {searchQuery || activeCategory !== "all"
                    ? "Try adjusting your search or filters."
                    : "No events in Denver right now. Check back soon!"}
                </div>
                {(searchQuery || activeCategory !== "all") && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCategory("all");
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {happeningNow.length > 0 && (
                <>
                  <div className="section-title">Happening Now</div>
                  {happeningNow.map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      onClick={() => onNavigate({ name: "event", id: e.id })}
                    />
                  ))}
                </>
              )}

              {nextUp.length > 0 && (
                <>
                  <div className="section-title">Next Up</div>
                  {nextUp.map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      onClick={() => onNavigate({ name: "event", id: e.id })}
                    />
                  ))}
                </>
              )}

              {later.length > 0 && (
                <>
                  <div className="section-title">Later</div>
                  {later.slice(0, 15).map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      onClick={() => onNavigate({ name: "event", id: e.id })}
                    />
                  ))}
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
            <FeedSkeleton />
          ) : feedItems.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\uD83D\uDC65"}</div>
                <div className="empty-state-title">No activity yet</div>
                <div className="empty-state-text">
                  Join a crew to see what your friends are up to
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => onNavigate({ name: "crew" })}
                >
                  Find a Crew
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              {feedItems.map((item, i) => (
                <div key={`${item.user_id}-${item.created_at}-${i}`} className="feed-item">
                  <div className="feed-avatar">
                    {getInitial(item.display_name, item.user_id)}
                  </div>
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
                        <span className="feed-badge" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--green)" }}>
                          new
                        </span>
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
                <div className="empty-state-text">
                  Events will show up here once they start happening
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Hot Right Now */}
              {vibesEvents.hotNow.length > 0 && (
                <>
                  <div className="section-title">Hot Right Now</div>
                  {vibesEvents.hotNow.slice(0, 5).map((e) => (
                    <div key={e.id} style={{ position: "relative" }}>
                      <EventCard
                        event={e}
                        onClick={() => onNavigate({ name: "event", id: e.id })}
                      />
                      <span className="vibe-score-badge">
                        {"\uD83D\uDD25"} LIVE
                      </span>
                    </div>
                  ))}
                </>
              )}

              {/* Your Crew Picks */}
              {vibesEvents.crewPicks.length > 0 && (
                <>
                  <div className="section-title">Your Crew Picks</div>
                  {vibesEvents.crewPicks.slice(0, 5).map((e) => (
                    <div key={e.id} style={{ position: "relative" }}>
                      <EventCard
                        event={e}
                        onClick={() => onNavigate({ name: "event", id: e.id })}
                      />
                      <span className="vibe-score-badge" style={{ background: "rgba(168, 85, 247, 0.12)", color: "var(--purple)" }}>
                        {"\uD83D\uDC65"} crew pick
                      </span>
                    </div>
                  ))}
                </>
              )}

              {/* Trending Upcoming */}
              {vibesEvents.trendingUpcoming.length > 0 && (
                <>
                  <div className="section-title">Trending</div>
                  {vibesEvents.trendingUpcoming.slice(0, 10).map((e, idx) => (
                    <div key={e.id} style={{ position: "relative" }}>
                      <EventCard
                        event={e}
                        onClick={() => onNavigate({ name: "event", id: e.id })}
                      />
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
                    <div className="empty-state-text">
                      Events will show up here once they start happening. Check back later!
                    </div>
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
