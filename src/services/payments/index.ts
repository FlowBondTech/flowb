/**
 * FlowB Payment Service
 * Unified facade for all payment methods
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  PaymentMethod,
  PaymentNetwork,
  Product,
  Order,
  CreateOrderParams,
  PaymentIntent,
  ConfirmPaymentParams,
  PaymentResult,
  ConnectedWallet,
  Subscription,
  NetworkConfig,
} from "./types.js";
import { StripeService } from "./stripe.js";
import { CryptoService } from "./crypto.js";
import { TelegramStarsService } from "./telegram-stars.js";

// Re-export types
export * from "./types.js";

export class PaymentService {
  private supabase: SupabaseClient;
  private stripe: StripeService;
  private crypto: CryptoService;
  private telegramStars: TelegramStarsService;
  private multisigAddress: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.multisigAddress = process.env.FLOWBOND_MULTISIG_ADDRESS || "";

    this.stripe = new StripeService();
    this.crypto = new CryptoService(this.multisigAddress);
    this.telegramStars = new TelegramStarsService();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Products
  // ─────────────────────────────────────────────────────────────────────────

  async getProducts(options?: {
    category?: string;
    bizOnly?: boolean;
  }): Promise<Product[]> {
    let query = this.supabase
      .from("flowb_products")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (options?.category) {
      query = query.eq("category", options.category);
    }
    if (options?.bizOnly !== undefined) {
      query = query.eq("biz_only", options.bizOnly);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch products: ${error.message}`);
    return (data || []).map(this.mapProduct);
  }

  async getProduct(slug: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from("flowb_products")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .single();

    if (error || !data) return null;
    return this.mapProduct(data);
  }

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from("flowb_products")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapProduct(data);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Orders
  // ─────────────────────────────────────────────────────────────────────────

  async createOrder(params: CreateOrderParams): Promise<PaymentIntent> {
    const product = await this.getProduct(params.productSlug);
    if (!product) {
      throw new Error(`Product not found: ${params.productSlug}`);
    }

    const amount = product.basePriceUsdc * (params.quantity || 1);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    // Create order record
    const { data: order, error } = await this.supabase
      .from("flowb_orders")
      .insert({
        user_id: params.userId,
        product_id: product.id,
        quantity: params.quantity || 1,
        amount_usdc: amount,
        status: "pending",
        payment_method: params.paymentMethod,
        payment_network: params.network || null,
        expected_wallet_address:
          params.paymentMethod === "usdc_direct" ||
          params.paymentMethod === "crypto_swap"
            ? this.multisigAddress
            : null,
        expires_at: expiresAt.toISOString(),
        metadata: params.metadata || {},
      })
      .select()
      .single();

    if (error || !order) {
      throw new Error(`Failed to create order: ${error?.message}`);
    }

    // Generate payment intent based on method
    return this.generatePaymentIntent(order, product, params);
  }

  private async generatePaymentIntent(
    order: any,
    product: Product,
    params: CreateOrderParams
  ): Promise<PaymentIntent> {
    const baseIntent: PaymentIntent = {
      orderId: order.id,
      method: params.paymentMethod,
      amountUsdc: order.amount_usdc,
      expiresAt: new Date(order.expires_at),
    };

    switch (params.paymentMethod) {
      case "stripe":
      case "apple_pay": {
        // Use Checkout Sessions for web/miniapp contexts (redirects to Stripe hosted page)
        const baseUrl = process.env.FLOWB_MINIAPP_URL || "https://t.me/Flow_b_bot/flowb";
        const checkoutSession = await this.stripe.createCheckoutSession({
          orderId: order.id,
          productName: product.name,
          amount: order.amount_usdc,
          successUrl: `${baseUrl}?checkout=success&orderId=${order.id}`,
          cancelUrl: `${baseUrl}?checkout=cancelled&orderId=${order.id}`,
          customerId: params.userId,
        });

        // Update order with checkout session ID
        await this.supabase
          .from("flowb_orders")
          .update({ stripe_checkout_session_id: checkoutSession.sessionId })
          .eq("id", order.id);

        return {
          ...baseIntent,
          clientSecret: checkoutSession.sessionId, // Store session ID for verification
          stripeCheckoutUrl: checkoutSession.url, // URL to redirect user to
          stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        };
      }

      case "usdc_direct":
      case "wallet_connect": {
        const network = params.network || "base";
        const networkConfig = await this.getNetworkConfig(network);
        return {
          ...baseIntent,
          paymentAddress: this.multisigAddress,
          network,
          chainId: networkConfig.chainId,
        };
      }

      case "crypto_swap": {
        const network = params.network || "base";
        const networkConfig = await this.getNetworkConfig(network);
        return {
          ...baseIntent,
          paymentAddress: this.multisigAddress,
          network,
          chainId: networkConfig.chainId,
        };
      }

      case "telegram_stars": {
        const starsIntent = await this.telegramStars.createInvoice({
          orderId: order.id,
          title: product.name,
          description: product.description || "",
          starsAmount: product.telegramStarsPrice || Math.ceil(order.amount_usdc * 50),
          payload: JSON.stringify({ orderId: order.id, userId: params.userId }),
        });
        return {
          ...baseIntent,
          telegramInvoiceUrl: starsIntent.invoiceUrl,
          starsAmount: starsIntent.starsAmount,
        };
      }

      default:
        throw new Error(`Unsupported payment method: ${params.paymentMethod}`);
    }
  }

  async confirmPayment(params: ConfirmPaymentParams): Promise<PaymentResult> {
    const order = await this.getOrder(params.orderId);
    if (!order) {
      throw new Error(`Order not found: ${params.orderId}`);
    }

    if (order.status === "completed") {
      return { success: true, order };
    }

    if (order.status === "expired" || order.status === "cancelled") {
      return { success: false, order, error: `Order is ${order.status}` };
    }

    let verified = false;

    switch (order.paymentMethod) {
      case "stripe":
      case "apple_pay": {
        if (!params.paymentIntentId) {
          return { success: false, order, error: "Missing payment intent ID" };
        }
        verified = await this.stripe.verifyPayment(params.paymentIntentId);
        break;
      }

      case "usdc_direct":
      case "wallet_connect":
      case "crypto_swap": {
        if (!params.txHash) {
          return { success: false, order, error: "Missing transaction hash" };
        }
        verified = await this.crypto.verifyTransaction({
          txHash: params.txHash,
          expectedAmount: order.amountUsdc,
          expectedRecipient: this.multisigAddress,
          network: (order.paymentNetwork as PaymentNetwork) || "base",
        });
        if (verified) {
          await this.supabase
            .from("flowb_orders")
            .update({
              tx_hash: params.txHash,
              sender_wallet_address: params.senderAddress,
              tx_verified: true,
            })
            .eq("id", order.id);
        }
        break;
      }

      case "telegram_stars": {
        // Telegram payment is verified via webhook
        verified = order.status === "processing";
        break;
      }
    }

    if (verified) {
      await this.completeOrder(order.id);
      const updatedOrder = await this.getOrder(order.id);
      return { success: true, order: updatedOrder! };
    }

    return { success: false, order, error: "Payment verification failed" };
  }

  private async completeOrder(orderId: string): Promise<void> {
    const { data: order } = await this.supabase
      .from("flowb_orders")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (!order) return;

    // Get product to determine if subscription or one-time
    const product = await this.getProductById(order.product_id);
    if (!product) return;

    if (product.productType === "subscription") {
      // Create subscription
      const periodEnd = new Date();
      if (product.billingPeriod === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else if (product.billingPeriod === "weekly") {
        periodEnd.setDate(periodEnd.getDate() + 7);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await this.supabase.from("flowb_subscriptions").upsert({
        user_id: order.user_id,
        product_id: product.id,
        status: "active",
        payment_method: order.payment_method,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      });
    } else {
      // Record one-time purchase
      await this.supabase.from("flowb_user_products").insert({
        user_id: order.user_id,
        product_id: product.id,
        order_id: order.id,
      });

      // Handle boost products - create event boost record
      if (product.category === "boost") {
        await this.createBoostFromOrder(order, product);
      }
    }
  }

  /**
   * Creates an event boost record when a boost product order is completed.
   * Maps product slugs to boost durations and creates the boost in flowb_event_boosts.
   */
  private async createBoostFromOrder(order: any, product: Product): Promise<void> {
    const metadata = order.metadata || {};
    const eventId = metadata.eventId;

    if (!eventId) {
      console.warn(`[payments] Boost order ${order.id} completed but no eventId in metadata`);
      return;
    }

    // Map product slug to boost duration in hours
    const boostDurations: Record<string, number> = {
      "event-boost-basic": 24,
      "event-boost-pro": 48,
      "event-boost-mega": 72,
    };

    const durationHours = boostDurations[product.slug] || 24;
    const expiresAt = new Date(Date.now() + durationHours * 3600_000).toISOString();

    // Get user's agent if they have one (for agent_name display)
    let agentId: string | null = null;
    let agentName: string | null = null;

    const { data: agent } = await this.supabase
      .from("flowb_agents")
      .select("id, agent_name")
      .eq("user_id", order.user_id)
      .eq("status", "active")
      .single();

    if (agent) {
      agentId = agent.id;
      agentName = agent.agent_name;
    }

    // Create the boost record
    const { error } = await this.supabase.from("flowb_event_boosts").insert({
      event_id: eventId,
      agent_id: agentId,
      user_id: order.user_id,
      amount_usdc: product.basePriceUsdc,
      agent_name: agentName,
      expires_at: expiresAt,
      active: true,
      order_id: order.id,
      product_slug: product.slug,
    });

    if (error) {
      console.error(`[payments] Failed to create boost for order ${order.id}:`, error.message);
      return;
    }

    console.log(`[payments] Created ${durationHours}h boost for event ${eventId} (order ${order.id})`);
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from("flowb_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !data) return null;
    return this.mapOrder(data);
  }

  async getUserOrders(
    userId: string,
    limit: number = 50
  ): Promise<Order[]> {
    const { data, error } = await this.supabase
      .from("flowb_orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
    return (data || []).map(this.mapOrder);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────────────────────────────────

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const { data, error } = await this.supabase
      .from("flowb_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"]);

    if (error) throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    return (data || []).map(this.mapSubscription);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately: boolean = false
  ): Promise<void> {
    const { data: sub } = await this.supabase
      .from("flowb_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    if (!sub) throw new Error("Subscription not found");

    if (sub.stripe_subscription_id) {
      await this.stripe.cancelSubscription(
        sub.stripe_subscription_id,
        cancelImmediately
      );
    }

    await this.supabase
      .from("flowb_subscriptions")
      .update({
        status: cancelImmediately ? "cancelled" : sub.status,
        cancel_at_period_end: !cancelImmediately,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Wallets
  // ─────────────────────────────────────────────────────────────────────────

  async getConnectedWallets(userId: string): Promise<ConnectedWallet[]> {
    const { data, error } = await this.supabase
      .from("flowb_connected_wallets")
      .select("*")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false });

    if (error) throw new Error(`Failed to fetch wallets: ${error.message}`);
    return (data || []).map(this.mapWallet);
  }

  async connectWallet(
    userId: string,
    walletAddress: string,
    chainId: number,
    chainName: string,
    ensName?: string
  ): Promise<ConnectedWallet> {
    const { data, error } = await this.supabase
      .from("flowb_connected_wallets")
      .upsert(
        {
          user_id: userId,
          wallet_address: walletAddress.toLowerCase(),
          chain_id: chainId,
          chain_name: chainName,
          ens_name: ensName,
          last_connected_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,wallet_address,chain_id",
        }
      )
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to connect wallet: ${error?.message}`);
    }
    return this.mapWallet(data);
  }

  async disconnectWallet(walletId: string): Promise<void> {
    await this.supabase
      .from("flowb_connected_wallets")
      .delete()
      .eq("id", walletId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Networks
  // ─────────────────────────────────────────────────────────────────────────

  async getNetworkConfig(network: PaymentNetwork): Promise<NetworkConfig> {
    const { data, error } = await this.supabase
      .from("flowb_payment_networks")
      .select("*")
      .eq("id", network)
      .single();

    if (error || !data) {
      throw new Error(`Network not found: ${network}`);
    }

    return {
      id: data.id,
      name: data.name,
      chainId: data.chain_id,
      rpcUrl: data.rpc_url,
      explorerUrl: data.explorer_url,
      usdcAddress: data.usdc_address,
      nativeSymbol: data.native_symbol,
      minConfirmations: data.min_confirmations,
    };
  }

  async getSupportedNetworks(): Promise<NetworkConfig[]> {
    const { data, error } = await this.supabase
      .from("flowb_payment_networks")
      .select("*")
      .eq("active", true);

    if (error) throw new Error(`Failed to fetch networks: ${error.message}`);
    return (data || []).map((n) => ({
      id: n.id,
      name: n.name,
      chainId: n.chain_id,
      rpcUrl: n.rpc_url,
      explorerUrl: n.explorer_url,
      usdcAddress: n.usdc_address,
      nativeSymbol: n.native_symbol,
      minConfirmations: n.min_confirmations,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private mapProduct(row: any): Product {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      productType: row.product_type,
      category: row.category,
      basePriceUsdc: parseFloat(row.base_price_usdc),
      stripePriceId: row.stripe_price_id,
      telegramStarsPrice: row.telegram_stars_price,
      billingPeriod: row.billing_period,
      features: row.features || [],
      icon: row.icon,
      bizOnly: row.biz_only,
      active: row.active,
    };
  }

  private mapOrder(row: any): Order {
    return {
      id: row.id,
      userId: row.user_id,
      productId: row.product_id,
      quantity: row.quantity,
      amountUsdc: parseFloat(row.amount_usdc),
      status: row.status,
      paymentMethod: row.payment_method,
      paymentNetwork: row.payment_network,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      stripeCheckoutSessionId: row.stripe_checkout_session_id,
      telegramInvoiceId: row.telegram_invoice_id,
      expectedWalletAddress: row.expected_wallet_address,
      senderWalletAddress: row.sender_wallet_address,
      txHash: row.tx_hash,
      txVerified: row.tx_verified,
      swapService: row.swap_service,
      originalTokenSymbol: row.original_token_symbol,
      originalAmount: row.original_amount,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdAt: new Date(row.created_at),
    };
  }

  private mapSubscription(row: any): Subscription {
    return {
      id: row.id,
      userId: row.user_id,
      productId: row.product_id,
      status: row.status,
      paymentMethod: row.payment_method,
      stripeSubscriptionId: row.stripe_subscription_id,
      currentPeriodStart: new Date(row.current_period_start),
      currentPeriodEnd: new Date(row.current_period_end),
      trialEnd: row.trial_end ? new Date(row.trial_end) : null,
      cancelAtPeriodEnd: row.cancel_at_period_end,
    };
  }

  private mapWallet(row: any): ConnectedWallet {
    return {
      id: row.id,
      userId: row.user_id,
      walletAddress: row.wallet_address,
      chainId: row.chain_id,
      chainName: row.chain_name,
      isPrimary: row.is_primary,
      ensName: row.ens_name,
      lastConnectedAt: new Date(row.last_connected_at),
    };
  }
}

// Singleton instance
let paymentService: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentService) {
    paymentService = new PaymentService();
  }
  return paymentService;
}
