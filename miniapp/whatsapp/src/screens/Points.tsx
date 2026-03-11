import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { PointsInfo } from "../api/types";
import { getPoints } from "../api/client";

interface PointsProps {
  onNavigate: (s: Screen) => void;
}

export function Points({ onNavigate }: PointsProps) {
  const [info, setInfo] = useState<PointsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPoints()
      .then(setInfo)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Points</h1>
      </header>

      {loading && <div className="loading"><div className="spinner" /></div>}

      {info && (
        <div style={{ padding: 16 }}>
          <div className="points-card">
            <div className="points-value">{info.total_points}</div>
            <div className="points-label">Total Points</div>
          </div>

          {info.streak > 0 && (
            <div className="points-card" style={{ marginTop: 12 }}>
              <div className="points-value">{info.streak}</div>
              <div className="points-label">Day Streak</div>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>Earn Points</h3>
            <div className="earn-list">
              <div className="earn-item">
                <span>RSVP to events</span>
                <span className="earn-pts">+5</span>
              </div>
              <div className="earn-item">
                <span>Check in at venues</span>
                <span className="earn-pts">+10</span>
              </div>
              <div className="earn-item">
                <span>Invite friends</span>
                <span className="earn-pts">+15</span>
              </div>
              <div className="earn-item">
                <span>Daily streak bonus</span>
                <span className="earn-pts">+3</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
