import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { EventResult, EventSocial } from "../api/types";
import { getEvent, getEventSocial, rsvpEvent, cancelRsvp } from "../api/client";
import { SponsorModal } from "../components/SponsorModal";

interface Props {
  eventId: string;
  onNavigate: (s: Screen) => void;
}

function optimizeImageUrl(url: string | undefined, w = 600, h = 300): string | null {
  if (!url) return null;
  if (url.includes("evbuc.com")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&h=${h}&fit=cover&output=webp&q=75`;
}

function EventDetailSkeleton() {
  return (
    <div className="screen">
      <div className="skeleton-line" style={{ width: "75%", height: 20, marginBottom: 12 }} />
      <div className="skeleton-line" style={{ width: "55%", height: 14, marginBottom: 8 }} />
      <div className="skeleton-line" style={{ width: "40%", height: 14, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 80, marginBottom: 16 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <div className="skeleton-line" style={{ flex: 1, height: 40, borderRadius: 10 }} />
        <div className="skeleton-line" style={{ width: 80, height: 40, borderRadius: 10 }} />
      </div>
    </div>
  );
}

export function EventDetail({ eventId }: Props) {
  const [event, setEvent] = useState<EventResult | null>(null);
  const [social, setSocial] = useState<EventSocial | null>(null);
  const [flowGoing, setFlowGoing] = useState<string[]>([]);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showSponsor, setShowSponsor] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setShowConfirm(false);
    setRsvpStatus(null);
    Promise.all([
      getEvent(eventId).then((d) => {
        setEvent(d.event);
        setFlowGoing(d.flow.going);
      }),
      getEventSocial(eventId).then(setSocial),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleRsvp = async (status: "going" | "maybe") => {
    try {
      await rsvpEvent(eventId, status);
      setRsvpStatus(status);
      setShowConfirm(true);
      const tg = (window as any).Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error("RSVP failed:", err);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelRsvp(eventId);
      setRsvpStatus(null);
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  };

  const handleShareTelegram = (ev: EventResult) => {
    const tg = (window as any).Telegram?.WebApp;
    const shareUrl = ev.url || `https://t.me/Flow_b_bot?startapp=event_${ev.id}`;
    const text = encodeURIComponent(`I'm going to ${ev.title}! Who's joining? - found on FlowB`);
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleShareX = (ev: EventResult) => {
    const tg = (window as any).Telegram?.WebApp;
    const shareUrl = ev.url || `https://t.me/Flow_b_bot?startapp=event_${ev.id}`;
    const text = encodeURIComponent(`I'm going to ${ev.title}! Who's joining? - found on FlowB`);
    const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`;
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleCopyLink = async (ev: EventResult) => {
    const url = ev.url || `https://t.me/Flow_b_bot?startapp=event_${ev.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
      const tg = (window as any).Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch {}
  };

  if (loading || !event) {
    return <EventDetailSkeleton />;
  }

  const startDate = new Date(event.startTime);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const totalGoing = social?.goingCount || 0;
  const imgUrl = optimizeImageUrl(event.imageUrl);

  return (
    <div className="screen">
      {imgUrl && (
        <img
          src={imgUrl}
          alt=""
          style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12, marginBottom: 12 }}
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{event.title}</h1>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "var(--hint)", marginBottom: 4 }}>
          {dateStr} at {timeStr}
        </div>
        {event.locationName && (
          <div style={{ fontSize: 14, marginBottom: 2 }}>{event.locationName}</div>
        )}
        {event.locationCity && (
          <div style={{ fontSize: 13, color: "var(--hint)" }}>{event.locationCity}</div>
        )}
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {event.isFree !== undefined && (
          <span className={`badge ${event.isFree ? "badge-green" : "badge-yellow"}`}>
            {event.isFree ? "Free" : event.price ? `$${event.price}` : "Paid"}
          </span>
        )}
        {event.source && (
          <span className="category-badge" style={{ textTransform: "capitalize" }}>
            {event.source}
          </span>
        )}
      </div>

      {event.description && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--hint)" }}>
            {event.description.slice(0, 400)}
            {event.description.length > 400 ? "..." : ""}
          </div>
        </div>
      )}

      {/* Social proof */}
      {(totalGoing > 0 || flowGoing.length > 0) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ margin: "0 0 8px" }}>Who's Going</div>
          {flowGoing.length > 0 && (
            <div className="social-proof" style={{ marginBottom: 4 }}>
              {flowGoing.length} from your crew
            </div>
          )}
          {totalGoing > 0 && (
            <div style={{ fontSize: 13, color: "var(--hint)" }}>
              {totalGoing} total going
              {social?.maybeCount ? ` + ${social.maybeCount} maybe` : ""}
            </div>
          )}
        </div>
      )}

      {/* RSVP Confirmation */}
      {showConfirm && (
        <div className="card" style={{ marginBottom: 16, textAlign: "center", padding: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", background: "var(--accent, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px", animation: "rsvpPop 0.4s cubic-bezier(0.34,1.56,0.64,1)"
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="28" height="28">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {rsvpStatus === "going" ? "You're going!" : "Marked as maybe"}
          </div>
          <div style={{ fontSize: 13, color: "var(--hint)", marginBottom: 12, lineHeight: 1.4 }}>
            Added to your schedule. You'll get reminders before it starts.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowConfirm(false)}>
              Done
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { handleCancel(); setShowConfirm(false); }}>
              Undo
            </button>
          </div>
          <style>{`@keyframes rsvpPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      )}

      {/* RSVP buttons */}
      {!showConfirm && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {rsvpStatus === "going" ? (
            <>
              <button className="btn btn-primary btn-block" disabled style={{ opacity: 0.6 }}>
                You're Going!
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
                Cancel
              </button>
            </>
          ) : rsvpStatus === "maybe" ? (
            <>
              <button className="btn btn-secondary btn-block" onClick={() => handleRsvp("going")}>
                Upgrade to Going
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-block" onClick={() => handleRsvp("going")}>
                I'm Going
              </button>
              <button className="btn btn-secondary" onClick={() => handleRsvp("maybe")}>
                Maybe
              </button>
            </>
          )}
        </div>
      )}
      {!showConfirm && !rsvpStatus && (
        <p style={{ fontSize: 11, color: "var(--hint, #888)", margin: "-4px 0 8px", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          This does not register you on Luma
        </p>
      )}

      {/* Share Row: Telegram | X | Copy Link */}
      <div className="share-row">
        <button className="btn btn-secondary share-btn" onClick={() => handleShareTelegram(event)}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ width: 16, height: 16 }}>
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          Telegram
        </button>
        <button className="btn btn-secondary share-btn" onClick={() => handleShareX(event)}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ width: 16, height: 16 }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X
        </button>
        <button className="btn btn-secondary share-btn" onClick={() => handleCopyLink(event)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ width: 16, height: 16 }}>
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {linkCopied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Boost button */}
      <button
        className="btn btn-secondary btn-block"
        onClick={() => setShowSponsor(true)}
        style={{ marginBottom: 16 }}
      >
        Boost this Event
      </button>

      {showSponsor && (
        <SponsorModal
          targetType="event"
          targetId={eventId}
          onClose={() => setShowSponsor(false)}
        />
      )}

      {/* External link */}
      {event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener"
          style={{
            display: "block",
            textAlign: "center",
            color: "var(--link)",
            fontSize: 14,
            padding: 12,
          }}
        >
          View on {event.source}
        </a>
      )}
    </div>
  );
}
