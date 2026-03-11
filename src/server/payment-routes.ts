/**
 * Payment API Routes
 *
 * Handles product catalog, checkout, orders, subscriptions, and wallet management.
 * Supports multiple payment methods: Stripe, Apple Pay, WalletConnect, USDC, Telegram Stars.
 */

import type { FastifyInstance } from "fastify";
import { authMiddleware } from "./auth.js";
import { getPaymentService } from "../services/payments/index.js";
import type { PaymentMethod, PaymentNetwork } from "../services/payments/types.js";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// Supabase client
// ============================================================================

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.DANZ_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DANZ_SUPABASE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

// ============================================================================
// Route Registration
// ============================================================================

export function registerPaymentRoutes(app: FastifyInstance) {
  const paymentService = getPaymentService();

  // ──────────────────────────────────────────────────────────────────────────
  // Onboarding: Locations & Flow Purpose
  // ──────────────────────────────────────────────────────────────────────────

  // Get user locations
  app.get(
    "/api/v1/me/locations",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from("flowb_user_locations")
        .select("*")
        .eq("user_id", jwt.sub)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });

      if (error) throw new Error(error.message);

      return {
        locations: (data || []).map((l: any) => ({
          id: l.id,
          city: l.city,
          country: l.country,
          isPrimary: l.is_primary,
          sortOrder: l.sort_order,
        })),
      };
    }
  );

  // Add location
  app.post<{
    Body: { city: string; country: string; isPrimary?: boolean };
  }>(
    "/api/v1/me/locations",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { city, country, isPrimary } = request.body || {};

      if (!city || !country) {
        return reply.status(400).send({ error: "City and country required" });
      }

      const supabase = getSupabase();

      // Check limit (max 10)
      const { count } = await supabase
        .from("flowb_user_locations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", jwt.sub);

      if ((count || 0) >= 10) {
        return reply.status(400).send({ error: "Maximum 10 locations allowed" });
      }

      // Get next sort order
      const { data: existing } = await supabase
        .from("flowb_user_locations")
        .select("sort_order")
        .eq("user_id", jwt.sub)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSortOrder = existing?.[0]?.sort_order + 1 || 0;

      const { data, error } = await supabase
        .from("flowb_user_locations")
        .insert({
          user_id: jwt.sub,
          city,
          country,
          is_primary: isPrimary || false,
          sort_order: nextSortOrder,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return reply.status(400).send({ error: "Location already added" });
        }
        throw new Error(error.message);
      }

      return {
        location: {
          id: data.id,
          city: data.city,
          country: data.country,
          isPrimary: data.is_primary,
          sortOrder: data.sort_order,
        },
      };
    }
  );

  // Delete location
  app.delete<{ Params: { id: string } }>(
    "/api/v1/me/locations/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;

      const supabase = getSupabase();

      const { error } = await supabase
        .from("flowb_user_locations")
        .delete()
        .eq("id", id)
        .eq("user_id", jwt.sub);

      if (error) throw new Error(error.message);

      return { success: true };
    }
  );

  // Update onboarding (flow purpose, etc)
  app.patch<{
    Body: {
      flowPurpose?: "fun" | "biz" | "both";
      locations?: Array<{ city: string; country: string; isPrimary?: boolean }>;
    };
  }>(
    "/api/v1/me/onboarding",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { flowPurpose, locations } = request.body || {};

      const supabase = getSupabase();

      // Update flow purpose in session
      if (flowPurpose) {
        await supabase
          .from("flowb_sessions")
          .update({
            flow_purpose: flowPurpose,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq("user_id", jwt.sub);
      }

      // Add locations
      if (locations && locations.length > 0) {
        for (let i = 0; i < Math.min(locations.length, 10); i++) {
          const loc = locations[i];
          await supabase.from("flowb_user_locations").upsert(
            {
              user_id: jwt.sub,
              city: loc.city,
              country: loc.country,
              is_primary: i === 0 || loc.isPrimary || false,
              sort_order: i,
            },
            { onConflict: "user_id,city,country" }
          );
        }
      }

      return { success: true };
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Products
  // ──────────────────────────────────────────────────────────────────────────

  // List products
  app.get<{ Querystring: { category?: string; biz?: string } }>(
    "/api/v1/products",
    async (request) => {
      const { category, biz } = request.query;

      const products = await paymentService.getProducts({
        category,
        bizOnly: biz === "true" ? true : undefined,
      });

      return { products };
    }
  );

  // Get single product
  app.get<{ Params: { slug: string } }>(
    "/api/v1/products/:slug",
    async (request, reply) => {
      const { slug } = request.params;

      const product = await paymentService.getProduct(slug);
      if (!product) {
        return reply.status(404).send({ error: "Product not found" });
      }

      // Get supported networks for crypto payments
      const networks = await paymentService.getSupportedNetworks();

      return {
        product,
        pricing: {
          usdc: product.basePriceUsdc,
          telegramStars: product.telegramStarsPrice,
          supportedNetworks: networks.map((n) => ({
            id: n.id,
            name: n.name,
            chainId: n.chainId,
          })),
        },
      };
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Checkout
  // ──────────────────────────────────────────────────────────────────────────

  // Create checkout
  app.post<{
    Body: {
      productSlug: string;
      paymentMethod: PaymentMethod;
      network?: PaymentNetwork;
      walletAddress?: string;
      quantity?: number;
    };
  }>(
    "/api/v1/checkout/create",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { productSlug, paymentMethod, network, walletAddress, quantity } =
        request.body || {};

      if (!productSlug || !paymentMethod) {
        return reply
          .status(400)
          .send({ error: "productSlug and paymentMethod required" });
      }

      try {
        const intent = await paymentService.createOrder({
          userId: jwt.sub,
          productSlug,
          paymentMethod,
          network,
          walletAddress,
          quantity,
        });

        return { paymentIntent: intent };
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Confirm payment
  app.post<{
    Body: {
      orderId: string;
      paymentIntentId?: string;
      txHash?: string;
      senderAddress?: string;
      telegramPaymentChargeId?: string;
    };
  }>(
    "/api/v1/checkout/confirm",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { orderId, paymentIntentId, txHash, senderAddress } =
        request.body || {};

      if (!orderId) {
        return reply.status(400).send({ error: "orderId required" });
      }

      try {
        const result = await paymentService.confirmPayment({
          orderId,
          paymentIntentId,
          txHash,
          senderAddress,
        });

        return result;
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Get order
  app.get<{ Params: { id: string } }>(
    "/api/v1/orders/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;

      const order = await paymentService.getOrder(id);
      if (!order || order.userId !== jwt.sub) {
        return reply.status(404).send({ error: "Order not found" });
      }

      // Get product details
      const product = await paymentService.getProductById(order.productId);

      return { order, product };
    }
  );

  // List user orders
  app.get<{ Querystring: { limit?: string } }>(
    "/api/v1/orders",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const limit = parseInt(request.query.limit || "50");

      const orders = await paymentService.getUserOrders(jwt.sub, limit);

      return { orders };
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Subscriptions
  // ──────────────────────────────────────────────────────────────────────────

  // Get user subscriptions
  app.get(
    "/api/v1/me/subscriptions",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;

      const subscriptions = await paymentService.getUserSubscriptions(jwt.sub);

      // Get product details for each subscription
      const subscriptionsWithProducts = await Promise.all(
        subscriptions.map(async (sub) => {
          const product = await paymentService.getProductById(sub.productId);
          return { ...sub, product };
        })
      );

      return { subscriptions: subscriptionsWithProducts };
    }
  );

  // Cancel subscription
  app.post<{ Params: { id: string }; Body: { immediately?: boolean } }>(
    "/api/v1/me/subscriptions/:id/cancel",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const { immediately } = request.body || {};

      try {
        await paymentService.cancelSubscription(id, immediately || false);
        return { success: true };
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Connected Wallets
  // ──────────────────────────────────────────────────────────────────────────

  // Get connected wallets
  app.get(
    "/api/v1/me/wallets",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;

      const wallets = await paymentService.getConnectedWallets(jwt.sub);

      return { wallets };
    }
  );

  // Connect wallet
  app.post<{
    Body: {
      walletAddress: string;
      chainId: number;
      chainName: string;
      ensName?: string;
    };
  }>(
    "/api/v1/me/wallets/connect",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { walletAddress, chainId, chainName, ensName } =
        request.body || {};

      if (!walletAddress || !chainId || !chainName) {
        return reply
          .status(400)
          .send({ error: "walletAddress, chainId, and chainName required" });
      }

      try {
        const wallet = await paymentService.connectWallet(
          jwt.sub,
          walletAddress,
          chainId,
          chainName,
          ensName
        );

        return { wallet };
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Disconnect wallet
  app.delete<{ Params: { id: string } }>(
    "/api/v1/me/wallets/:id",
    { preHandler: authMiddleware },
    async (request) => {
      const { id } = request.params;

      await paymentService.disconnectWallet(id);

      return { success: true };
    }
  );

  // Get supported networks
  app.get("/api/v1/payment/networks", async () => {
    const networks = await paymentService.getSupportedNetworks();
    return { networks };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Webhooks (no auth)
  // ──────────────────────────────────────────────────────────────────────────

  // Stripe webhook
  app.post(
    "/webhooks/stripe",
    {
      config: { rawBody: true },
    },
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
        const result = await stripeService.handleWebhookEvent(event);

        // Update order status if applicable
        if (result.orderId) {
          const supabase = getSupabase();
          if (result.status === "completed") {
            // The payment service will handle completion
            await paymentService.confirmPayment({
              orderId: result.orderId,
              paymentIntentId: (event.data.object as any).id,
            });
          } else if (result.status === "failed") {
            await supabase
              .from("flowb_orders")
              .update({ status: "failed", updated_at: new Date().toISOString() })
              .eq("id", result.orderId);
          }
        }

        // Update subscription status if applicable
        if (result.subscriptionId && result.status) {
          const supabase = getSupabase();
          await supabase
            .from("flowb_subscriptions")
            .update({ status: result.status, updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", result.subscriptionId);
        }

        return { received: true };
      } catch (error: any) {
        console.error("[webhook] Stripe error:", error);
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Telegram payment webhook (handled via bot updates)
  app.post(
    "/webhooks/telegram/payment",
    async (request, reply) => {
      try {
        const { TelegramStarsService } = await import(
          "../services/payments/telegram-stars.js"
        );
        const tgService = new TelegramStarsService();

        const update = request.body as any;

        // Handle pre_checkout_query
        if (update.pre_checkout_query) {
          // Always approve for now (could add validation)
          await tgService.handlePreCheckoutQuery(
            update.pre_checkout_query.id,
            true
          );
          return { ok: true };
        }

        // Handle successful payment
        if (update.message?.successful_payment) {
          const payment = tgService.parseSuccessfulPayment(update);
          if (payment) {
            const supabase = getSupabase();
            await supabase
              .from("flowb_orders")
              .update({
                status: "processing",
                telegram_invoice_id: payment.telegramPaymentChargeId,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payment.orderId);

            // Confirm the payment
            await paymentService.confirmPayment({
              orderId: payment.orderId,
              telegramPaymentChargeId: payment.telegramPaymentChargeId,
            });
          }
        }

        return { ok: true };
      } catch (error: any) {
        console.error("[webhook] Telegram payment error:", error);
        return reply.status(400).send({ error: error.message });
      }
    }
  );
}
