type Screen = "home" | "schedule" | "crew" | "points";

interface Props {
  current: string;
  onNavigate: (screen: Screen) => void;
}

const tabs: Array<{ name: Screen; icon: string; label: string }> = [
  { name: "home", icon: "\u26A1", label: "Now" },
  { name: "schedule", icon: "\uD83D\uDCC5", label: "Schedule" },
  { name: "crew", icon: "\uD83D\uDC65", label: "Crew" },
  { name: "points", icon: "\u2B50", label: "Points" },
];

export function BottomNav({ current, onNavigate }: Props) {
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          className={`nav-item ${current === tab.name ? "active" : ""}`}
          onClick={() => onNavigate(tab.name)}
        >
          <span className="nav-icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
