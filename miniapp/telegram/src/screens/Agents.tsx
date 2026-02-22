import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { AgentSlot, AgentSkill, AgentDetail, AgentTransaction } from "../api/types";
import { getAgents, getMyAgent, claimAgent, purchaseSkill } from "../api/client";

interface Props {
  onNavigate: (s: Screen) => void;
}

function formatUSDC(n: number): string {
  return `$${n.toFixed(2)}`;
}

function txTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    seed: "Seed Deposit",
    skill_purchase: "Skill Purchase",
    event_boost: "Event Boost",
    recommendation: "Recommendation",
    tip: "Tip",
    prize: "Prize",
    api_query: "API Query",
  };
  return labels[type] || type;
}

function txTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    seed: "\u{1F331}",
    skill_purchase: "\u{1F9E0}",
    event_boost: "\u{1F680}",
    recommendation: "\u{1F4A1}",
    tip: "\u{1F49C}",
    prize: "\u{1F3C6}",
    api_query: "\u{1F310}",
  };
  return icons[type] || "\u{1F4B8}";
}

function timeSince(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function AgentsSkeleton() {
  return (
    <div className="screen">
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div className="skeleton-line" style={{ width: 120, height: 24, margin: "0 auto 8px", borderRadius: 8 }} />
        <div className="skeleton-line" style={{ width: 180, height: 14, margin: "0 auto" }} />
      </div>
      <div className="skeleton" style={{ height: 160 }} />
      <div className="skeleton" style={{ height: 200, marginTop: 12 }} />
    </div>
  );
}

export function Agents({ onNavigate }: Props) {
  const [agents, setAgents] = useState<AgentSlot[]>([]);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [stats, setStats] = useState({ total: 10, claimed: 0, open: 0, reserved: 0 });
  const [myAgent, setMyAgent] = useState<AgentDetail | null>(null);
  const [transactions, setTransactions] = useState<AgentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [claimName, setClaimName] = useState("");
  const [showClaim, setShowClaim] = useState(false);
  const [tab, setTab] = useState<"my-agent" | "all-agents" | "skills">("my-agent");

  useEffect(() => {
    Promise.all([
      getAgents().then((data) => {
        setAgents(data.agents);
        setSkills(data.skills);
        setStats(data.stats);
      }),
      getMyAgent().then((data) => {
        setMyAgent(data.agent);
        setTransactions(data.transactions);
      }).catch(() => {
        // User has no agent yet - this is expected
        setMyAgent(null);
      }),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const result = await claimAgent(claimName || undefined);
      setShowClaim(false);
      // Refresh all data from server to get correct state
      Promise.all([
        getAgents().then((data) => {
          setAgents(data.agents);
          setSkills(data.skills);
          setStats(data.stats);
        }),
        getMyAgent().then((data) => {
          setMyAgent(data.agent);
          setTransactions(data.transactions);
        }).catch(() => {
          // Fallback: construct from claim response if /me fails
          setMyAgent({
            id: result.agent.id,
            slot: result.agent.slot,
            name: result.agent.name,
            walletAddress: null,
            status: result.agent.status || "claimed",
            skills: result.agent.skills || [],
            balance: result.agent.balance || 0,
            totalEarned: 0,
            totalSpent: 0,
            metadata: {},
            claimedAt: new Date().toISOString(),
          });
        }),
      ]);
    } catch (err: any) {
      alert(err.message || "Failed to claim agent");
    } finally {
      setClaiming(false);
    }
  };

  const handleBuySkill = async (slug: string) => {
    if (buying) return;
    setBuying(slug);
    try {
      const result = await purchaseSkill(slug);
      // Update local state
      setMyAgent((prev) =>
        prev ? { ...prev, skills: result.agent.skills, balance: result.agent.balance, totalSpent: result.agent.totalSpent } : prev,
      );
    } catch (err: any) {
      if (err.message?.includes("402")) {
        alert("Insufficient balance! Add USDC to your agent.");
      } else {
        alert(err.message || "Failed to purchase skill");
      }
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <AgentsSkeleton />;

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>Agents</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {stats.claimed}/{stats.total} claimed &middot; {stats.open} available
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-chips" style={{ marginBottom: 12 }}>
        {(["my-agent", "all-agents", "skills"] as const).map((t) => (
          <button
            key={t}
            className={`chip ${tab === t ? "chip-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "my-agent" ? "My Agent" : t === "all-agents" ? "All Agents" : "Skills"}
          </button>
        ))}
      </div>

      {/* MY AGENT TAB */}
      {tab === "my-agent" && (
        <>
          {!myAgent ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\u{1F916}"}</div>
                <div className="empty-state-title">No Agent Yet</div>
                <div className="empty-state-text">
                  Claim your personal AI agent! It gets a wallet, discovers events, and trades skills with other agents.
                  {stats.open > 0
                    ? ` Only ${stats.open} slots left.`
                    : " All slots are taken!"}
                </div>
                {stats.open > 0 && !showClaim && (
                  <button className="btn btn-primary" onClick={() => setShowClaim(true)}>
                    Claim Your Agent
                  </button>
                )}
                {showClaim && (
                  <div style={{ marginTop: 12, width: "100%" }}>
                    <input
                      type="text"
                      placeholder="Name your agent (optional)"
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      maxLength={50}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontSize: 14,
                        marginBottom: 8,
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleClaim}
                        disabled={claiming}
                        style={{ flex: 1 }}
                      >
                        {claiming ? "Claiming..." : "Confirm Claim"}
                      </button>
                      <button className="btn btn-secondary" onClick={() => setShowClaim(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Agent Card */}
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: "linear-gradient(135deg, var(--accent), var(--purple))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24,
                  }}>
                    {"\u{1F916}"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{myAgent.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Slot #{myAgent.slot} &middot; {myAgent.status}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  <div style={{ textAlign: "center", padding: "10px 0", background: "var(--bg)", borderRadius: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>{formatUSDC(myAgent.balance)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Balance</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px 0", background: "var(--bg)", borderRadius: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{formatUSDC(myAgent.totalEarned)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Earned</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px 0", background: "var(--bg)", borderRadius: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--purple)" }}>{formatUSDC(myAgent.totalSpent)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Spent</div>
                  </div>
                </div>

                {/* Skills */}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Skills ({myAgent.skills.length})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {myAgent.skills.map((s) => (
                    <span key={s} className="badge badge-accent" style={{ fontSize: 12 }}>
                      {s}
                    </span>
                  ))}
                  {myAgent.skills.length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No skills yet</span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="section-title">Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <button className="card card-clickable" style={{ padding: 14, textAlign: "center", border: 0, cursor: "pointer" }} onClick={() => setTab("skills")}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{"\u{1F9E0}"}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Buy Skills</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{skills.length} available</div>
                </button>
                <button className="card card-clickable" style={{ padding: 14, textAlign: "center", border: 0, cursor: "pointer" }} onClick={() => setTab("all-agents")}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{"\u{1F465}"}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>All Agents</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{stats.claimed} active</div>
                </button>
              </div>

              {/* Transaction History */}
              {transactions.length > 0 && (
                <>
                  <div className="section-title">Recent Activity</div>
                  <div className="card">
                    {transactions.slice(0, 10).map((tx) => (
                      <div key={tx.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border)",
                      }}>
                        <div style={{ fontSize: 20, width: 32, textAlign: "center" }}>
                          {txTypeIcon(tx.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{txTypeLabel(tx.type)}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {tx.skillSlug || timeSince(tx.createdAt)}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 14, fontWeight: 700,
                          color: tx.direction === "in" ? "#10b981" : "var(--text-muted)",
                        }}>
                          {tx.direction === "in" ? "+" : "-"}{formatUSDC(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ALL AGENTS TAB */}
      {tab === "all-agents" && (
        <>
          <div className="section-title">Agent Slots (10)</div>
          {agents.map((agent) => (
            <div key={agent.slot} className="card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: agent.status === "open"
                    ? "var(--bg)"
                    : agent.status === "reserved"
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : "linear-gradient(135deg, var(--accent), var(--purple))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, border: agent.status === "open" ? "2px dashed var(--border)" : "none",
                }}>
                  {agent.status === "open" ? "?" : agent.status === "reserved" ? "\u{1F3C6}" : "\u{1F916}"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {agent.agentName || (agent.status === "reserved"
                      ? `Reserved: ${agent.reservedFor === "top_points" ? "Top Scorer" : "Top Scorer Gift"}`
                      : `Slot #${agent.slot} - Available`)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {agent.userId
                      ? `${agent.displayName || agent.userId.replace(/^(telegram_|farcaster_)/, "@")}`
                      : agent.status === "reserved"
                        ? "Awarded to top points scorer + $25 USDC"
                        : "First flow, first bond"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {agent.status === "claimed" || agent.status === "active" ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>{formatUSDC(agent.balance)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {agent.skills.length} skill{agent.skills.length !== 1 ? "s" : ""}
                      </div>
                    </>
                  ) : agent.status === "open" ? (
                    <span className="badge" style={{ background: "var(--accent)", color: "#fff", fontSize: 11 }}>
                      OPEN
                    </span>
                  ) : (
                    <span className="badge" style={{ background: "#f59e0b", color: "#000", fontSize: 11 }}>
                      RESERVED
                    </span>
                  )}
                </div>
              </div>
              {(agent.status === "claimed" || agent.status === "active") && agent.skills.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {agent.skills.map((s) => (
                    <span key={s} style={{
                      fontSize: 10, padding: "2px 6px", borderRadius: 4,
                      background: "var(--bg)", color: "var(--text-muted)",
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* SKILLS TAB */}
      {tab === "skills" && (
        <>
          <div className="section-title">Skill Marketplace</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Purchase skills for your agent using USDC. Skills unlock new capabilities powered by x402 micropayments.
          </div>
          {skills.map((skill) => {
            const owned = myAgent?.skills.includes(skill.slug);
            return (
              <div key={skill.slug} className="card" style={{ padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: owned ? "linear-gradient(135deg, #10b981, #059669)" : "var(--bg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>
                    {owned ? "\u2713" : skill.category === "discovery" ? "\u{1F50D}"
                      : skill.category === "social" ? "\u{1F465}"
                      : skill.category === "analytics" ? "\u{1F4CA}"
                      : skill.category === "promotion" ? "\u{1F680}"
                      : skill.category === "payments" ? "\u{1F4B8}" : "\u{1F9E0}"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{skill.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {skill.description}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {skill.capabilities.map((c) => (
                        <span key={c} style={{
                          fontSize: 10, padding: "1px 5px", borderRadius: 4,
                          background: "var(--bg)", color: "var(--text-muted)",
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 70 }}>
                    {owned ? (
                      <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Owned</span>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: "6px 10px" }}
                        disabled={!myAgent || buying === skill.slug}
                        onClick={() => handleBuySkill(skill.slug)}
                      >
                        {buying === skill.slug ? "..." : formatUSDC(skill.price_usdc)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* x402 explainer */}
          <div className="card" style={{ padding: 14, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Powered by x402</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Skills are purchased using the x402 micropayment protocol. Your agent signs a USDC transaction on Base, the server verifies and settles on-chain. No subscriptions, no API keys — just signed payments.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
