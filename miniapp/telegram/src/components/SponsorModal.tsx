import { useState, useEffect } from "react";
import { getSponsorWallet, createSponsorship, createCheckout, confirmCheckout, getToken } from "../api/client";

interface Props {
  targetType: "event" | "location" | "featured_event";
  targetId: string;
  targetTitle?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = "telegram_stars" | "wallet_connect" | "stripe" | "usdc_direct";

const BOOST_TIERS = [
  { slug: "event-boost-basic", label: "24h", price: 5, hours: 24, stars: 250 },
  { slug: "event-boost-pro", label: "48h", price: 15, hours: 48, stars: 750 },
  { slug: "event-boost-mega", label: "72h", price: 50, hours: 72, stars: 2500 },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; description: string }[] = [
  { id: "telegram_stars", label: "Telegram Stars", icon: "⭐", description: "Pay with Stars" },
  { id: "wallet_connect", label: "Connect Wallet", icon: "🔗", description: "WalletConnect" },
  { id: "stripe", label: "Card", icon: "💳", description: "Credit/Debit" },
  { id: "usdc_direct", label: "USDC Transfer", icon: "💵", description: "Manual transfer" },
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"select_tier" | "select_payment" | "pay" | "confirm">("select_tier");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const tg = (window as any).Telegram?.WebApp;
  const isAuthenticated = !!getToken();

  useEffect(() => {
    getSponsorWallet().then(setWalletAddress).catch(console.error);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      tg?.HapticFeedback?.impactOccurred("light");
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
      tg?.HapticFeedback?.notificationOccurred("success");
      onSuccess?.();
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Failed to submit" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTierSelect = (tier: typeof BOOST_TIERS[0]) => {
    setSelectedTier(tier);
    setCheckoutStep("select_payment");
    tg?.HapticFeedback?.impactOccurred("light");
  };

  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    if (!selectedTier) return;

    // Check authentication
    if (!isAuthenticated) {
      setNeedsAuth(true);
      return;
    }

    setSelectedPaymentMethod(method);
    setSubmitting(true);

    try {
      const intent = await createCheckout({
        productSlug: selectedTier.slug,
        paymentMethod: method,
        metadata: { eventId: targetId, eventTitle: targetTitle },
      });

      setOrderId(intent.orderId);
      setPaymentIntent(intent);

      // Handle different payment methods
      if (method === "telegram_stars") {
        // Open Telegram Stars payment
        if (intent.telegramInvoiceUrl) {
          tg?.openInvoice(intent.telegramInvoiceUrl, (status: string) => {
            if (status === "paid") {
              setResult({ ok: true, message: `Boost activated for ${selectedTier.hours}h!` });
              tg?.HapticFeedback?.notificationOccurred("success");
              onSuccess?.();
            } else if (status === "cancelled") {
              setCheckoutStep("select_payment");
            } else {
              setResult({ ok: false, message: "Payment failed" });
            }
          });
        } else {
          setResult({ ok: false, message: "Telegram Stars not available" });
        }
      } else if (method === "stripe") {
        // For Stripe, open the hosted checkout page
        if (intent.stripeCheckoutUrl) {
          tg?.openLink(intent.stripeCheckoutUrl);
          setCheckoutStep("confirm");
        } else {
          setResult({ ok: false, message: "Stripe checkout not available. Please try another payment method." });
        }
      } else if (method === "wallet_connect") {
        // Show WalletConnect payment UI
        setCheckoutStep("pay");
      } else {
        // USDC Direct - show manual transfer UI
        setCheckoutStep("pay");
      }

      tg?.HapticFeedback?.impactOccurred("medium");
    } catch (err: any) {
      // Handle auth errors
      if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
        setNeedsAuth(true);
      } else {
        setResult({ ok: false, message: err.message || "Failed to create checkout" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = () => {
    // Try to re-authenticate with Telegram
    if (tg?.initData) {
      window.location.reload();
    } else {
      setResult({ ok: false, message: "Please open FlowB in Telegram to sign in" });
    }
  };

  const handleConfirmPayment = async () => {
    if (!orderId) return;

    if (selectedPaymentMethod === "wallet_connect" || selectedPaymentMethod === "usdc_direct") {
      if (!txHash.trim()) {
        setResult({ ok: false, message: "Enter your transaction hash" });
        return;
      }
      if (!txHash.startsWith("0x")) {
        setResult({ ok: false, message: "Transaction hash must start with 0x" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await confirmCheckout({ orderId, txHash: txHash.trim() || undefined });
      if (res.success) {
        setResult({ ok: true, message: `Boost activated for ${selectedTier?.hours}h! Event will appear at top of feeds.` });
        tg?.HapticFeedback?.notificationOccurred("success");
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

  const handleOpenWallet = () => {
    if (!paymentIntent?.paymentAddress || !selectedTier) return;

    // Create deep link for wallet apps
    // Format: ethereum:address@chainId?value=amount
    const chainId = paymentIntent.chainId || 8453; // Base
    const usdcAmount = selectedTier.price;

    // Try to open wallet with payment details
    // This works for apps that support EIP-681
    const deepLink = `ethereum:${paymentIntent.paymentAddress}@${chainId}/transfer?address=${paymentIntent.paymentAddress}&uint256=${usdcAmount * 1e6}`;

    tg?.openLink(deepLink);
  };

  const goBack = () => {
    if (checkoutStep === "pay" || checkoutStep === "confirm") {
      setCheckoutStep("select_payment");
      setTxHash("");
    } else if (checkoutStep === "select_payment") {
      setCheckoutStep("select_tier");
      setSelectedTier(null);
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
          {checkoutStep === "select_tier" && "Choose a boost duration. Your event will appear at the top of everyone's feed."}
          {checkoutStep === "select_payment" && "Select how you'd like to pay"}
          {checkoutStep === "pay" && selectedPaymentMethod === "usdc_direct" && "Send USDC on Base, then paste your tx hash"}
          {checkoutStep === "pay" && selectedPaymentMethod === "wallet_connect" && "Connect your wallet to complete payment"}
          {checkoutStep === "confirm" && "Waiting for payment confirmation..."}
        </p>

        {needsAuth ? (
          <div style={{
            padding: "20px 16px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Sign in to Boost
            </div>
            <div style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16, lineHeight: 1.5 }}>
              You need to be signed in to purchase a boost. In Telegram, this happens automatically.
            </div>
            <button className="btn btn-primary btn-block" onClick={handleLogin} style={{ marginBottom: 8 }}>
              Sign In
            </button>
            <button className="btn btn-secondary btn-block" onClick={onClose}>
              Cancel
            </button>
          </div>
        ) : result ? (
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
            {result.ok ? (
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 12 }}>
                Done
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => setResult(null)} style={{ marginTop: 12 }}>
                Try Again
              </button>
            )}
          </div>
        ) : mode === "tiers" && checkoutStep === "select_tier" ? (
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
        ) : mode === "tiers" && checkoutStep === "select_payment" ? (
          <>
            {/* Selected tier summary */}
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

            {/* Payment method selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  className="btn btn-secondary"
                  onClick={() => handlePaymentMethodSelect(method.id)}
                  disabled={submitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{method.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{method.label}</div>
                    <div style={{ fontSize: 12, color: "var(--hint)" }}>
                      {method.id === "telegram_stars" && selectedTier ? `${selectedTier.stars} Stars` : method.description}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>

            <button className="btn btn-secondary btn-block" onClick={goBack}>
              ← Back
            </button>
          </>
        ) : mode === "tiers" && checkoutStep === "pay" ? (
          <>
            {/* Payment step */}
            <div style={{
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-sm)",
              padding: 12,
              marginBottom: 16,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 13, color: "var(--hint)", marginBottom: 4 }}>Amount Due</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>${selectedTier?.price} USDC</div>
            </div>

            {selectedPaymentMethod === "wallet_connect" && (
              <>
                {/* WalletConnect flow */}
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleOpenWallet}
                  style={{ marginBottom: 12 }}
                >
                  🔗 Open Wallet App
                </button>

                <div style={{ fontSize: 12, color: "var(--hint)", textAlign: "center", marginBottom: 16 }}>
                  Send ${selectedTier?.price} USDC on Base to:
                </div>

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
                    marginBottom: 16,
                  }}
                >
                  {paymentIntent?.paymentAddress || walletAddress || "Loading..."}
                  <span style={{ float: "right", color: "var(--accent)", fontSize: 12 }}>
                    {copied ? "Copied!" : "Copy"}
                  </span>
                </div>
              </>
            )}

            {selectedPaymentMethod === "usdc_direct" && (
              <>
                {/* Manual USDC transfer */}
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
                    {paymentIntent?.paymentAddress || walletAddress || "Loading..."}
                    <span style={{ float: "right", color: "var(--accent)", fontSize: 12 }}>
                      {copied ? "Copied!" : "Copy"}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Tx hash input for crypto payments */}
            {(selectedPaymentMethod === "wallet_connect" || selectedPaymentMethod === "usdc_direct") && (
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
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary btn-block"
                onClick={handleConfirmPayment}
                disabled={submitting || ((selectedPaymentMethod === "wallet_connect" || selectedPaymentMethod === "usdc_direct") && !txHash)}
              >
                {submitting ? "Verifying..." : "Confirm Payment"}
              </button>
              <button className="btn btn-secondary" onClick={goBack}>
                Back
              </button>
            </div>
          </>
        ) : mode === "tiers" && checkoutStep === "confirm" ? (
          <>
            {/* Stripe confirmation waiting */}
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Complete payment in browser</div>
              <div style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
                After completing payment, click below to verify.
              </div>
              <button
                className="btn btn-primary btn-block"
                onClick={handleConfirmPayment}
                disabled={submitting}
                style={{ marginBottom: 8 }}
              >
                {submitting ? "Verifying..." : "I've Completed Payment"}
              </button>
              <button className="btn btn-secondary btn-block" onClick={goBack}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Custom amount flow */}
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
