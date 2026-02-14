import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { PointsInfo, LeaderboardEntry, CrewInfo } from "../api/types";
import { getPoints, getCrews, getCrewLeaderboard } from "../api/client";

interface Props {
  onNavigate: (s: Screen) => void;
}

function getLevelName(level: number): string {
  const names = ["Newcomer", "Explorer", "Connector", "Groover", "Flow Master", "Legend"];
  return names[Math.min(level, names.length - 1)];
}

export function Points({ onNavigate }: Props) {
  const [points, setPoints] = useState<PointsInfo | null>(null);
  const [crews, setCrews] = useState<CrewInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPoints().then(setPoints),
      getCrews().then(setCrews),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Load leaderboard when crew selected
  useEffect(() => {
    if (!selectedCrewId && crews.length > 0) {
      setSelectedCrewId(crews[0].id);
    }
  }, [crews, selectedCrewId]);

  useEffect(() => {
    if (!selectedCrewId) return;
    getCrewLeaderboard(selectedCrewId)
      .then(setLeaderboard)
      .catch(console.error);
  }, [selectedCrewId]);

  if (loading || !points) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  return (
    <div className="screen">
      {/* Points hero */}
      <div className="points-hero">
        <div className="points-value">{points.points}</div>
        <div className="points-label">
          Level {points.level} - {getLevelName(points.level)}
        </div>
        {points.streak > 0 && (
          <div className="streak-badge">
            {"\\uD83D\\uDD25"} {points.streak} day streak
          </div>
        )}
      </div>

      {/* How to earn */}
      <div className="section-title">How to Earn</div>
      <div className="card">
        {[
          { action: "Check in at event", pts: 10 },
          { action: "Create a crew", pts: 20 },
          { action: "Join a crew", pts: 10 },
          { action: "Connect with someone", pts: 15 },
          { action: "Share an event", pts: 5 },
          { action: "Daily active", pts: 5 },
          { action: "3-day streak", pts: 10 },
          { action: "7-day streak", pts: 25 },
        ].map((item) => (
          <div
            key={item.action}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: 14,
            }}
          >
            <span>{item.action}</span>
            <span className="badge badge-accent">+{item.pts}</span>
          </div>
        ))}
      </div>

      {/* Crew leaderboard */}
      {crews.length > 0 && (
        <>
          <div className="section-title">Crew Leaderboard</div>
          {crews.length > 1 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 8 }}>
              {crews.map((c) => (
                <button
                  key={c.id}
                  className={`btn btn-sm ${selectedCrewId === c.id ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setSelectedCrewId(c.id)}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          )}
          <div className="card">
            {leaderboard.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--hint)", padding: 16 }}>
                No points data yet
              </div>
            ) : (
              leaderboard.map((entry, i) => (
                <div
                  key={entry.user_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: i < leaderboard.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span style={{ width: 24, textAlign: "center", fontWeight: 700, color: i < 3 ? "var(--accent)" : "var(--hint)" }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {entry.user_id.replace(/^(telegram_|farcaster_)/, "@")}
                    </div>
                    {entry.current_streak > 0 && (
                      <div style={{ fontSize: 11, color: "var(--hint)" }}>
                        {"\\uD83D\\uDD25"} {entry.current_streak} day streak
                      </div>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                    {entry.total_points}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
