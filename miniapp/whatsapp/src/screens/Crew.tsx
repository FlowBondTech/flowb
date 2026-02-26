import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { CrewInfo } from "../api/types";
import { getCrews, joinCrew } from "../api/client";

interface CrewProps {
  crewId?: string;
  onNavigate: (s: Screen) => void;
}

export function Crew({ crewId, onNavigate }: CrewProps) {
  const [crews, setCrews] = useState<CrewInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    getCrews()
      .then(setCrews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoinError(null);
    try {
      await joinCrew(joinCode.trim());
      setJoinCode("");
      const updated = await getCrews();
      setCrews(updated);
    } catch (err: any) {
      setJoinError(err.message);
    }
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Crews</h1>
      </header>

      {loading && <div className="loading"><div className="spinner" /></div>}

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Join code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="input"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleJoin}>
            Join
          </button>
        </div>
        {joinError && <p className="error-text">{joinError}</p>}
      </div>

      {!loading && crews.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 16 }}>
          You're not in any crews yet. Enter a join code above!
        </p>
      )}

      <div className="crew-list">
        {crews.map((crew) => (
          <div key={crew.id} className="crew-card">
            <div className="crew-card-header">
              <span className="crew-emoji">{crew.emoji || ""}</span>
              <h3>{crew.name}</h3>
            </div>
            <p className="event-card-meta">{crew.member_count} members</p>
            {crew.description && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{crew.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
