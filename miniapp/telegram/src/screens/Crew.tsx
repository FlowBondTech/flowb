import { useState, useEffect, useRef } from "react";
import type { Screen } from "../App";
import type { CrewInfo, CrewMember, CrewCheckin, LeaderboardEntry, DiscoveredCrew, CrewActivity, CrewMessage, CrewLocation, QRLocation } from "../api/types";
import {
  getCrews, getCrewMembers, crewCheckin, joinCrew, createCrew, getCrewLeaderboard,
  leaveCrew, discoverCrews, removeMember, updateMemberRole, updateCrew, getCrewActivity,
  getCrewMessages, sendCrewMessage,
  resolveLocation, qrCheckin, getCrewLocations, pingCrewLocate,
  proximityCheckin,
} from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "../hooks/useLocation";
import { CrewMap } from "../components/CrewMap";
import { SponsorModal } from "../components/SponsorModal";

interface Props {
  crewId?: string;
  checkinCode?: string;
  onNavigate: (s: Screen) => void;
}

interface Mission {
  id: string;
  title: string;
  current: number;
  target: number;
  bonus: number;
}

function getMissions(memberCount: number, checkinCount: number): Mission[] {
  return [
    { id: "recruit", title: "Recruit 5 crew members", current: Math.min(memberCount, 5), target: 5, bonus: 50 },
    { id: "checkin", title: "10 crew check-ins", current: Math.min(checkinCount, 10), target: 10, bonus: 30 },
    { id: "events", title: "Attend 3 events together", current: 0, target: 3, bonus: 75 },
    { id: "streak", title: "3-day crew streak", current: 0, target: 3, bonus: 40 },
  ];
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry & { sponsor_boost?: number; effective_points?: number }; rank: number }) {
  const rankClass = rank <= 3 ? `leaderboard-rank-${rank}` : "";
  const crownIcons: Record<number, string> = { 1: "\uD83D\uDC51", 2: "\uD83E\uDD48", 3: "\uD83E\uDD49" };
  const displayPoints = entry.effective_points || entry.total_points;

  return (
    <div className="leaderboard-row">
      <div className={`leaderboard-rank ${rankClass}`}>
        {crownIcons[rank] || rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="leaderboard-name">
          {entry.display_name || entry.user_id.replace(/^(telegram_|farcaster_)/, "@")}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {entry.current_streak > 0 && (
            <div className="leaderboard-meta">
              {"\uD83D\uDD25"} {entry.current_streak} day streak
            </div>
          )}
          {entry.sponsor_boost != null && entry.sponsor_boost > 0 && (
            <div className="leaderboard-meta" style={{ color: "var(--purple)" }}>
              +{entry.sponsor_boost} boost
            </div>
          )}
        </div>
      </div>
      <div className="leaderboard-points">{displayPoints}</div>
    </div>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  const pct = Math.min((mission.current / mission.target) * 100, 100);
  const complete = mission.current >= mission.target;

  return (
    <div className="mission-card">
      <div className="mission-header">
        <span className="mission-title">{mission.title}</span>
        <span className="mission-bonus">+{mission.bonus}</span>
      </div>
      {complete ? (
        <div className="mission-complete">Completed!</div>
      ) : (
        <div className="mission-progress-row">
          <div className="progress-bar" style={{ flex: 1 }}>
            <div
              className="progress-fill progress-fill-green"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="mission-progress-text">
            {mission.current}/{mission.target}
          </span>
        </div>
      )}
    </div>
  );
}

function SkeletonMembers() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="member-row">
          <div className="skeleton-circle" />
          <div style={{ flex: 1 }}>
            <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
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

function formatChatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  const colors = [
    "linear-gradient(135deg, #3b82f6, #a855f7)",
    "linear-gradient(135deg, #22c55e, #06b6d4)",
    "linear-gradient(135deg, #f97316, #ef4444)",
    "linear-gradient(135deg, #eab308, #f97316)",
    "linear-gradient(135deg, #a855f7, #ec4899)",
    "linear-gradient(135deg, #06b6d4, #3b82f6)",
    "linear-gradient(135deg, #ec4899, #f43f5e)",
    "linear-gradient(135deg, #14b8a6, #22c55e)",
  ];
  return colors[Math.abs(hash) % colors.length];
}

interface CrewChatProps {
  crewId: string;
  currentUserId: string;
}

function CrewChat({ crewId, currentUserId }: CrewChatProps) {
  const [messages, setMessages] = useState<CrewMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load initial messages
  useEffect(() => {
    setChatLoading(true);
    getCrewMessages(crewId, 20)
      .then((msgs) => {
        setMessages(msgs.reverse());
        setTimeout(scrollToBottom, 100);
      })
      .catch(console.error)
      .finally(() => setChatLoading(false));
  }, [crewId]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const msgs = await getCrewMessages(crewId, 20);
        setMessages((prev) => {
          const reversed = msgs.reverse();
          if (reversed.length !== prev.length || (reversed.length > 0 && prev.length > 0 && reversed[reversed.length - 1].id !== prev[prev.length - 1].id)) {
            setTimeout(scrollToBottom, 100);
            return reversed;
          }
          return prev;
        });
      } catch {
        // Silently fail polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [crewId]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;
    const text = messageText.trim();
    setMessageText("");
    setSending(true);
    try {
      const newMsg = await sendCrewMessage(crewId, text);
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(scrollToBottom, 100);
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    } catch (err) {
      console.error("Send message failed:", err);
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-section">
      <div className="section-title">Crew Chat</div>
      <div className="card" style={{ padding: 12 }}>
        {chatLoading ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-dim)", fontSize: 13 }}>
            <div className="spinner" style={{ margin: "0 auto 8px" }} />
            Loading chat...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-dim)", fontSize: 13 }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="chat-messages" ref={chatContainerRef}>
            {messages.map((msg) => {
              const isOwn = msg.user_id === currentUserId;
              const displayName = msg.display_name || msg.user_id.replace(/^(telegram_|farcaster_)/, "@");
              const initial = displayName.charAt(0).toUpperCase();

              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                  {!isOwn && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: getAvatarColor(msg.user_id),
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initial}
                      </div>
                      <span className="chat-sender">{displayName}</span>
                    </div>
                  )}
                  <div className={`chat-bubble ${isOwn ? "chat-bubble-own" : "chat-bubble-other"}`}>
                    {msg.message}
                  </div>
                  <div className="chat-time">{formatChatTime(msg.created_at)}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
        <div className="chat-input-bar">
          <input
            className="input"
            type="text"
            placeholder="Message your crew..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!messageText.trim() || sending}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Crew({ crewId, checkinCode }: Props) {
  const { user } = useAuth();
  const currentUserId = user?.id || "";
  const gps = useLocation();

  const [crews, setCrews] = useState<CrewInfo[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewInfo | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [checkins, setCheckins] = useState<CrewCheckin[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<CrewActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showEditCrew, setShowEditCrew] = useState(false);
  const [showMemberAction, setShowMemberAction] = useState<CrewMember | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [discoveredCrews, setDiscoveredCrews] = useState<DiscoveredCrew[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [checkinVenue, setCheckinVenue] = useState("");
  const [showCheckin, setShowCheckin] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Location & QR checkin state
  const [crewLocations, setCrewLocations] = useState<CrewLocation[]>([]);
  const [showMapView, setShowMapView] = useState(false);
  const [qrLocation, setQrLocation] = useState<QRLocation | null>(null);
  const [showQrCheckin, setShowQrCheckin] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<"here" | "heading" | "leaving">("here");
  const [checkinMessage, setCheckinMessage] = useState("");
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [locatePinging, setLocatePinging] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState<string | null>(null);
  const [proximityToast, setProximityToast] = useState<string | null>(null);

  const tg = (window as any).Telegram?.WebApp;
  const isAdmin = selectedCrew && ["admin", "creator"].includes(selectedCrew.role);

  // Handle QR deep link: resolve location and show auto-checkin
  useEffect(() => {
    if (!checkinCode) return;
    resolveLocation(checkinCode)
      .then((loc) => {
        setQrLocation(loc);
        setShowQrCheckin(true);
      })
      .catch(console.error);
  }, [checkinCode]);

  // Poll crew locations every 60s
  useEffect(() => {
    if (!selectedCrew) return;
    const fetchLocations = () => {
      getCrewLocations(selectedCrew.id).then(setCrewLocations).catch(() => {});
    };
    fetchLocations();
    const interval = setInterval(fetchLocations, 60000);
    return () => clearInterval(interval);
  }, [selectedCrew]);

  // Auto proximity checkin every 60s when GPS is active
  useEffect(() => {
    if (!gps.location || !selectedCrew) return;
    const doProximity = async () => {
      try {
        const result = await proximityCheckin(
          gps.location!.latitude,
          gps.location!.longitude,
          selectedCrew.id,
        );
        if (result.matched.length > 0) {
          const names = result.matched.map((m) => m.name).join(", ");
          setProximityToast(`Checked in at ${names}!`);
          setTimeout(() => setProximityToast(null), 4000);
          tg?.HapticFeedback?.notificationOccurred("success");
          // Refresh locations
          getCrewLocations(selectedCrew.id).then(setCrewLocations).catch(() => {});
        }
      } catch {}
    };
    doProximity();
    const interval = setInterval(doProximity, 60000);
    return () => clearInterval(interval);
  }, [gps.location?.latitude, gps.location?.longitude, selectedCrew?.id]);

  // Load crews
  useEffect(() => {
    getCrews()
      .then((c) => {
        setCrews(c);
        if (crewId) {
          const match = c.find((cr) => cr.id === crewId || cr.join_code === crewId);
          if (match) setSelectedCrew(match);
        } else if (c.length >= 1) {
          setSelectedCrew(c[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [crewId]);

  // Load members + leaderboard when crew selected
  useEffect(() => {
    if (!selectedCrew) return;
    setMembersLoading(true);
    Promise.all([
      getCrewMembers(selectedCrew.id).then(({ members: m, checkins: c }) => {
        setMembers(m);
        setCheckins(c);
      }),
      getCrewLeaderboard(selectedCrew.id).then(setLeaderboard),
    ])
      .catch(console.error)
      .finally(() => setMembersLoading(false));
  }, [selectedCrew]);

  const handleCreate = async () => {
    if (!newCrewName.trim()) return;
    try {
      await createCrew(newCrewName.trim());
      setShowCreate(false);
      setNewCrewName("");
      const c = await getCrews();
      setCrews(c);
      if (c.length) setSelectedCrew(c[c.length - 1]);
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinCrew(joinCode.trim());
      setShowJoin(false);
      setJoinCode("");
      const c = await getCrews();
      setCrews(c);
      if (c.length) setSelectedCrew(c[c.length - 1]);
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err: any) {
      console.error(err);
      tg?.showAlert?.(err.message?.includes("Invalid") ? "Invalid invite code. Check with your crew admin." : "Failed to join crew. Try again.");
    }
  };

  const handleJoinDiscovered = async (crew: DiscoveredCrew) => {
    try {
      // Use join_code (not id) - the backend matches against join_code
      await joinCrew(crew.join_code || crew.id);
      setShowDiscover(false);
      const c = await getCrews();
      setCrews(c);
      const joined = c.find((cr) => cr.id === crew.id);
      if (joined) setSelectedCrew(joined);
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err: any) {
      console.error(err);
      tg?.showAlert?.("Failed to join crew. Try again or ask for an invite code.");
    }
  };

  const handleCheckin = async () => {
    if (!checkinVenue.trim() || !selectedCrew) return;
    try {
      await crewCheckin(selectedCrew.id, checkinVenue.trim(), {
        status: checkinStatus,
        message: checkinMessage.trim() || undefined,
        ...(gpsEnabled && gps.location ? { latitude: gps.location.latitude, longitude: gps.location.longitude } : {}),
      } as any);
      setShowCheckin(false);
      setCheckinVenue("");
      setCheckinStatus("here");
      setCheckinMessage("");
      const { checkins: c } = await getCrewMembers(selectedCrew.id);
      setCheckins(c);
      getCrewLocations(selectedCrew.id).then(setCrewLocations).catch(() => {});
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleQrCheckin = async () => {
    if (!qrLocation) return;
    try {
      await qrCheckin(qrLocation.code, selectedCrew?.id);
      setShowQrCheckin(false);
      setQrLocation(null);
      // Refresh checkins
      if (selectedCrew) {
        const { checkins: c } = await getCrewMembers(selectedCrew.id);
        setCheckins(c);
        getCrewLocations(selectedCrew.id).then(setCrewLocations).catch(() => {});
      }
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleFindCrew = async () => {
    if (!selectedCrew || locatePinging) return;
    setLocatePinging(true);
    try {
      const result = await pingCrewLocate(selectedCrew.id);
      tg?.HapticFeedback?.notificationOccurred("success");
      tg?.showAlert?.(`Pinged ${result.pinged} crew member${result.pinged !== 1 ? "s" : ""}!`);
    } catch (err) {
      console.error(err);
    } finally {
      setLocatePinging(false);
    }
  };

  const handleLeaveCrew = async () => {
    if (!selectedCrew) return;
    try {
      await leaveCrew(selectedCrew.id);
      setShowLeaveConfirm(false);
      const c = await getCrews();
      setCrews(c);
      setSelectedCrew(c.length ? c[0] : null);
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (member: CrewMember) => {
    if (!selectedCrew) return;
    try {
      await removeMember(selectedCrew.id, member.user_id);
      setShowMemberAction(null);
      const { members: m, checkins: c } = await getCrewMembers(selectedCrew.id);
      setMembers(m);
      setCheckins(c);
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromoteDemote = async (member: CrewMember) => {
    if (!selectedCrew) return;
    const newRole = member.role === "admin" ? "member" : "admin";
    try {
      await updateMemberRole(selectedCrew.id, member.user_id, newRole);
      setShowMemberAction(null);
      const { members: m, checkins: c } = await getCrewMembers(selectedCrew.id);
      setMembers(m);
      setCheckins(c);
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCrew = async () => {
    if (!selectedCrew) return;
    const updates: any = {};
    if (editName.trim() && editName.trim() !== selectedCrew.name) updates.name = editName.trim();
    if (editEmoji.trim() && editEmoji.trim() !== selectedCrew.emoji) updates.emoji = editEmoji.trim();
    if (editDescription !== (selectedCrew.description || "")) updates.description = editDescription;
    if (!Object.keys(updates).length) { setShowEditCrew(false); return; }
    try {
      await updateCrew(selectedCrew.id, updates);
      setShowEditCrew(false);
      const c = await getCrews();
      setCrews(c);
      const updated = c.find((cr) => cr.id === selectedCrew.id);
      if (updated) setSelectedCrew(updated);
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDiscover = async () => {
    setShowDiscover(true);
    setDiscoverLoading(true);
    try {
      const d = await discoverCrews();
      setDiscoveredCrews(d as DiscoveredCrew[]);
    } catch (err) {
      console.error(err);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleOpenActivity = async () => {
    if (!selectedCrew) return;
    setShowActivity(true);
    try {
      const a = await getCrewActivity(selectedCrew.id);
      setActivity(a as CrewActivity[]);
    } catch (err) {
      console.error(err);
    }
  };

  const shareCrewLink = () => {
    if (!selectedCrew) return;
    const botUsername = "Flow_b_bot";
    const link = `https://t.me/${botUsername}?startapp=crew_${selectedCrew.join_code}`;
    tg?.openTelegramLink?.(
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
        `Join my crew ${selectedCrew.emoji} ${selectedCrew.name} on FlowB!`,
      )}`,
    );
  };

  if (loading) {
    return (
      <div className="screen">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Crew</h1>
        <SkeletonMembers />
      </div>
    );
  }

  // No crews yet
  if (crews.length === 0 && !crewId) {
    return (
      <div className="screen">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Crew</h1>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">{"\uD83D\uDC65"}</div>
            <div className="empty-state-title">No crews yet</div>
            <div className="empty-state-text">
              Create a crew to coordinate with friends at EthDenver
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                Create Crew
              </button>
              <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
                Join Crew
              </button>
              <button className="btn btn-secondary" onClick={handleOpenDiscover}>
                Discover
              </button>
            </div>
          </div>
        </div>

        {renderCreateModal()}
        {renderJoinModal()}
        {renderDiscoverModal()}
      </div>
    );
  }

  const missions = getMissions(members.length, checkins.length);

  // Crew detail view
  return (
    <div className="screen">
      {/* Crew selector if multiple */}
      {crews.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
          {crews.map((c) => (
            <button
              key={c.id}
              className={`btn btn-sm ${selectedCrew?.id === c.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelectedCrew(c)}
            >
              {c.emoji} {c.name}
            </button>
          ))}
          <button className="btn btn-sm btn-secondary" onClick={() => setShowCreate(true)}>+</button>
        </div>
      )}

      {selectedCrew && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700 }}>
                {selectedCrew.emoji} {selectedCrew.name}
              </h1>
              <div style={{ fontSize: 13, color: "var(--hint)" }}>
                {members.length} members
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-sm btn-secondary" onClick={shareCrewLink}>
                Share
              </button>
              {isAdmin && (
                <button className="btn btn-sm btn-secondary" onClick={() => {
                  setEditName(selectedCrew.name);
                  setEditEmoji(selectedCrew.emoji);
                  setEditDescription(selectedCrew.description || "");
                  setShowEditCrew(true);
                }}>
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Crew Locations - Where is everyone? */}
          {crewLocations.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="section-title" style={{ margin: "20px 0 10px" }}>Where is everyone?</div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowMapView(!showMapView)}
                  style={{ fontSize: 11 }}
                >
                  {showMapView ? "List" : "Map"}
                </button>
              </div>

              {showMapView ? (
                <CrewMap locations={crewLocations} />
              ) : (
                <div className="card">
                  {/* Group by venue */}
                  {Object.entries(
                    crewLocations.reduce((acc, loc) => {
                      const key = loc.venue_name;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(loc);
                      return acc;
                    }, {} as Record<string, CrewLocation[]>)
                  ).map(([venue, locs]) => (
                    <div key={venue} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                          {venue}
                        </div>
                        {locs[0]?.latitude && (
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: 10, padding: "2px 8px", background: "rgba(168, 85, 247, 0.1)", color: "var(--purple)", border: "1px solid rgba(168, 85, 247, 0.2)" }}
                            onClick={(e) => { e.stopPropagation(); setShowSponsorModal(venue); }}
                          >
                            Boost
                          </button>
                        )}
                      </div>
                      {locs.map((loc, i) => (
                        <div key={i} className="member-row" style={{ paddingLeft: 8 }}>
                          <span className={`status-dot status-${loc.status}`} />
                          <div style={{ flex: 1 }}>
                            <div className="member-name">
                              {loc.display_name || loc.user_id.replace(/^(telegram_|farcaster_)/, "@")}
                            </div>
                            <div className="member-status">
                              {loc.status === "here" ? "Here" : loc.status === "heading" ? "Heading" : "Leaving"}
                              {loc.message && ` - "${loc.message}"`}
                              {" \u00b7 "}{timeAgo(loc.created_at)}
                            </div>
                          </div>
                          {loc.latitude && loc.longitude && (
                            <a
                              href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: 10, padding: "4px 8px" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Nav
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Find my crew button */}
              {members.length > crewLocations.length + 1 && (
                <button
                  className="btn btn-secondary btn-block"
                  onClick={handleFindCrew}
                  disabled={locatePinging}
                  style={{ marginBottom: 12 }}
                >
                  {locatePinging ? "Pinging..." : "Find My Crew"}
                </button>
              )}
            </>
          )}

          {/* Find my crew when nobody checked in */}
          {crewLocations.length === 0 && members.length > 1 && (
            <button
              className="btn btn-secondary btn-block"
              onClick={handleFindCrew}
              disabled={locatePinging}
              style={{ marginTop: 12 }}
            >
              {locatePinging ? "Pinging..." : "Where is My Crew?"}
            </button>
          )}

          {/* Active checkins */}
          {checkins.length > 0 && (
            <>
              <div className="section-title">Right Now</div>
              {checkins.map((c, i) => (
                <div key={i} className="member-row">
                  <span className={`status-dot status-${c.status}`} />
                  <div style={{ flex: 1 }}>
                    <div className="member-name">{c.display_name || c.user_id.replace(/^(telegram_|farcaster_)/, "@")}</div>
                    <div className="member-status">
                      {c.status === "here" ? "At" : c.status === "heading" ? "Heading to" : "Leaving"}{" "}
                      {c.venue_name}
                      {c.message && ` - "${c.message}"`}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Crew Leaderboard */}
          {leaderboard.length > 0 && (
            <>
              <div className="section-title">Crew Leaderboard</div>
              <div className="card">
                {leaderboard.map((entry, i) => (
                  <LeaderboardRow key={entry.user_id} entry={entry} rank={i + 1} />
                ))}
              </div>
            </>
          )}

          {/* Crew Missions */}
          <div className="section-title">Crew Missions</div>
          {missions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}

          {/* Members */}
          <div className="section-title">Members ({members.length})</div>
          {membersLoading ? (
            <div className="card"><SkeletonMembers /></div>
          ) : (
            <div className="card">
              {members.map((m) => {
                const checkin = checkins.find((c) => c.user_id === m.user_id);
                return (
                  <div
                    key={m.user_id}
                    className="member-row"
                    onClick={isAdmin && m.role !== "creator" ? () => setShowMemberAction(m) : undefined}
                    style={isAdmin && m.role !== "creator" ? { cursor: "pointer" } : undefined}
                  >
                    <div className="avatar">{(m.display_name || m.user_id).charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div className="member-name">
                        {m.display_name || m.user_id.replace(/^(telegram_|farcaster_)/, "@")}
                        {m.role === "creator" && <span style={{ color: "var(--purple)", fontSize: 11 }}> creator</span>}
                        {m.role === "admin" && <span style={{ color: "var(--accent)", fontSize: 11 }}> admin</span>}
                      </div>
                      {checkin && (
                        <div className="member-status">
                          <span className={`status-dot status-${checkin.status}`} />
                          {checkin.venue_name}
                        </div>
                      )}
                    </div>
                    {isAdmin && m.role !== "creator" && (
                      <span style={{ color: "var(--hint)", fontSize: 14 }}>{"\u203A"}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Crew Chat */}
          <CrewChat crewId={selectedCrew.id} currentUserId={currentUserId} />

          {/* Activity feed link */}
          <button
            className="btn btn-secondary btn-block"
            onClick={handleOpenActivity}
            style={{ marginTop: 12 }}
          >
            View Activity History
          </button>

          {/* Check in button */}
          <div style={{ marginTop: 12 }}>
            {showCheckin ? (
              <div className="card">
                <input
                  className="input"
                  type="text"
                  placeholder="Where are you? (venue name)"
                  value={checkinVenue}
                  onChange={(e) => setCheckinVenue(e.target.value)}
                  style={{ marginBottom: 8 }}
                  autoFocus
                />
                {/* Status picker */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {(["here", "heading", "leaving"] as const).map((s) => (
                    <button
                      key={s}
                      className={`btn btn-sm ${checkinStatus === s ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setCheckinStatus(s)}
                      style={{ flex: 1, textTransform: "capitalize" }}
                    >
                      <span className={`status-dot status-${s}`} style={{ marginRight: 4 }} />
                      {s}
                    </button>
                  ))}
                </div>
                {/* Optional message */}
                <input
                  className="input"
                  type="text"
                  placeholder="Message (optional)"
                  value={checkinMessage}
                  onChange={(e) => setCheckinMessage(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                {/* GPS toggle */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", marginBottom: 8,
                    background: "var(--bg-surface)", borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)", cursor: "pointer",
                  }}
                  onClick={() => {
                    if (!gpsEnabled) {
                      gps.requestLocation();
                    }
                    setGpsEnabled(!gpsEnabled);
                  }}
                >
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: gpsEnabled ? "var(--green)" : "var(--border)",
                    position: "relative", transition: "background 0.2s",
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      background: "#fff", position: "absolute", top: 2,
                      left: gpsEnabled ? 18 : 2, transition: "left 0.2s",
                    }} />
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Share GPS location
                  </span>
                  {gps.loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-block" onClick={handleCheckin}>
                    Check In
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setShowCheckin(false); setCheckinStatus("here"); setCheckinMessage(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-primary btn-block"
                onClick={() => setShowCheckin(true)}
              >
                Check In Here
              </button>
            )}
          </div>

          {/* Discover + Leave buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-secondary btn-block" onClick={handleOpenDiscover}>
              Discover Crews
            </button>
            <button
              className="btn btn-block"
              style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--red)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
              onClick={() => setShowLeaveConfirm(true)}
            >
              Leave Crew
            </button>
          </div>
        </>
      )}

      {renderCreateModal()}
      {renderJoinModal()}
      {renderDiscoverModal()}
      {renderLeaveConfirmModal()}
      {renderEditCrewModal()}
      {renderMemberActionModal()}
      {renderActivityModal()}
      {renderQrCheckinModal()}

      {/* Sponsor modal for boosting a location */}
      {showSponsorModal && (
        <SponsorModal
          targetType="location"
          targetId={showSponsorModal}
          onClose={() => setShowSponsorModal(null)}
          onSuccess={() => setShowSponsorModal(null)}
        />
      )}

      {/* Proximity auto-checkin toast */}
      {proximityToast && (
        <div style={{
          position: "fixed",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--green)",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: "var(--radius-pill)",
          fontSize: 13,
          fontWeight: 600,
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          animation: "fadeIn 0.3s ease",
        }}>
          {proximityToast}
        </div>
      )}
    </div>
  );

  function renderCreateModal() {
    if (!showCreate) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowCreate(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Create Crew</h2>
            <input
              className="input"
              type="text"
              placeholder="Crew name (e.g. DeFi Squad)"
              value={newCrewName}
              onChange={(e) => setNewCrewName(e.target.value)}
              style={{ marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-block" onClick={handleCreate}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderJoinModal() {
    if (!showJoin) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowJoin(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Join Crew</h2>
            <input
              className="input"
              type="text"
              placeholder="Enter crew invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{ marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-block" onClick={handleJoin}>Join</button>
              <button className="btn btn-secondary" onClick={() => setShowJoin(false)}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderDiscoverModal() {
    if (!showDiscover) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowDiscover(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Discover Crews</h2>
            {discoverLoading ? (
              <SkeletonMembers />
            ) : discoveredCrews.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--hint)", padding: 16, fontSize: 14 }}>
                No public crews available yet. Be the first to create one!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {discoveredCrews.map((dc) => {
                  const alreadyJoined = crews.some((c) => c.id === dc.id);
                  return (
                    <div key={dc.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", background: "var(--bg-surface)",
                      borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                    }}>
                      <span style={{ fontSize: 20 }}>{dc.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{dc.name}</div>
                        <div style={{ fontSize: 12, color: "var(--hint)" }}>
                          {dc.member_count} member{dc.member_count !== 1 ? "s" : ""}
                          {dc.description && ` - ${dc.description}`}
                        </div>
                      </div>
                      {alreadyJoined ? (
                        <span style={{ fontSize: 12, color: "var(--green)" }}>Joined</span>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleJoinDiscovered(dc)}
                        >
                          Join
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <button
              className="btn btn-secondary btn-block"
              onClick={() => setShowDiscover(false)}
              style={{ marginTop: 12 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderLeaveConfirmModal() {
    if (!showLeaveConfirm || !selectedCrew) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{selectedCrew.emoji}</div>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Leave {selectedCrew.name}?</h2>
            <p style={{ fontSize: 14, color: "var(--hint)", marginBottom: 16 }}>
              You'll need a new invite code to rejoin.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-block" onClick={() => setShowLeaveConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-block"
                style={{ background: "var(--red)", color: "#fff" }}
                onClick={handleLeaveCrew}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderEditCrewModal() {
    if (!showEditCrew || !selectedCrew) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowEditCrew(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Edit Crew</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                className="input"
                type="text"
                placeholder="Emoji"
                value={editEmoji}
                onChange={(e) => setEditEmoji(e.target.value)}
                style={{ width: 60, textAlign: "center" }}
              />
              <input
                className="input"
                type="text"
                placeholder="Crew name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <input
              className="input"
              type="text"
              placeholder="Description (optional)"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-block" onClick={handleEditCrew}>Save</button>
              <button className="btn btn-secondary" onClick={() => setShowEditCrew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderMemberActionModal() {
    if (!showMemberAction || !selectedCrew) return null;
    const m = showMemberAction;
    const displayName = m.display_name || m.user_id.replace(/^(telegram_|farcaster_)/, "@");

    return (
      <div className="modal-overlay" onClick={() => setShowMemberAction(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>{displayName}</h2>
            <div style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
              Role: {m.role}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-secondary btn-block" onClick={() => handlePromoteDemote(m)}>
                {m.role === "admin" ? "Demote to Member" : "Promote to Admin"}
              </button>
              <button
                className="btn btn-block"
                style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--red)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                onClick={() => handleRemoveMember(m)}
              >
                Remove from Crew
              </button>
              <button className="btn btn-secondary btn-block" onClick={() => setShowMemberAction(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderQrCheckinModal() {
    if (!showQrCheckin || !qrLocation) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowQrCheckin(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{"\uD83D\uDCCD"}</div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>{qrLocation.name}</h2>
            {qrLocation.description && (
              <p style={{ fontSize: 13, color: "var(--hint)", marginBottom: 4 }}>{qrLocation.description}</p>
            )}
            {(qrLocation.floor || qrLocation.zone) && (
              <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
                {[qrLocation.floor, qrLocation.zone].filter(Boolean).join(" \u00b7 ")}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-primary btn-block" onClick={handleQrCheckin}>
                Check In Here (+10 pts)
              </button>
              <button className="btn btn-secondary btn-block" onClick={() => setShowQrCheckin(false)}>
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderActivityModal() {
    if (!showActivity || !selectedCrew) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowActivity(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Activity</h2>
            {activity.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--hint)", padding: 16, fontSize: 14 }}>
                No activity yet. Check in somewhere to get started!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                {activity.map((a, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 0", borderBottom: i < activity.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <span className={`status-dot status-${a.status}`} style={{ marginTop: 4 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {a.display_name || a.user_id.replace(/^(telegram_|farcaster_)/, "@")}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--hint)" }}>
                        {a.status === "here" ? "At" : a.status === "heading" ? "Heading to" : "Left"}{" "}
                        {a.venue_name}
                        {a.message && ` - "${a.message}"`}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {timeAgo(a.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-secondary btn-block"
              onClick={() => setShowActivity(false)}
              style={{ marginTop: 12 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
}
