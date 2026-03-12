import { useState, useEffect } from "react";
import { getSponsorWallet, createSponsorship, createCheckout, confirmCheckout } from "../api/client";

interface Props {
  targetType: "event" | "location" | "featured_event";
  targetId: string;
  targetTitle?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const BOOST_TIERS = [
  { slug: "event-boost-basic", label: "24h", price: 5, hours: 24 },
  { slug: "event-boost-pro", label: "48h", price: 15, hours: 48 },
  { slug: "event-boost-mega", label: "72h", price: 50, hours: 72 },
];

export function SponsorModal({ targetType, targetId, targetTitle, onClose, onSuccess }: Props) {
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"tiers" | "custom">("tiers");
  const [selectedTier, setSelectedTier] = useState<typeof BOOST_TIERS[0] | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"select" | "pay" | "confirm">("select");
  const [orderId, setOrderId] = useState<string | null>(null);

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
      setResult({ ok: true, message: `Boost submitted! +25 pts. Verifying on-chain...` });
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      onSuccess?.();
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Failed to submit" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTierSelect = async (tier: typeof BOOST_TIERS[0]) => {
    setSelectedTier(tier);
    setSubmitting(true);
    try {
      const intent = await createCheckout({
        productSlug: tier.slug,
        paymentMethod: "usdc_direct",
        metadata: { eventId: targetId, eventTitle: targetTitle },
      });
      setOrderId(intent.orderId);
      setCheckoutStep("pay");
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Failed to create checkout" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTierPayment = async () => {
    if (!orderId || !txHash.trim()) {
      setResult({ ok: false, message: "Enter your transaction hash" });
      return;
    }
    if (!txHash.startsWith("0x")) {
      setResult({ ok: false, message: "Transaction hash must start with 0x" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await confirmCheckout({ orderId, txHash: txHash.trim() });
      if (res.success) {
        setResult({ ok: true, message: `Boost activated for ${selectedTier?.hours}h! Event will appear at top of feeds.` });
        (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
        onSuccess?.();
      } else {
        setResult({ ok: false, message: res.error || "Payment verification failed" });
      }
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Failed to confirm payment" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sponsor-modal" onClick={onClose}>
      <div className="sponsor-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="sponsor-modal-handle" />
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          Boost this {targetType === "featured_event" ? "event" : targetType}
        </h2>
        <p style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
          {mode === "tiers"
            ? "Choose a boost duration. Your event will appear at the top of everyone's feed."
            : "Send USDC on Base to the FlowB wallet, then paste your tx hash below."}
        </p>

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
              {result.ok ? "Boost Activated!" : "Error"}
            </div>
            <div style={{ fontSize: 13, color: "var(--hint)" }}>{result.message}</div>
            {result.ok && (
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 12 }}>
                Done
              </button>
            )}
          </div>
        ) : mode === "tiers" && checkoutStep === "select" ? (
          <>
            {/* Boost tier selection */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {BOOST_TIERS.map((tier) => (
                <button
                  key={tier.slug}
                  className="btn btn-secondary"
                  onClick={() => handleTierSelect(tier)}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "12px 8px",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700 }}>${tier.price}</span>
                  <span style={{ fontSize: 12, color: "var(--hint)" }}>{tier.label}</span>
                </button>
              ))}
            </div>

            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <button
                onClick={() => setMode("custom")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--link)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Or enter custom amount
              </button>
            </div>

            <button className="btn btn-secondary btn-block" onClick={onClose}>
              Cancel
            </button>
          </>
        ) : mode === "tiers" && checkoutStep === "pay" ? (
          <>
            {/* Payment step for tier */}
            <div style={{
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-sm)",
              padding: 12,
              marginBottom: 16,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 13, color: "var(--hint)", marginBottom: 4 }}>Selected Boost</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>${selectedTier?.price} • {selectedTier?.label}</div>
            </div>

            {/* Wallet address */}
            <div style={{ marginBottom: 16 }}>
              <div className="sponsor-label">Send USDC to (Base)</div>
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

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary btn-block"
                onClick={handleConfirmTierPayment}
                disabled={submitting || !txHash}
              >
                {submitting ? "Verifying..." : "Confirm Payment"}
              </button>
              <button className="btn btn-secondary" onClick={() => { setCheckoutStep("select"); setSelectedTier(null); }}>
                Back
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Custom amount flow */}
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

            {/* Amount input */}
            <div style={{ marginBottom: 12 }}>
              <div className="sponsor-label">Amount (USDC, min $0.10)</div>
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

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
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

            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => setMode("tiers")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--link)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ← Back to preset tiers
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
