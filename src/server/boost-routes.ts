/**
 * Event Boost Auction Routes
 *
 * 24-hour auction system where users bid to feature their event at the top.
 * Supports crypto (USDC on Base), Stripe, and Apple Pay.
 * Amount resets to $0.10 after 24h but last boost stays until outbid.
 */

import type { FastifyInstance } from "fastify";
import { authMiddleware } from "./auth.js";
import { getPaymentService } from "../services/payments/index.js";
import type { PaymentMethod } from "../services/payments/types.js";
import { createClient } from "@supabase/supabase-js";
import { log, fireAndForget } from "../utils/logger.js";

// Boost wallet for crypto payments (Base network)
const BOOST_WALLET_ADDRESS = "0xD9Ab3B89cb5E09fbdA46c20D8849fd1E75486002";

// USDC contract on Base
const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_RPC_URL = "https://mainnet.base.org";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

export function registerBoostRoutes(app: FastifyInstance) {
  const paymentService = getPaymentService();

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/v1/boost/status - Get current auction status
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/v1/boost/status", async () => {
    const supabase = getSupabase();

    // Get or create current cycle
    const { data: cycleData, error: cycleError } = await supabase
      .rpc("get_or_create_boost_cycle");

    if (cycleError) {
      log.error("[boost]", "Failed to get cycle", { error: cycleError.message });
      // Return default state if function doesn't exist yet
      return {
        cycle: {
          cycleId: 1,
          cycleNumber: 1,
          endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          minBidUsdc: 0.10,
          highestBidUsdc: 0,
          highestBidderUserId: null,
          winningEventUrl: null,
          timeRemainingSeconds: 86400,
        },
        wallet: BOOST_WALLET_ADDRESS,
        network: "base",
        paymentMethods: ["crypto", "stripe", "apple_pay"],
      };
    }

    const cycle = cycleData?.[0] || {};

    return {
      cycle: {
        cycleId: cycle.cycle_id,
        cycleNumber: cycle.cycle_number,
        endsAt: cycle.ends_at,
        minBidUsdc: parseFloat(cycle.min_bid_usdc) || 0.10,
        highestBidUsdc: parseFloat(cycle.highest_bid_usdc) || 0,
        highestBidderUserId: cycle.highest_bidder_user_id,
        winningEventUrl: cycle.winning_event_url,
        timeRemainingSeconds: cycle.time_remaining_seconds || 0,
      },
      minNextBid: Math.max(0.10, (parseFloat(cycle.highest_bid_usdc) || 0) + 0.10),
      wallet: BOOST_WALLET_ADDRESS,
      network: "base",
      paymentMethods: ["crypto", "stripe", "apple_pay"],
    };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/v1/boost/wallet - Get wallet address for crypto payments
  // ──────────────────────────────────────────────────────────────────────────
  app.get("/api/v1/boost/wallet", async () => {
    return { address: BOOST_WALLET_ADDRESS, network: "base" };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/v1/boost/checkout - Create boost checkout
  // ──────────────────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      eventUrl: string;
      amountUsdc: number;
      paymentMethod: "crypto" | "stripe" | "apple_pay";
    };
  }>(
    "/api/v1/boost/checkout",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { eventUrl, amountUsdc, paymentMethod } = request.body || {};

      if (!eventUrl) {
        return reply.status(400).send({ error: "eventUrl required" });
      }

      // Validate URL
      try {
        new URL(eventUrl);
      } catch {
        return reply.status(400).send({ error: "Invalid event URL" });
      }

      if (!amountUsdc || amountUsdc < 0.10) {
        return reply.status(400).send({ error: "Minimum bid is $0.10 USDC" });
      }

      if (!paymentMethod || !["crypto", "stripe", "apple_pay"].includes(paymentMethod)) {
        return reply.status(400).send({ error: "paymentMethod must be crypto, stripe, or apple_pay" });
      }

      const supabase = getSupabase();

      // Get current cycle to validate bid amount
      const { data: statusData } = await supabase.rpc("get_or_create_boost_cycle");
      const currentHighest = parseFloat(statusData?.[0]?.highest_bid_usdc) || 0;
      const minRequired = Math.max(0.10, currentHighest + 0.10);

      if (amountUsdc < minRequired) {
        return reply.status(400).send({
          error: `Minimum bid is $${minRequired.toFixed(2)} USDC to take the top spot`,
          currentHighest,
          minRequired,
        });
      }

      // For crypto payments, return wallet info
      if (paymentMethod === "crypto") {
        // Create pending sponsorship
        const { data: bidResult, error: bidError } = await supabase
          .rpc("place_boost_bid", {
            p_user_id: jwt.sub,
            p_event_url: eventUrl,
            p_amount_usdc: amountUsdc,
            p_payment_method: "crypto",
          });

        if (bidError) {
          log.error("[boost]", "Failed to place crypto bid", { error: bidError.message });
          return reply.status(500).send({ error: "Failed to create boost" });
        }

        const result = bidResult?.[0];

        return {
          method: "crypto",
          sponsorshipId: result?.sponsorship_id,
          wallet: BOOST_WALLET_ADDRESS,
          network: "base",
          chainId: 8453,
          amountUsdc,
          message: "Send USDC on Base to the wallet address, then confirm with your tx hash",
        };
      }

      // For Stripe/Apple Pay, create payment intent
      try {
        const stripeMethod: PaymentMethod = paymentMethod === "apple_pay" ? "apple_pay" : "stripe";

        // Create order through payment service
        const intent = await paymentService.createOrder({
          userId: jwt.sub,
          productSlug: "event-boost-custom",
          paymentMethod: stripeMethod,
          quantity: 1,
          metadata: {
            type: "event_boost",
            eventUrl,
            amountUsdc,
          },
        });

        // Create pending sponsorship linked to order
        const { data: bidResult, error: bidError } = await supabase
          .rpc("place_boost_bid", {
            p_user_id: jwt.sub,
            p_event_url: eventUrl,
            p_amount_usdc: amountUsdc,
            p_payment_method: paymentMethod,
            p_order_id: intent.orderId,
          });

        if (bidError) {
          log.error("[boost]", "Failed to place Stripe bid", { error: bidError.message });
        }

        return {
          method: paymentMethod,
          orderId: intent.orderId,
          sponsorshipId: bidResult?.[0]?.sponsorship_id,
          clientSecret: intent.clientSecret,
          stripePublishableKey: intent.stripePublishableKey,
          amountUsdc,
        };
      } catch (err: any) {
        log.error("[boost]", "Stripe checkout failed", { error: err.message });
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/v1/boost/confirm-crypto - Confirm crypto payment with tx hash
  // ──────────────────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      sponsorshipId: string;
      txHash: string;
    };
  }>(
    "/api/v1/boost/confirm-crypto",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { sponsorshipId, txHash } = request.body || {};

      if (!sponsorshipId || !txHash) {
        return reply.status(400).send({ error: "sponsorshipId and txHash required" });
      }

      if (!txHash.startsWith("0x") || txHash.length !== 66) {
        return reply.status(400).send({ error: "Invalid transaction hash format" });
      }

      const supabase = getSupabase();

      // Get the sponsorship
      const { data: sponsor, error: fetchError } = await supabase
        .from("flowb_sponsorships")
        .select("*")
        .eq("id", sponsorshipId)
        .eq("sponsor_user_id", jwt.sub)
        .single();

      if (fetchError || !sponsor) {
        return reply.status(404).send({ error: "Sponsorship not found" });
      }

      if (sponsor.status !== "pending") {
        return reply.status(400).send({ error: "Sponsorship already processed" });
      }

      // Update with tx hash
      await supabase
        .from("flowb_sponsorships")
        .update({ tx_hash: txHash })
        .eq("id", sponsorshipId);

      // Verify on-chain (async)
      fireAndForget(
        verifyAndUpdateBoost(supabase, sponsorshipId, txHash, sponsor.amount_usdc),
        "verify boost payment"
      );

      return {
        success: true,
        message: "Payment submitted for verification. Your boost will be active once confirmed on-chain.",
        sponsorshipId,
      };
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/v1/boost/confirm-stripe - Confirm Stripe/Apple Pay payment
  // ──────────────────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      orderId: string;
      paymentIntentId: string;
    };
  }>(
    "/api/v1/boost/confirm-stripe",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { orderId, paymentIntentId } = request.body || {};

      if (!orderId || !paymentIntentId) {
        return reply.status(400).send({ error: "orderId and paymentIntentId required" });
      }

      try {
        // Confirm payment through payment service
        const result = await paymentService.confirmPayment({
          orderId,
          paymentIntentId,
        });

        if (!result.success) {
          return reply.status(400).send({ error: result.error || "Payment verification failed" });
        }

        // Update sponsorship to verified
        const supabase = getSupabase();
        const { data: sponsor } = await supabase
          .from("flowb_sponsorships")
          .select("id")
          .eq("order_id", orderId)
          .single();

        if (sponsor) {
          await supabase.rpc("verify_boost_payment", { p_sponsorship_id: sponsor.id });
        }

        return {
          success: true,
          message: "Payment confirmed! Your event is now boosted to the top.",
          order: result.order,
        };
      } catch (err: any) {
        log.error("[boost]", "Stripe confirm failed", { error: err.message });
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Webhook handler for Stripe boost payments
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    "/webhooks/boost/stripe",
    { config: { rawBody: true } },
    async (request, reply) => {
      const signature = request.headers["stripe-signature"] as string;
      if (!signature) {
        return reply.status(400).send({ error: "Missing signature" });
      }

      try {
        const { StripeService } = await import("../services/payments/stripe.js");
        const stripeService = new StripeService();
        const rawBody = (request as any).rawBody;
        const event = stripeService.constructWebhookEvent(rawBody, signature);

        if (event.type === "payment_intent.succeeded") {
          const paymentIntent = event.data.object as any;
          const orderId = paymentIntent.metadata?.orderId;

          if (orderId) {
            const supabase = getSupabase();

            // Find and verify the sponsorship
            const { data: sponsor } = await supabase
              .from("flowb_sponsorships")
              .select("id")
              .eq("order_id", orderId)
              .single();

            if (sponsor) {
              await supabase.rpc("verify_boost_payment", { p_sponsorship_id: sponsor.id });
              log.info("[boost]", "Webhook verified boost payment", { sponsorshipId: sponsor.id });
            }
          }
        }

        return { received: true };
      } catch (err: any) {
        log.error("[boost]", "Webhook error", { error: err.message });
        return reply.status(400).send({ error: err.message });
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Helper: Verify USDC transfer on Base
// ════════════════════════════════════════════════════════════════════════════
async function verifyAndUpdateBoost(
  supabase: any,
  sponsorshipId: string,
  txHash: string,
  expectedAmount: number
): Promise<void> {
  try {
    const verified = await verifyUSDCTransfer(txHash, BOOST_WALLET_ADDRESS, expectedAmount);

    if (verified.valid) {
      // Use database function to verify and update winner
      await supabase.rpc("verify_boost_payment", { p_sponsorship_id: sponsorshipId });
      log.info("[boost]", "Crypto boost verified", { sponsorshipId, txHash });
    } else {
      // Mark as rejected
      await supabase
        .from("flowb_sponsorships")
        .update({ status: "rejected" })
        .eq("id", sponsorshipId);
      log.warn("[boost]", "Crypto boost rejected", { sponsorshipId, reason: verified.error });
    }
  } catch (err: any) {
    log.error("[boost]", "Verification error", { sponsorshipId, error: err.message });
  }
}

async function verifyUSDCTransfer(
  txHash: string,
  recipient: string,
  minAmount: number
): Promise<{ valid: boolean; amount?: number; error?: string }> {
  try {
    // Get transaction receipt
    const receiptRes = await fetch(BASE_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });
    const receiptData = await receiptRes.json();
    const receipt = receiptData?.result;

    if (!receipt) {
      return { valid: false, error: "Transaction not found or not confirmed" };
    }

    if (receipt.status !== "0x1") {
      return { valid: false, error: "Transaction failed" };
    }

    // Parse logs for ERC20 Transfer event
    // Transfer(address indexed from, address indexed to, uint256 value)
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const recipientPadded = "0x000000000000000000000000" + recipient.slice(2).toLowerCase();

    const transferLog = receipt.logs?.find(
      (log: any) =>
        log.address?.toLowerCase() === BASE_USDC_ADDRESS.toLowerCase() &&
        log.topics?.[0] === transferTopic &&
        log.topics?.[2]?.toLowerCase() === recipientPadded
    );

    if (!transferLog) {
      return { valid: false, error: "No USDC transfer to boost wallet found" };
    }

    // USDC has 6 decimals
    const rawAmount = BigInt(transferLog.data);
    const amount = Number(rawAmount) / 1e6;

    // Allow 1% slippage
    if (amount < minAmount * 0.99) {
      return { valid: false, error: `Amount $${amount.toFixed(2)} below minimum $${minAmount.toFixed(2)}` };
    }

    return { valid: true, amount };
  } catch (err: any) {
    return { valid: false, error: `RPC error: ${err.message}` };
  }
}
