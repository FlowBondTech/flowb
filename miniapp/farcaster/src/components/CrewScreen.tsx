import { useState, useEffect, useRef } from "react";
import type { CrewInfo, CrewMember, CrewCheckin as CrewCheckinType, LeaderboardEntry, CrewMessage } from "../api/types";
import { getCrews, getCrewMembers, crewCheckin, joinCrew, createCrew, getCrewLeaderboard, getCrewMessages, sendCrewMessage } from "../api/client";

interface Props {
  authed: boolean;
  currentUserId?: string;
}

/** Crew missions with progress tracking */
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

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const rankClass = rank <= 3 ? `leaderboard-rank-${rank}` : "";
  const crownIcons: Record<number, string> = { 1: "\uD83D\uDC51", 2: "\uD83E\uDD48", 3: "\uD83E\uDD49" };

  return (
    <div className="leaderboard-row">
      <div className={`leaderboard-rank ${rankClass}`}>
        {crownIcons[rank] || rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="leaderboard-name">
          {entry.user_id.replace(/^(telegram_|farcaster_)/, "@")}
        </div>
        {entry.current_streak > 0 && (
          <div className="leaderboard-meta">
            {"\uD83D\uDD25"} {entry.current_streak} day streak
          </div>
        )}
      </div>
      <div className="leaderboard-points">{entry.total_points}</div>
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
    <div className="crew-chat-section">
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
          <div className="crew-chat-messages">
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
                      <span className="crew-chat-sender">{displayName}</span>
                    </div>
                  )}
                  <div className={`crew-chat-bubble ${isOwn ? "crew-chat-bubble-own" : "crew-chat-bubble-other"}`}>
                    {msg.message}
                  </div>
                  <div className="crew-chat-time">{formatChatTime(msg.created_at)}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
        <div className="crew-chat-input-bar">
          <input
            className="input"
            type="text"
            placeholder="Message your crew..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
          />
          <button
            className="crew-chat-send"
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

export function CrewScreen({ authed, currentUserId }: Props) {
  const [crews, setCrews] = useState<CrewInfo[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewInfo | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [checkins, setCheckins] = useState<CrewCheckinType[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [checkinVenue, setCheckinVenue] = useState("");
  const [showCheckin, setShowCheckin] = useState(false);

  // Load crews
  useEffect(() => {
    if (!authed) {
      setLoading(false);
      return;
    }
    getCrews()
      .then((c) => {
        setCrews(c);
        if (c.length === 1) setSelectedCrew(c[0]);
        else if (c.length > 1) setSelectedCrew(c[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authed]);

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
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckin = async () => {
    if (!checkinVenue.trim() || !selectedCrew) return;
    try {
      await crewCheckin(selectedCrew.id, checkinVenue.trim());
      setShowCheckin(false);
      setCheckinVenue("");
      const { checkins: c } = await getCrewMembers(selectedCrew.id);
      setCheckins(c);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="screen">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Crew</h1>
        <SkeletonMembers />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="screen">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">{"\uD83D\uDD12"}</div>
            <div className="empty-state-title">Sign in required</div>
            <div className="empty-state-text">
              Sign in to create or join a crew.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No crews state
  if (crews.length === 0) {
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
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                Create Crew
              </button>
              <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
                Join Crew
              </button>
            </div>
          </div>
        </div>
        {renderCreateModal()}
        {renderJoinModal()}
      </div>
    );
  }

  const missions = getMissions(members.length, checkins.length);

  return (
    <div className="screen">
      {/* Crew selector */}
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
              <button className="btn btn-sm btn-secondary" onClick={() => setShowJoin(true)}>
                Join
              </button>
            </div>
          </div>

          {/* Active checkins */}
          {checkins.length > 0 && (
            <>
              <div className="section-title">Right Now</div>
              {checkins.map((c, i) => (
                <div key={i} className="member-row">
                  <span className={`status-dot status-${c.status}`} />
                  <div style={{ flex: 1 }}>
                    <div className="member-name">{c.user_id.replace(/^(telegram_|farcaster_)/, "@")}</div>
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

          {/* Missions */}
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
                  <div key={m.user_id} className="member-row">
                    <div className="avatar">
                      {m.user_id.charAt(m.user_id.length - 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="member-name">
                        {m.user_id.replace(/^(telegram_|farcaster_)/, "@")}
                        {m.role === "admin" && (
                          <span style={{ color: "var(--accent)", fontSize: 11, marginLeft: 4 }}>admin</span>
                        )}
                      </div>
                      {checkin && (
                        <div className="member-status">
                          <span className={`status-dot status-${checkin.status}`} />
                          {checkin.venue_name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Crew Chat */}
          {currentUserId && (
            <CrewChat crewId={selectedCrew.id} currentUserId={currentUserId} />
          )}

          {/* Check in button */}
          <div style={{ marginTop: 16 }}>
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
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-block" onClick={handleCheckin}>
                    Check In
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowCheckin(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn btn-primary btn-block" onClick={() => setShowCheckin(true)}>
                Check In Here
              </button>
            )}
          </div>
        </>
      )}

      {renderCreateModal()}
      {renderJoinModal()}
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
}
