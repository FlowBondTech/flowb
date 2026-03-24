/**
 * Stripe Manager — Handles Stripe operations for managed biz sites.
 *
 * Wraps Stripe API calls, routing through the site's Stripe account.
 */

import { log } from "../utils/logger.js";

const NS = "[stripe-mgr]";

interface StripeConfig {
  secretKey: string;
  accountId?: string; // for Stripe Connect
}

async function stripeCall(config: StripeConfig, path: string, method: string, body?: Record<string, any>): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (config.accountId) {
    headers["Stripe-Account"] = config.accountId;
  }

  const urlEncoded = body
    ? Object.entries(body).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
    : undefined;

  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers,
    body: urlEncoded,
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe ${res.status}`);
  }
  return data;
}

export async function listStripeProducts(config: StripeConfig, limit = 20): Promise<any[]> {
  const data = await stripeCall(config, `/products?limit=${limit}&active=true`, "GET");
  return data.data || [];
}

export async function createStripeCheckout(
  config: StripeConfig,
  items: { price: string; quantity: number }[],
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string; id: string }> {
  const body: Record<string, any> = {
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
  items.forEach((item, i) => {
    body[`line_items[${i}][price]`] = item.price;
    body[`line_items[${i}][quantity]`] = item.quantity;
  });

  const session = await stripeCall(config, "/checkout/sessions", "POST", body);
  return { url: session.url, id: session.id };
}

export async function listStripeOrders(
  config: StripeConfig,
  options: { status?: string; limit?: number } = {},
): Promise<any[]> {
  const limit = options.limit || 20;
  let path = `/payment_intents?limit=${limit}`;
  if (options.status) path += `&status=${options.status}`;
  const data = await stripeCall(config, path, "GET");
  return data.data || [];
}

export async function refundPayment(
  config: StripeConfig,
  paymentIntentId: string,
  amountCents?: number,
): Promise<any> {
  const body: Record<string, any> = { payment_intent: paymentIntentId };
  if (amountCents) body.amount = amountCents;
  return stripeCall(config, "/refunds", "POST", body);
}

export async function getRevenueSummary(
  config: StripeConfig,
  periodDays = 30,
): Promise<{ total: number; count: number; currency: string }> {
  const created = Math.floor(Date.now() / 1000) - periodDays * 86400;
  const data = await stripeCall(
    config,
    `/payment_intents?limit=100&status=succeeded&created[gte]=${created}`,
    "GET",
  );
  const payments = data.data || [];
  const total = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  return {
    total,
    count: payments.length,
    currency: payments[0]?.currency || "usd",
  };
}

export async function createStripeProduct(
  config: StripeConfig,
  name: string,
  priceCents: number,
  metadata?: Record<string, string>,
): Promise<{ productId: string; priceId: string }> {
  const product = await stripeCall(config, "/products", "POST", {
    name,
    ...(metadata ? Object.fromEntries(Object.entries(metadata).map(([k, v]) => [`metadata[${k}]`, v])) : {}),
  });
  const price = await stripeCall(config, "/prices", "POST", {
    product: product.id,
    unit_amount: priceCents,
    currency: "usd",
  });
  return { productId: product.id, priceId: price.id };
}
