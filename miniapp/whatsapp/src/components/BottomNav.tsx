import type { Screen } from "../App";

interface BottomNavProps {
  current: string;
  onNavigate: (s: Screen) => void;
}

const tabs: Array<{ name: string; label: string; screen: Screen }> = [
  { name: "home", label: "Events", screen: { name: "home" } },
  { name: "schedule", label: "Schedule", screen: { name: "schedule" } },
  { name: "crew", label: "Crew", screen: { name: "crew" } },
  { name: "points", label: "Points", screen: { name: "points" } },
  { name: "settings", label: "Settings", screen: { name: "settings" } },
];

export function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          className={`nav-tab${current === tab.name ? " active" : ""}`}
          onClick={() => onNavigate(tab.screen)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
