import React, { useState } from "react";
import type { Screen } from "../App";

interface Props {
  onNavigate: (s: Screen) => void;
}

const FAQ_ITEMS = [
  {
    q: "What is FlowB?",
    a: "FlowB is your ETHDenver companion app. We aggregate 100+ side events, hackathons, parties, and meetups into one place so you never miss what matters. Form crews with friends, earn points, and explore Denver together.",
  },
  {
    q: "How do I earn points?",
    a: "RSVP to events, check in at venues with your crew, invite friends, complete daily quests, and engage with the community. Points unlock milestones and leaderboard rankings.",
  },
  {
    q: "What are crews?",
    a: "Crews are groups of friends exploring ETHDenver together. Create or join a crew to coordinate schedules, check in together at events, and earn bonus crew points.",
  },
  {
    q: "Is FlowB free?",
    a: "Yes, completely free. No sign-up required to browse events. Create an account to RSVP, join crews, and earn points.",
  },
  {
    q: "How do reminders work?",
    a: "Set a reminder on any event and FlowB will notify you before it starts. Reminders are delivered right here in Telegram as a DM from the FlowB bot.",
  },
  {
    q: "Where can I use FlowB?",
    a: "FlowB is available right here in Telegram, on the web at flowb.me, as a Farcaster mini app, and soon as a native mobile app.",
  },
];

const PLATFORMS = [
  {
    name: "Web App",
    desc: "flowb.me -- browse on any device",
    url: "https://flowb.me",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    name: "Telegram",
    desc: "You're here!",
    url: "",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    name: "Farcaster",
    desc: "Mini app in Warpcast",
    url: "https://warpcast.com/flowb",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
        <path d="M18.24 2.4H5.76C3.96 2.4 2.4 3.96 2.4 5.76v12.48c0 1.8 1.56 3.36 3.36 3.36h12.48c1.8 0 3.36-1.56 3.36-3.36V5.76c0-1.8-1.56-3.36-3.36-3.36zm-.84 14.4h-1.44l-.72-3.6-.72 3.6H13.2l-1.2-6h1.44l.6 3.6.72-3.6h1.2l.72 3.6.6-3.6h1.44l-1.32 6z" />
      </svg>
    ),
  },
  {
    name: "Mobile App",
    desc: "Coming soon to iOS & Android",
    url: "",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
];

export function About({ onNavigate }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const openLink = (url: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="screen" style={{ paddingBottom: 100 }}>
      <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>About FlowB</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
        Your companion for navigating ETHDenver. Discover events, form crews, earn points.
      </p>

      {/* Mission */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Our Mission</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 8 }}>
          ETHDenver is massive -- hundreds of side events spread across Denver. It's easy to miss the best ones or lose track of your friends.
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
          FlowB aggregates every side event into one place, lets you form crews with friends, and rewards you for exploring. Built by the community, for the community.
        </p>
      </div>

      {/* Platforms */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Get FlowB Everywhere</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {PLATFORMS.map((p) => (
          <button
            key={p.name}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              cursor: p.url ? "pointer" : "default",
              opacity: p.url ? 1 : 0.5,
              border: "none",
              textAlign: "left",
              width: "100%",
            }}
            onClick={() => p.url && openLink(p.url)}
            disabled={!p.url}
          >
            <span style={{ color: "var(--accent-light, #3b82f6)", flexShrink: 0 }}>{p.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text, #e4e4ec)" }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>FAQ</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "12px 14px",
                background: "none",
                border: "none",
                color: "var(--text, #e4e4ec)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              {item.q}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  transition: "transform 0.2s",
                  transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                  color: "var(--text-muted)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openFaq === i && (
              <div style={{ padding: "0 14px 12px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
