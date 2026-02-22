"use client";

import { useState, useEffect } from "react";
import type {
  AgentSlot,
  AgentSkill,
  AgentDetail,
  AgentTransaction,
  AgentsResponse,
  MyAgentResponse,
} from "../api/types";
import {
  getAgents,
  getMyAgent,
  claimAgent,
  purchaseSkill,
  boostEvent,
  tipAgent,
} from "../api/client";
import { hapticImpact, hapticNotification, hapticSelection } from "../lib/farcaster";

interface Props {
  authed: boolean;
  currentUserId?: string;
}

type AgentTab = "my-agent" | "all-agents" | "skills";

function formatUSDC(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "open":
      return "var(--green, #22c55e)";
    case "claimed":
    case "active":
      return "var(--accent, #6366f1)";
    case "reserved":
      return "var(--yellow, #eab308)";
    default:
      return "var(--text-muted)";
  }
}

function statusBadgeStyle(status: string): React.CSSProperties {
  const color = statusColor(status);
  return {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 99,
    background: `${color}18`,
    color,
    textTransform: "capitalize" as const,
  };
}

function txIcon(type: string, direction: "in" | "out"): string {
  if (type === "tip" && direction === "in") return "+";
  if (type === "tip" && direction === "out") return "-";
  if (type === "skill_purchase") return "-";
  if (type === "boost") return "-";
  if (type === "deposit") return "+";
  return direction === "in" ? "+" : "-";
}

function AgentsSkeleton() {
  return (
    <div className="screen">
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div
          className="skeleton-line"
          style={{
            width: 120,
            height: 24,
            margin: "0 auto 8px",
            borderRadius: 8,
          }}
        />
        <div
          className="skeleton-line"
          style={{ width: 180, height: 14, margin: "0 auto" }}
        />
      </div>
      <div className="skeleton" style={{ height: 100 }} />
      <div className="skeleton" style={{ height: 80 }} />
      <div className="skeleton" style={{ height: 80 }} />
    </div>
  );
}

export function AgentsScreen({ authed, currentUserId }: Props) {
  const [tab, setTab] = useState<AgentTab>("my-agent");
  const [loading, setLoading] = useState(true);

  // All agents data
  const [agentsData, setAgentsData] = useState<AgentsResponse | null>(null);

  // My agent data
  const [myAgent, setMyAgent] = useState<AgentDetail | null>(null);
  const [transactions, setTransactions] = useState<AgentTransaction[]>([]);

  // Claim form
  const [agentName, setAgentName] = useState("");
  const [claiming, setClaiming] = useState(false);

  // Skill purchasing
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Tip modal
  const [showTip, setShowTip] = useState(false);
  const [tipRecipient, setTipRecipient] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [tipMessage, setTipMessage] = useState("");
  const [tipping, setTipping] = useState(false);

  // Boost modal
  const [showBoost, setShowBoost] = useState(false);
  const [boostEventId, setBoostEventId] = useState("");
  const [boosting, setBoosting] = useState(false);

  // Error/success feedback
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  }

  // Load data
  useEffect(() => {
    if (!authed) {
      setLoading(false);
      return;
    }
    loadData();
  }, [authed]);

  async function loadData() {
    setLoading(true);
    try {
      const [agents, me] = await Promise.all([getAgents(), getMyAgent()]);
      setAgentsData(agents);
      setMyAgent(me.agent);
      setTransactions(me.transactions);
    } catch (err) {
      console.error("Failed to load agents data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    if (claiming) return;
    setClaiming(true);
    hapticImpact("medium");
    try {
      const result = await claimAgent(agentName.trim() || undefined);
      hapticNotification("success");
      showFeedback("success", "Agent claimed successfully!");
      setAgentName("");
      // Refresh all data from server to get correct state
      await loadData();
    } catch (err: any) {
      console.error("Claim failed:", err);
      hapticNotification("error");
      showFeedback("error", err.message || "Failed to claim agent");
    } finally {
      setClaiming(false);
    }
  }

  async function handlePurchaseSkill(slug: string) {
    if (purchasing) return;
    setPurchasing(slug);
    hapticImpact("medium");
    try {
      await purchaseSkill(slug);
      hapticNotification("success");
      showFeedback("success", "Skill purchased!");
      await loadData();
    } catch (err: any) {
      console.error("Purchase failed:", err);
      hapticNotification("error");
      showFeedback("error", err.message || "Failed to purchase skill");
    } finally {
      setPurchasing(null);
    }
  }

  async function handleBoost() {
    if (!boostEventId.trim() || boosting) return;
    setBoosting(true);
    hapticImpact("medium");
    try {
      await boostEvent(boostEventId.trim());
      hapticNotification("success");
      showFeedback("success", "Event boosted!");
      setShowBoost(false);
      setBoostEventId("");
      await loadData();
    } catch (err: any) {
      console.error("Boost failed:", err);
      hapticNotification("error");
      showFeedback("error", err.message || "Failed to boost event");
    } finally {
      setBoosting(false);
    }
  }

  async function handleTip() {
    if (!tipRecipient.trim() || !tipAmount.trim() || tipping) return;
    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      showFeedback("error", "Enter a valid amount");
      return;
    }
    setTipping(true);
    hapticImpact("medium");
    try {
      await tipAgent(tipRecipient.trim(), amount, tipMessage.trim() || undefined);
      hapticNotification("success");
      showFeedback("success", `Tipped ${formatUSDC(amount)}!`);
      setShowTip(false);
      setTipRecipient("");
      setTipAmount("");
      setTipMessage("");
      await loadData();
    } catch (err: any) {
      console.error("Tip failed:", err);
      hapticNotification("error");
      showFeedback("error", err.message || "Failed to send tip");
    } finally {
      setTipping(false);
    }
  }

  // Not authenticated
  if (!authed) {
    return (
      <div className="screen">
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 16,
            letterSpacing: "-0.01em",
          }}
        >
          Agents
        </h1>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">{"\uD83E\uDD16"}</div>
            <div className="empty-state-title">Sign in required</div>
            <div className="empty-state-text">
              Sign in to claim your agent and unlock AI-powered skills.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <AgentsSkeleton />;
  }

  return (
    <div className="screen">
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 4,
          letterSpacing: "-0.01em",
        }}
      >
        Agents
      </h1>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        AI-powered agents with on-chain skills via x402
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            borderRadius: "var(--radius, 12px)",
            fontSize: 13,
            fontWeight: 600,
            background:
              feedback.type === "success"
                ? "rgba(34, 197, 94, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            color:
              feedback.type === "success"
                ? "var(--green, #22c55e)"
                : "#ef4444",
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Tab selector */}
      <div className="top-tabs">
        <button
          className={`top-tab ${tab === "my-agent" ? "active" : ""}`}
          onClick={() => {
            hapticSelection();
            setTab("my-agent");
          }}
        >
          My Agent
        </button>
        <button
          className={`top-tab ${tab === "all-agents" ? "active" : ""}`}
          onClick={() => {
            hapticSelection();
            setTab("all-agents");
          }}
        >
          All Agents
        </button>
        <button
          className={`top-tab ${tab === "skills" ? "active" : ""}`}
          onClick={() => {
            hapticSelection();
            setTab("skills");
          }}
        >
          Skills
        </button>
      </div>

      {/* =================== MY AGENT TAB =================== */}
      {tab === "my-agent" && (
        <>
          {!myAgent ? (
            /* Claim card */
            <div className="card" style={{ padding: 20 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, var(--accent, #6366f1), #a855f7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    fontSize: 28,
                  }}
                >
                  {"\uD83E\uDD16"}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  Claim Your Agent
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                    marginBottom: 16,
                  }}
                >
                  Secure one of 10 exclusive agent slots. Your agent can learn
                  skills, boost events, and earn rewards -- all powered by x402
                  micropayments.
                </div>
              </div>
              <input
                className="input"
                type="text"
                placeholder="Agent name (optional)"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <button
                className="btn btn-primary btn-block"
                onClick={handleClaim}
                disabled={claiming}
                style={{ opacity: claiming ? 0.6 : 1 }}
              >
                {claiming ? "Claiming..." : "Claim Your Agent"}
              </button>
              {agentsData && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    textAlign: "center",
                    marginTop: 10,
                  }}
                >
                  {agentsData.stats.open} of {agentsData.stats.total} slots
                  available
                </div>
              )}
            </div>
          ) : (
            /* Agent detail card */
            <>
              <div className="card" style={{ padding: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, var(--accent, #6366f1), #a855f7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {"\uD83E\uDD16"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}
                    >
                      {myAgent.name || `Agent #${myAgent.slot}`}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      Slot #{myAgent.slot} &middot;{" "}
                      <span style={statusBadgeStyle(myAgent.status)}>
                        {myAgent.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      padding: "10px 4px",
                      background: "rgba(99, 102, 241, 0.08)",
                      borderRadius: "var(--radius, 12px)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "var(--accent, #6366f1)",
                      }}
                    >
                      {formatUSDC(myAgent.balance)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Balance
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "10px 4px",
                      background: "rgba(34, 197, 94, 0.08)",
                      borderRadius: "var(--radius, 12px)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "var(--green, #22c55e)",
                      }}
                    >
                      {formatUSDC(myAgent.totalEarned)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Earned
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "10px 4px",
                      background: "rgba(239, 68, 68, 0.08)",
                      borderRadius: "var(--radius, 12px)",
                    }}
                  >
                    <div
                      style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}
                    >
                      {formatUSDC(myAgent.totalSpent)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Spent
                    </div>
                  </div>
                </div>

                {/* Skills list */}
                {myAgent.skills.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "var(--text-muted)",
                      }}
                    >
                      Skills
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {myAgent.skills.map((skill) => (
                        <span
                          key={skill}
                          className="badge badge-accent"
                          style={{ fontSize: 12 }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {myAgent.skills.length === 0 && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      textAlign: "center",
                      padding: "8px 0 16px",
                      fontStyle: "italic",
                    }}
                  >
                    No skills yet. Visit the Skills tab to upgrade your agent.
                  </div>
                )}

                {/* Quick actions */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--text-muted)",
                  }}
                >
                  Quick Actions
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-block"
                    style={{
                      background: "rgba(99, 102, 241, 0.12)",
                      color: "var(--accent, #6366f1)",
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "10px 12px",
                      borderRadius: "var(--radius, 12px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                    onClick={() => {
                      hapticSelection();
                      setShowBoost(true);
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 15, height: 15 }}
                    >
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    Boost Event
                  </button>
                  <button
                    className="btn btn-block"
                    style={{
                      background: "rgba(34, 197, 94, 0.1)",
                      color: "var(--green, #22c55e)",
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "10px 12px",
                      borderRadius: "var(--radius, 12px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                    onClick={() => {
                      hapticSelection();
                      setShowTip(true);
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 15, height: 15 }}
                    >
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                    Send Tip
                  </button>
                </div>
              </div>

              {/* Transaction history */}
              {transactions.length > 0 && (
                <>
                  <div className="section-title">Transaction History</div>
                  <div className="card">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
                            {tx.type.replace(/_/g, " ")}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                            }}
                          >
                            {timeAgo(tx.createdAt)}
                            {tx.skillSlug && ` - ${tx.skillSlug}`}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color:
                              tx.direction === "in"
                                ? "var(--green, #22c55e)"
                                : "#ef4444",
                          }}
                        >
                          {txIcon(tx.type, tx.direction)}
                          {formatUSDC(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {transactions.length === 0 && (
                <>
                  <div className="section-title">Transaction History</div>
                  <div className="card">
                    <div
                      style={{
                        textAlign: "center",
                        color: "var(--text-muted)",
                        padding: 16,
                        fontSize: 13,
                      }}
                    >
                      No transactions yet. Boost an event or purchase a skill to
                      get started.
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* =================== ALL AGENTS TAB =================== */}
      {tab === "all-agents" && (
        <>
          {agentsData && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                justifyContent: "center",
              }}
            >
              <span
                className="badge badge-accent"
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                {agentsData.stats.claimed} claimed
              </span>
              <span
                className="badge badge-green"
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                {agentsData.stats.open} open
              </span>
              {agentsData.stats.reserved > 0 && (
                <span
                  className="badge badge-yellow"
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  {agentsData.stats.reserved} reserved
                </span>
              )}
            </div>
          )}

          {agentsData?.agents.map((agent) => (
            <div
              key={agent.slot}
              className="card"
              style={{
                padding: 14,
                marginBottom: 8,
                opacity: agent.status === "open" ? 0.8 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background:
                      agent.status === "open"
                        ? "rgba(255,255,255,0.06)"
                        : "linear-gradient(135deg, var(--accent, #6366f1), #a855f7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: agent.status === "open" ? 14 : 20,
                    fontWeight: 700,
                    color:
                      agent.status === "open"
                        ? "var(--text-muted)"
                        : "#fff",
                    flexShrink: 0,
                  }}
                >
                  {agent.status === "open" ? `#${agent.slot}` : "\uD83E\uDD16"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      {agent.agentName || `Slot #${agent.slot}`}
                    </span>
                    <span style={statusBadgeStyle(agent.status)}>
                      {agent.status}
                    </span>
                  </div>
                  {agent.displayName && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {agent.displayName}
                    </div>
                  )}
                  {agent.skills.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        marginTop: 6,
                      }}
                    >
                      {agent.skills.map((s) => (
                        <span
                          key={s}
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 99,
                            background: "rgba(99, 102, 241, 0.1)",
                            color: "var(--accent, #6366f1)",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {agent.status !== "open" && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {agent.skills.length} skill
                      {agent.skills.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {(!agentsData || agentsData.agents.length === 0) && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\uD83E\uDD16"}</div>
                <div className="empty-state-title">No agents yet</div>
                <div className="empty-state-text">
                  Agent slots will appear here once configured.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* =================== SKILLS TAB =================== */}
      {tab === "skills" && (
        <>
          {/* x402 explainer */}
          <div
            className="card"
            style={{
              padding: 14,
              marginBottom: 12,
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))",
              border: "1px solid rgba(99, 102, 241, 0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent, #6366f1)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 18, height: 18, flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--accent, #6366f1)",
                }}
              >
                Powered by x402
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              Skills use the x402 protocol for HTTP-native micropayments. When
              your agent uses a skill, it pays per-request in USDC on Base --
              no subscriptions, no API keys, just seamless machine-to-machine
              payments.
            </div>
          </div>

          {agentsData?.skills.map((skill) => {
            const owned = myAgent?.skills.includes(skill.slug);
            return (
              <div
                key={skill.slug}
                className="card"
                style={{ padding: 14, marginBottom: 8 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        marginBottom: 2,
                      }}
                    >
                      {skill.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      {skill.description}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--accent, #6366f1)",
                      }}
                    >
                      {formatUSDC(skill.price_usdc)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        textTransform: "capitalize",
                      }}
                    >
                      {skill.category}
                    </div>
                  </div>
                </div>

                {skill.capabilities.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      marginBottom: 10,
                    }}
                  >
                    {skill.capabilities.map((cap) => (
                      <span
                        key={cap}
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 99,
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}

                {owned ? (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--green, #22c55e)",
                      textAlign: "center",
                      padding: "6px 0",
                    }}
                  >
                    Owned
                  </div>
                ) : myAgent ? (
                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => handlePurchaseSkill(skill.slug)}
                    disabled={purchasing === skill.slug}
                    style={{
                      fontSize: 13,
                      padding: "8px 12px",
                      opacity: purchasing === skill.slug ? 0.6 : 1,
                    }}
                  >
                    {purchasing === skill.slug
                      ? "Purchasing..."
                      : `Buy for ${formatUSDC(skill.price_usdc)}`}
                  </button>
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      textAlign: "center",
                      padding: "6px 0",
                      fontStyle: "italic",
                    }}
                  >
                    Claim an agent first to purchase skills
                  </div>
                )}
              </div>
            );
          })}

          {(!agentsData || agentsData.skills.length === 0) && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">{"\uD83D\uDCA1"}</div>
                <div className="empty-state-title">No skills available</div>
                <div className="empty-state-text">
                  Skills will be added soon. Check back later!
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* =================== BOOST MODAL =================== */}
      {showBoost && (
        <div
          className="modal-overlay"
          onClick={() => setShowBoost(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card">
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>
                Boost Event
              </h2>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                  lineHeight: 1.4,
                }}
              >
                Enter an event ID to boost it with your agent. Boosted events
                get higher visibility.
              </div>
              <input
                className="input"
                type="text"
                placeholder="Event ID"
                value={boostEventId}
                onChange={(e) => setBoostEventId(e.target.value)}
                style={{ marginBottom: 12 }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleBoost}
                  disabled={boosting || !boostEventId.trim()}
                  style={{ opacity: boosting ? 0.6 : 1 }}
                >
                  {boosting ? "Boosting..." : "Boost"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowBoost(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== TIP MODAL =================== */}
      {showTip && (
        <div
          className="modal-overlay"
          onClick={() => setShowTip(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card">
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>
                Send Tip
              </h2>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                  lineHeight: 1.4,
                }}
              >
                Tip another agent's owner in USDC. Supports the FlowB ecosystem.
              </div>
              <input
                className="input"
                type="text"
                placeholder="Recipient user ID"
                value={tipRecipient}
                onChange={(e) => setTipRecipient(e.target.value)}
                style={{ marginBottom: 8 }}
                autoFocus
              />
              <input
                className="input"
                type="number"
                placeholder="Amount (USDC)"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                style={{ marginBottom: 8 }}
                min="0.01"
                step="0.01"
              />
              <input
                className="input"
                type="text"
                placeholder="Message (optional)"
                value={tipMessage}
                onChange={(e) => setTipMessage(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleTip}
                  disabled={
                    tipping || !tipRecipient.trim() || !tipAmount.trim()
                  }
                  style={{ opacity: tipping ? 0.6 : 1 }}
                >
                  {tipping ? "Sending..." : "Send Tip"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowTip(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
