import { useState, useEffect, useCallback } from "react";
import { getBoostStatus, createBoostCheckout, confirmCryptoBoost, type BoostStatus, type BoostCheckoutResult } from "../api/client";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = "crypto" | "stripe" | "apple_pay";
type Step = "form" | "crypto_payment" | "stripe_payment" | "success" | "error";

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Resetting...";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export function FeaturedSponsorModal({ onClose, onSuccess }: Props) {
  const [status, setStatus] = useState<BoostStatus | null>(null);
  const [eventUrl, setEventUrl] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("crypto");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkout, setCheckout] = useState<BoostCheckoutResult | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Load boost status
  useEffect(() => {
    getBoostStatus()
      .then((s) => {
        setStatus(s);
        setCountdown(s.cycle.timeRemainingSeconds);
      })
      .catch(console.error);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleCopy = useCallback(async () => {
    const address = checkout?.wallet || status?.wallet;
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    } catch {}
  }, [checkout, status]);

  const minBid = status?.minNextBid || 0.10;
  const currentHighest = status?.cycle.highestBidUsdc || 0;
  const winningEvent = status?.cycle.winningEventUrl;

  const handleCheckout = async () => {
    setError(null);

    // Validate URL
    if (!eventUrl.trim()) {
      setError("Enter your event URL");
      return;
    }
    try {
      new URL(eventUrl.trim());
    } catch {
      setError("Enter a valid URL (e.g. https://lu.ma/your-event)");
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < minBid) {
      setError(`Minimum bid is $${minBid.toFixed(2)} USDC to take the top spot`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createBoostCheckout(eventUrl.trim(), amountNum, paymentMethod);
      setCheckout(result);

      if (paymentMethod === "crypto") {
        setStep("crypto_payment");
      } else {
        // For Stripe/Apple Pay, we'd integrate with Stripe Elements here
        // For now, show a message about future support
        setError("Card payments coming soon! Please use crypto (USDC on Base) for now.");
        setSubmitting(false);
        return;
      }
    } catch (err: any) {
      setError(err.message || "Failed to create checkout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCrypto = async () => {
    if (!checkout?.sponsorshipId) {
      setError("Missing sponsorship ID");
      return;
    }
    if (!txHash.trim() || !txHash.startsWith("0x") || txHash.length !== 66) {
      setError("Enter a valid transaction hash (0x... 66 characters)");
      return;
    }

    setSubmitting(true);
    try {
      const result = await confirmCryptoBoost(checkout.sponsorshipId, txHash.trim());
      if (result.success) {
        setStep("success");
        (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
        onSuccess?.();
      } else {
        setError(result.message || "Verification failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to confirm payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sponsor-modal" onClick={onClose}>
      <div className="sponsor-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="sponsor-modal-handle" />

        {/* Header */}
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          Boost Your Event
        </h2>
        <p style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
          Win the featured spot by outbidding the current top boost. Amount resets every 24 hours - the last boost stays until someone bids higher.
        </p>

        {/* Countdown Timer */}
        {countdown > 0 && (
          <div style={{
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            marginBottom: 16,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
              Cycle resets in
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: "var(--accent)" }}>
              {formatCountdown(countdown)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              After reset, min bid returns to $0.10
            </div>
          </div>
        )}

        {/* Current highest boost */}
        {currentHighest > 0 && (
          <div style={{
            background: "rgba(168, 85, 247, 0.08)",
            border: "1px solid rgba(168, 85, 247, 0.2)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            marginBottom: 16,
            fontSize: 13,
          }}>
            <div style={{ fontWeight: 600, color: "var(--purple)", marginBottom: 2 }}>
              Current top boost: ${currentHighest.toFixed(2)} USDC
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Bid at least ${minBid.toFixed(2)} USDC to take the top spot
            </div>
            {winningEvent && (
              <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4, wordBreak: "break-all" }}>
                {winningEvent}
              </div>
            )}
          </div>
        )}

        {/* Step: Form */}
        {step === "form" && (
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
                Bid Amount (USDC, min ${minBid.toFixed(2)})
              </div>
              <input
                className="input sponsor-amount-input"
                type="number"
                step="0.01"
                min={minBid.toFixed(2)}
                placeholder={minBid.toFixed(2)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Payment Method Selection */}
            <div style={{ marginBottom: 16 }}>
              <div className="sponsor-label">Payment Method</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`btn btn-sm ${paymentMethod === "crypto" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setPaymentMethod("crypto")}
                  style={{ flex: 1, fontSize: 12 }}
                >
                  USDC (Base)
                </button>
                <button
                  className={`btn btn-sm ${paymentMethod === "stripe" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setPaymentMethod("stripe")}
                  style={{ flex: 1, fontSize: 12, opacity: 0.5 }}
                  disabled
                >
                  Card (Soon)
                </button>
                <button
                  className={`btn btn-sm ${paymentMethod === "apple_pay" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setPaymentMethod("apple_pay")}
                  style={{ flex: 1, fontSize: 12, opacity: 0.5 }}
                  disabled
                >
                  Apple Pay (Soon)
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: "10px 12px",
                background: "rgba(239, 68, 68, 0.08)",
                borderRadius: "var(--radius-sm)",
                marginBottom: 12,
                fontSize: 13,
                color: "var(--red)",
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary btn-block"
                onClick={handleCheckout}
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Continue to Payment"}
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Step: Crypto Payment */}
        {step === "crypto_payment" && checkout && (
          <>
            {/* Wallet address */}
            <div style={{ marginBottom: 16 }}>
              <div className="sponsor-label">Send USDC on Base to:</div>
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
                {checkout.wallet}
                <span style={{ float: "right", color: "var(--accent)", fontSize: 12 }}>
                  {copied ? "Copied!" : "Copy"}
                </span>
              </div>
            </div>

            {/* Amount reminder */}
            <div style={{
              background: "rgba(34, 197, 94, 0.08)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              marginBottom: 16,
              fontSize: 14,
              textAlign: "center",
            }}>
              <span style={{ color: "var(--green)", fontWeight: 600 }}>
                Send exactly ${checkout.amountUsdc.toFixed(2)} USDC
              </span>
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

            {error && (
              <div style={{
                padding: "10px 12px",
                background: "rgba(239, 68, 68, 0.08)",
                borderRadius: "var(--radius-sm)",
                marginBottom: 12,
                fontSize: 13,
                color: "var(--red)",
              }}>
                {error}
              </div>
            )}

            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Send USDC on Base network, then paste your transaction hash above. We'll verify on-chain and activate your boost.
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary btn-block"
                onClick={handleConfirmCrypto}
                disabled={submitting}
              >
                {submitting ? "Verifying..." : "Confirm Payment"}
              </button>
              <button className="btn btn-secondary" onClick={() => setStep("form")}>
                Back
              </button>
            </div>
          </>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div style={{
            padding: "24px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#x1F680;</div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--green)",
              marginBottom: 8,
            }}>
              Boost Submitted!
            </div>
            <div style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
              Your payment is being verified on-chain. Once confirmed, your event will appear at the top of the home screen.
            </div>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div style={{
            padding: "24px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#x26A0;</div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--red)",
              marginBottom: 8,
            }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
              {error || "Please try again or contact support."}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn btn-secondary" onClick={() => setStep("form")}>
                Try Again
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
