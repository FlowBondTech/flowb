import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { CrewInfo, CrewMember, CrewCheckin } from "../api/types";
import { getCrews, getCrewMembers, crewCheckin, joinCrew, createCrew } from "../api/client";

interface Props {
  crewId?: string;
  onNavigate: (s: Screen) => void;
}

export function Crew({ crewId }: Props) {
  const [crews, setCrews] = useState<CrewInfo[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewInfo | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [checkins, setCheckins] = useState<CrewCheckin[]>([]);
  const [loading, setLoading] = useState(true);
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
        // Auto-select if crewId provided or only one crew
        if (crewId) {
          const match = c.find((cr) => cr.id === crewId || cr.join_code === crewId);
          if (match) setSelectedCrew(match);
        } else if (c.length === 1) {
          setSelectedCrew(c[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [crewId]);

  // Load members when crew selected
  useEffect(() => {
    if (!selectedCrew) return;
    getCrewMembers(selectedCrew.id)
      .then(({ members: m, checkins: c }) => {
        setMembers(m);
        setCheckins(c);
      })
      .catch(console.error);
  }, [selectedCrew]);

  const handleCreate = async () => {
    if (!newCrewName.trim()) return;
    try {
      await createCrew(newCrewName.trim());
      setShowCreate(false);
      setNewCrewName("");
      // Refresh
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
      // Refresh checkins
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
    const botUsername = "Flow_B_bot";
    const link = `https://t.me/${botUsername}?startapp=crew_${selectedCrew.join_code}`;
    tg?.openTelegramLink?.(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Join my crew ${selectedCrew.emoji} ${selectedCrew.name} on FlowB!`)}`);
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  // No crews yet
  if (crews.length === 0 && !crewId) {
    return (
      <div className="screen">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Crew</h1>
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{"\\uD83D\\uDC65"}</div>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>No crews yet</div>
          <div style={{ color: "var(--hint)", marginBottom: 16, fontSize: 14 }}>
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

        {renderCreateModal()}
        {renderJoinModal()}
      </div>
    );
  }

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

          {/* Members */}
          <div className="section-title">Members</div>
          <div className="card">
            {members.map((m) => {
              const checkin = checkins.find((c) => c.user_id === m.user_id);
              return (
                <div key={m.user_id} className="member-row">
                  <div className="avatar">{m.user_id.charAt(m.user_id.length - 1).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div className="member-name">
                      {m.user_id.replace(/^(telegram_|farcaster_)/, "@")}
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

          {/* Check in button */}
          <div style={{ marginTop: 16 }}>
            {showCheckin ? (
              <div className="card">
                <input
                  type="text"
                  placeholder="Where are you? (venue name)"
                  value={checkinVenue}
                  onChange={(e) => setCheckinVenue(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
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
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
        <div className="card" style={{ width: "100%", maxWidth: 340 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Create Crew</h2>
          <input
            type="text"
            placeholder="Crew name (e.g. DeFi Squad)"
            value={newCrewName}
            onChange={(e) => setNewCrewName(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, marginBottom: 12 }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-block" onClick={handleCreate}>Create</button>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  function renderJoinModal() {
    if (!showJoin) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
        <div className="card" style={{ width: "100%", maxWidth: 340 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Join Crew</h2>
          <input
            type="text"
            placeholder="Enter crew invite code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, marginBottom: 12 }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-block" onClick={handleJoin}>Join</button>
            <button className="btn btn-secondary" onClick={() => setShowJoin(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }
}
