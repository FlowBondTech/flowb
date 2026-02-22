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

function getLevelThreshold(level: number): number {
  const thresholds = [0, 50, 150, 350, 700, 1200];
  return thresholds[Math.min(level + 1, thresholds.length - 1)];
}

interface Milestone {
  icon: string;
  title: string;
  current: number;
  target: number;
}

function getMilestones(points: PointsInfo): Milestone[] {
  return [
    { icon: "\u2B50", title: `Reach ${getLevelName(points.level + 1)}`, current: points.points, target: getLevelThreshold(points.level) },
    { icon: "\uD83D\uDD25", title: "7-day streak", current: points.streak, target: 7 },
    { icon: "\uD83C\uDFC6", title: "Longest streak record", current: points.streak, target: Math.max(points.longestStreak + 1, 10) },
    { icon: "\uD83D\uDCAA", title: "Earn 500 points", current: Math.min(points.points, 500), target: 500 },
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

function PointsSkeleton() {
  return (
    <div className="screen">
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div className="skeleton-line" style={{ width: 80, height: 48, margin: "0 auto 8px", borderRadius: 8 }} />
        <div className="skeleton-line" style={{ width: 120, height: 14, margin: "0 auto" }} />
      </div>
      <div className="skeleton" style={{ height: 80 }} />
      <div className="skeleton" style={{ height: 120 }} />
    </div>
  );
}

export function Points({ onNavigate }: Props) {
  const tg = (window as any).Telegram?.WebApp;
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

  if (loading) {
    return <PointsSkeleton />;
  }

  if (!points) {
    return (
      <div className="screen">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">{"\u2B50"}</div>
            <div className="empty-state-title">No points yet</div>
            <div className="empty-state-text">Start attending events and engaging to earn points!</div>
            <button className="btn btn-primary" onClick={() => onNavigate({ name: "home" })}>
              Browse Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  const milestones = getMilestones(points);
  const nextLevelPts = getLevelThreshold(points.level);
  const prevLevelPts = points.level > 0 ? getLevelThreshold(points.level - 1) : 0;
  const levelProgress = nextLevelPts > prevLevelPts
    ? ((points.points - prevLevelPts) / (nextLevelPts - prevLevelPts)) * 100
    : 100;

  return (
    <div className="screen">
      {/* Points hero */}
      <div className="points-hero">
        <div className="points-value">{points.points}</div>
        <div className="points-label">
          Level {points.level} - {getLevelName(points.level)}
        </div>

        {/* Level progress bar */}
        <div style={{ maxWidth: 200, margin: "10px auto 0" }}>
          <div className="progress-bar" style={{ height: 4 }}>
            <div
              className="progress-fill"
              style={{ width: `${Math.min(levelProgress, 100)}%` }}
            />
          </div>
          <div style={{ fontSize: 11, color: "var(--hint)", marginTop: 4 }}>
            {points.points}/{nextLevelPts} to {getLevelName(points.level + 1)}
          </div>
        </div>

        {/* Streak display */}
        {points.streak > 0 && (
          <div className="streak-badge">
            {"\uD83D\uDD25"} {points.streak} day streak
          </div>
        )}
        {points.longestStreak > points.streak && (
          <div style={{ fontSize: 12, color: "var(--hint)", marginTop: 4 }}>
            Best: {points.longestStreak} days
          </div>
        )}
      </div>

      {/* Cross-platform sync */}
      <div className="cross-platform-card" onClick={() => tg?.openLink?.("https://flowb.me/settings")}>
        <div className="cross-platform-icon">{"\uD83D\uDD17"}</div>
        <div className="cross-platform-info">
          <div className="cross-platform-title">Sync Points Across Platforms</div>
          <div className="cross-platform-desc">
            Log into flowb.me to link your Telegram, Farcaster &amp; Web accounts and combine your points.
          </div>
        </div>
        <span className="cross-platform-arrow">{"\u203A"}</span>
      </div>

      {/* Milestone progress */}
      <div className="section-title">Milestones</div>
      <div className="card">
        {milestones.map((m) => {
          const pct = Math.min((m.current / m.target) * 100, 100);
          const done = m.current >= m.target;
          return (
            <div key={m.title} className="milestone-card">
              <div className="milestone-icon">{m.icon}</div>
              <div className="milestone-info">
                <div className="milestone-title">{m.title}</div>
                {done ? (
                  <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                    Completed!
                  </div>
                ) : (
                  <>
                    <div className="milestone-progress-text">
                      {m.current}/{m.target}
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Crew ranking */}
      {crews.length > 0 && (
        <>
          <div className="section-title">Crew Ranking</div>
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
                No points data yet. Start earning!
              </div>
            ) : (
              leaderboard.map((entry, i) => (
                <LeaderboardRow key={entry.user_id} entry={entry} rank={i + 1} />
              ))
            )}
          </div>
        </>
      )}

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
    </div>
  );
}
