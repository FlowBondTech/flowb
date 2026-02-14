import type { Screen } from "../App";

interface Props {
  current: string;
  onNavigate: (s: Screen) => void;
}

const tabs = [
  { name: "home" as const, icon: "\u26A1", label: "Now" },
  { name: "schedule" as const, icon: "\uD83D\uDCC5", label: "Schedule" },
  { name: "crew" as const, icon: "\uD83D\uDC65", label: "Crew" },
  { name: "points" as const, icon: "\u2B50", label: "Points" },
];

export function BottomNav({ current, onNavigate }: Props) {
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          className={`nav-item ${current === tab.name ? "active" : ""}`}
          onClick={() => onNavigate({ name: tab.name })}
        >
          <span className="nav-icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
