import { useState, useEffect } from "react";
import { getSponsorWallet, createSponsorship, getFeaturedEventBoost } from "../api/client";
import type { FeaturedEventBoost } from "../api/types";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function FeaturedSponsorModal({ onClose, onSuccess }: Props) {
  const [walletAddress, setWalletAddress] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentBoost, setCurrentBoost] = useState<FeaturedEventBoost | null>(null);

  useEffect(() => {
    getSponsorWallet().then(setWalletAddress).catch(console.error);
    getFeaturedEventBoost().then(setCurrentBoost).catch(console.error);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    } catch {}
  };

  const handleSubmit = async () => {
    if (!eventUrl.trim()) {
      setResult({ ok: false, message: "Enter your event URL" });
      return;
    }
    try {
      new URL(eventUrl.trim());
    } catch {
      setResult({ ok: false, message: "Enter a valid URL (e.g. https://lu.ma/...)" });
      return;
    }

    const amountNum = parseFloat(amount);
    const minBoost = currentBoost ? currentBoost.amount_usdc + 0.10 : 0.10;
    if (!amountNum || amountNum < minBoost) {
      setResult({ ok: false, message: `Minimum boost is $${minBoost.toFixed(2)} USDC` });
      return;
    }
    if (!txHash.trim() || !txHash.startsWith("0x")) {
      setResult({ ok: false, message: "Enter a valid tx hash (starts with 0x)" });
      return;
    }

    setSubmitting(true);
    try {
      await createSponsorship("featured_event", eventUrl.trim(), amountNum, txHash.trim());
      setResult({ ok: true, message: "Boost submitted! +25 pts. Verifying on-chain..." });
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      onSuccess?.();
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Failed to submit" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sponsor-modal" onClick={onClose}>
      <div className="sponsor-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="sponsor-modal-handle" />
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          Boost Your Event
        </h2>
        <p style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
          Boost your event to the top of the FlowB home screen. The highest boost wins the featured spot.
        </p>

        {/* Current highest boost */}
        {currentBoost && (
          <div style={{
            background: "rgba(168, 85, 247, 0.08)",
            border: "1px solid rgba(168, 85, 247, 0.2)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            marginBottom: 16,
            fontSize: 13,
          }}>
            <div style={{ fontWeight: 600, color: "var(--purple)", marginBottom: 2 }}>
              Current top boost: ${currentBoost.amount_usdc.toFixed(2)} USDC
            </div>
            <div style={{ color: "var(--text-muted)" }}>
              Boost at least ${(currentBoost.amount_usdc + 0.10).toFixed(2)} USDC to take the top spot
            </div>
          </div>
        )}

        {/* Wallet address */}
        <div style={{ marginBottom: 16 }}>
          <div className="sponsor-label">FlowB Wallet (Base)</div>
          <div
            onClick={handleCopy}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              fontSize: 13,
              fontFamily: "monospace",
              wordBreak: "break-all",
              cursor: "pointer",
              color: "var(--text)",
            }}
          >
            {walletAddress || "Loading..."}
            <span style={{ float: "right", color: "var(--accent)", fontSize: 12 }}>
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
              fontSize: 15,
              fontWeight: 600,
              color: result.ok ? "var(--green)" : "var(--red)",
              marginBottom: 4,
            }}>
              {result.ok ? "Boost Submitted!" : "Error"}
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
            {/* Event URL input */}
            <div style={{ marginBottom: 12 }}>
              <div className="sponsor-label">Your Event Link</div>
              <input
                className="input"
                type="url"
                placeholder="https://lu.ma/your-event"
                value={eventUrl}
                onChange={(e) => setEventUrl(e.target.value)}
                style={{ fontSize: 16 }}
              />
            </div>

            {/* Amount input */}
            <div style={{ marginBottom: 12 }}>
              <div className="sponsor-label">
                Boost Amount (USDC{currentBoost ? `, min $${(currentBoost.amount_usdc + 0.10).toFixed(2)}` : ", min $0.10"})
              </div>
              <input
                className="input sponsor-amount-input"
                type="number"
                step="0.01"
                min={currentBoost ? (currentBoost.amount_usdc + 0.10).toFixed(2) : "0.10"}
                placeholder={currentBoost ? (currentBoost.amount_usdc + 0.10).toFixed(2) : "0.10"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Tx hash input */}
            <div style={{ marginBottom: 16 }}>
              <div className="sponsor-label">Transaction Hash</div>
              <input
                className="input"
                type="text"
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 16 }}
              />
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Send USDC on Base to the wallet above, then paste your tx hash. Once verified, your event gets boosted to the top.
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary btn-block"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Boost"}
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
