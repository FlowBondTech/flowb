import { useState, useEffect, useRef } from "react";
import { getSponsorWallet, createSponsorship, getFeaturedEventBid, searchEvents } from "../api/client";
import type { FeaturedEventBid, EventResult } from "../api/types";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function FeaturedSponsorModal({ onClose, onSuccess }: Props) {
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentBid, setCurrentBid] = useState<FeaturedEventBid | null>(null);

  // Event search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EventResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventResult | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    getSponsorWallet().then(setWalletAddress).catch(console.error);
    getFeaturedEventBid().then(setCurrentBid).catch(console.error);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      searchEvents(searchQuery.trim(), 8)
        .then(setSearchResults)
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    } catch {}
  };

  const handleSelectEvent = (ev: EventResult) => {
    setSelectedEvent(ev);
    setSearchQuery("");
    setSearchResults([]);
    (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  };

  const handleSubmit = async () => {
    if (!selectedEvent) {
      setResult({ ok: false, message: "Search and select an event first" });
      return;
    }

    const amountNum = parseFloat(amount);
    const minBid = currentBid ? currentBid.amount_usdc + 0.10 : 0.10;
    if (!amountNum || amountNum < minBid) {
      setResult({ ok: false, message: `Minimum bid is $${minBid.toFixed(2)} USDC` });
      return;
    }
    if (!txHash.trim() || !txHash.startsWith("0x")) {
      setResult({ ok: false, message: "Enter a valid tx hash (starts with 0x)" });
      return;
    }

    setSubmitting(true);
    try {
      await createSponsorship("featured_event", selectedEvent.id, amountNum, txHash.trim());
      setResult({ ok: true, message: "Bid submitted! +25 pts. Verifying on-chain..." });
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      onSuccess?.();
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Failed to submit" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dt: string) => {
    try {
      return new Date(dt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch { return dt; }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="card sponsor-modal">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            Feature Your Event
          </h2>
          <p style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
            Bid for the featured spot on the FlowB home screen. The highest verified bid wins the spot.
          </p>

          {/* Current highest bid */}
          {currentBid && (
            <div style={{
              background: "rgba(168, 85, 247, 0.08)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              marginBottom: 16,
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 600, color: "var(--purple)", marginBottom: 2 }}>
                Current top bid: ${currentBid.amount_usdc.toFixed(2)} USDC
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                You must bid at least ${(currentBid.amount_usdc + 0.10).toFixed(2)} USDC to outbid
              </div>
            </div>
          )}

          {/* Wallet address */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              FlowB Wallet (Base)
            </div>
            <div
              onClick={handleCopy}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                fontSize: 12,
                fontFamily: "monospace",
                wordBreak: "break-all",
                cursor: "pointer",
                color: "var(--text)",
              }}
            >
              {walletAddress || "Loading..."}
              <span style={{ float: "right", color: "var(--accent)", fontSize: 11 }}>
                {copied ? "Copied!" : "Copy"}
              </span>
            </div>
          </div>

          {result ? (
            <div style={{
              padding: "16px",
              textAlign: "center",
              background: result.ok ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
              borderRadius: "var(--radius-sm)",
              marginBottom: 12,
            }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: result.ok ? "var(--green)" : "var(--red)",
                marginBottom: 4,
              }}>
                {result.ok ? "Bid Submitted!" : "Error"}
              </div>
              <div style={{ fontSize: 13, color: "var(--hint)" }}>{result.message}</div>
              {result.ok && (
                <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 12 }}>
                  Done
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Event search */}
              <div style={{ marginBottom: 12, position: "relative" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Search for your event
                </div>
                {selectedEvent ? (
                  <div style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--accent)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {selectedEvent.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {formatTime(selectedEvent.startTime)}
                        {selectedEvent.locationName && ` \u00b7 ${selectedEvent.locationName}`}
                      </div>
                    </div>
                    <button
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, fontSize: 16, lineHeight: 1 }}
                      onClick={() => setSelectedEvent(null)}
                      title="Change event"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      className="input"
                      type="text"
                      placeholder="Search events by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ fontSize: 13 }}
                      autoFocus
                    />
                    {/* Search results dropdown */}
                    {(searchResults.length > 0 || searching) && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        maxHeight: 200,
                        overflowY: "auto",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                      }}>
                        {searching && (
                          <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-muted)" }}>
                            Searching...
                          </div>
                        )}
                        {searchResults.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => handleSelectEvent(ev)}
                            style={{
                              padding: "10px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border)",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "var(--bg-surface)"; }}
                            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{ev.title}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {formatTime(ev.startTime)}
                              {ev.locationName && ` \u00b7 ${ev.locationName}`}
                            </div>
                          </div>
                        ))}
                        {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                          <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-muted)" }}>
                            No events found
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Amount input */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Bid Amount (USDC{currentBid ? `, min $${(currentBid.amount_usdc + 0.10).toFixed(2)}` : ", min $0.10"})
                </div>
                <input
                  className="input sponsor-amount-input"
                  type="number"
                  step="0.01"
                  min={currentBid ? (currentBid.amount_usdc + 0.10).toFixed(2) : "0.10"}
                  placeholder={currentBid ? (currentBid.amount_usdc + 0.10).toFixed(2) : "0.10"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Tx hash input */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Transaction Hash
                </div>
                <input
                  className="input"
                  type="text"
                  placeholder="0x..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
              </div>

              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                Send USDC on Base to the wallet above, then paste your tx hash. Once verified, your event takes the featured spot.
              </p>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleSubmit}
                  disabled={submitting || !selectedEvent}
                >
                  {submitting ? "Submitting..." : "Submit Bid"}
                </button>
                <button className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
