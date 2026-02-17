import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { CrewInfo, CrewMember, CrewCheckin, LeaderboardEntry } from "../api/types";
import { getCrews, getCrewMembers, crewCheckin, joinCrew, createCrew, getCrewLeaderboard } from "../api/client";

interface Props {
  crewId?: string;
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
          {entry.display_name || entry.user_id.replace(/^(telegram_|farcaster_)/, "@")}
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

export function Crew({ crewId }: Props) {
  const [crews, setCrews] = useState<CrewInfo[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewInfo | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [checkins, setCheckins] = useState<CrewCheckin[]>([]);
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
    getCrews()
      .then((c) => {
        setCrews(c);
        if (crewId) {
          const match = c.find((cr) => cr.id === crewId || cr.join_code === crewId);
          if (match) setSelectedCrew(match);
        } else if (c.length === 1) {
          setSelectedCrew(c[0]);
        } else if (c.length > 1) {
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
      const tg = (window as any).Telegram?.WebApp;
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
      const tg = (window as any).Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred("success");
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
      const tg = (window as any).Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      console.error(err);
    }
  };

  const shareCrewLink = () => {
    if (!selectedCrew) return;
    const tg = (window as any).Telegram?.WebApp;
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
            <button className="btn btn-sm btn-secondary" onClick={shareCrewLink}>
              Share
            </button>
          </div>

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
                  <div key={m.user_id} className="member-row">
                    <div className="avatar">{(m.display_name || m.user_id).charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div className="member-name">
                        {m.display_name || m.user_id.replace(/^(telegram_|farcaster_)/, "@")}
                        {m.role === "admin" && <span style={{ color: "var(--accent)", fontSize: 11 }}> admin</span>}
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
              <button
                className="btn btn-primary btn-block"
                onClick={() => setShowCheckin(true)}
              >
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
