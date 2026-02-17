import { useState, useEffect } from "react";
import { getSponsorWallet, createSponsorship } from "../api/client";

interface Props {
  targetType: "event" | "location";
  targetId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SponsorModal({ targetType, targetId, onClose, onSuccess }: Props) {
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getSponsorWallet().then(setWalletAddress).catch(console.error);
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
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 0.10) {
      setResult({ ok: false, message: "Minimum $0.10 USDC" });
      return;
    }
    if (!txHash.trim() || !txHash.startsWith("0x")) {
      setResult({ ok: false, message: "Enter a valid tx hash (starts with 0x)" });
      return;
    }

    setSubmitting(true);
    try {
      await createSponsorship(targetType, targetId, amountNum, txHash.trim());
      setResult({ ok: true, message: `Sponsorship submitted! +25 pts. Verifying on-chain...` });
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      onSuccess?.();
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Failed to submit" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="card sponsor-modal">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            Sponsor this {targetType}
          </h2>
          <p style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
            Send USDC on Base to the FlowB wallet, then paste your tx hash below.
          </p>

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
                {result.ok ? "Submitted!" : "Error"}
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
              {/* Amount input */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Amount (USDC, min $0.10)
                </div>
                <input
                  className="input sponsor-amount-input"
                  type="number"
                  step="0.01"
                  min="0.10"
                  placeholder="0.10"
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

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Sponsorship"}
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
