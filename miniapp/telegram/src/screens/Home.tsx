import { useState, useEffect, useMemo } from "react";
import type { Screen } from "../App";
import type { EventResult } from "../api/types";
import { getEvents } from "../api/client";
import { EventCard } from "../components/EventCard";

interface Props {
  onNavigate: (s: Screen) => void;
}

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

export function Home({ onNavigate }: Props) {
  const [events, setEvents] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    getEvents("Denver", 30)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();

  // Filter events based on search and category
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.locationName && e.locationName.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)),
      );
    }

    // Category filter
    if (activeCategory !== "all") {
      filtered = filtered.filter((e) => {
        const text = `${e.title} ${e.description || ""} ${e.source || ""}`.toLowerCase();
        return text.includes(activeCategory);
      });
    }

    return filtered;
  }, [events, searchQuery, activeCategory]);

  // Split events into "happening now" and "upcoming"
  const happeningNow = filteredEvents.filter((e) => {
    const start = new Date(e.startTime).getTime();
    const end = e.endTime ? new Date(e.endTime).getTime() : start + 3600000;
    return now >= start && now <= end;
  });

  const upcoming = filteredEvents.filter((e) => {
    const start = new Date(e.startTime).getTime();
    return start > now;
  });

  // Next 2 hours
  const twoHoursFromNow = now + 2 * 3600000;
  const nextUp = upcoming.filter((e) => new Date(e.startTime).getTime() <= twoHoursFromNow);
  const later = upcoming.filter((e) => new Date(e.startTime).getTime() > twoHoursFromNow);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="screen">
      <div style={{ marginBottom: 16 }}>
        <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>FlowB</h1>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{today} - Denver</div>
      </div>

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
    </div>
  );
}
