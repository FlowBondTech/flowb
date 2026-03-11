/**
 * Website Chat Tool Executors — FlowB EC
 *
 * Product, article, SEO, site management, and Stripe tool executors
 * for the AI chat service. Each function is called by the tool executor
 * switch in ai-chat.ts.
 */

import { sbFetch, type SbConfig } from "../utils/supabase.js";
import {
  listProjects, getProject, siteApiCall, triggerRebuild, getActivityLog, logActivity,
} from "../plugins/websites/index.js";
import {
  listStripeProducts, createStripeCheckout, listStripeOrders,
  refundPayment, getRevenueSummary, createStripeProduct,
} from "./stripe-manager.js";
import { decrypt } from "../plugins/websites/vault.js";
import type { BizUserContext } from "./chat-tools-biz.js";

// ─── Helpers ─────────────────────────────────────────────────────────

async function resolveProject(sb: SbConfig, site?: string) {
  if (!site) throw new Error("Please specify a site slug. Use site_list to see available sites.");
  const project = await getProject(sb, site);
  if (!project) throw new Error(`Site '${site}' not found. Use site_list to see available sites.`);
  return project;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Site Management ─────────────────────────────────────────────────

export async function siteList(_args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const projects = await listProjects(sb, user.userId);
  if (!projects.length) return "No managed sites found. Register one with the API.";
  return projects.map(p =>
    `${p.name} (${p.slug}) — ${p.domain || "no domain"} — ${p.is_active ? "active" : "inactive"}`
  ).join("\n");
}

export async function siteStatus(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const activity = await getActivityLog(sb, project.id, 5);
  const recentActions = activity.map(a => `  ${a.action} by ${a.actor} — ${a.created_at}`).join("\n") || "  (none)";
  return [
    `Site: ${project.name} (${project.slug})`,
    `Domain: ${project.domain || "not set"}`,
    `Platform: ${project.platform}`,
    `Active: ${project.is_active}`,
    `TG Channel: ${project.tg_channel_id || "not set"}`,
    `Recent Activity:\n${recentActions}`,
  ].join("\n");
}

export async function siteRebuild(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  if (!args.site) return "Please specify a site slug. Use site_list to see available sites.";
  const result = await triggerRebuild(sb, args.site);
  return result.ok ? "Site rebuild triggered successfully." : `Rebuild failed: ${result.error}`;
}

export async function siteActivity(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const limit = args.limit || 20;
  const activity = await getActivityLog(sb, project.id, limit);
  if (!activity.length) return "No recent activity.";
  return activity.map(a =>
    `[${a.created_at}] ${a.action} — ${a.entity_type || ""}${a.entity_id ? ` #${a.entity_id.slice(0, 8)}` : ""} by ${a.actor}`
  ).join("\n");
}

// ─── Product Tools ───────────────────────────────────────────────────

export async function siteListProducts(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const params: Record<string, string> = {};
  if (args.category) params.category = args.category;
  if (args.search) params.search = args.search;
  params.limit = String(args.limit || 50);

  const data = await siteApiCall(sb, project.slug, `content-products?${new URLSearchParams(params)}`, "GET");
  const products = Array.isArray(data) ? data : [];
  if (!products.length) return "No products found.";

  return products.map((p: any) =>
    `${p.name} — ${formatPrice(p.price_cents)} — ${p.category} — ${p.stock_status}${p.is_published ? "" : " (draft)"}`
  ).join("\n");
}

export async function siteAddProduct(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const slug = (args.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const priceCents = Math.round((args.price || 0) * 100);

  const data = await siteApiCall(sb, project.slug, "content-products", "POST", {
    name: args.name,
    slug,
    category: args.category || "general",
    price_cents: priceCents,
    description: args.description,
    images: args.images ? (typeof args.images === "string" ? args.images.split(",") : args.images) : [],
  });

  await logActivity(sb, project.id, user.userId, "product_added", "product", data?.id, { name: args.name });
  return `Product created: ${args.name} — ${formatPrice(priceCents)} in ${args.category || "general"}`;
}

export async function siteUpdateProduct(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const updates: Record<string, any> = { id: args.product_id };
  if (args.name) updates.name = args.name;
  if (args.price) updates.price_cents = Math.round(args.price * 100);
  if (args.category) updates.category = args.category;
  if (args.description) updates.description = args.description;
  if (args.stock_status) updates.stock_status = args.stock_status;
  if (args.is_published !== undefined) updates.is_published = args.is_published;

  await siteApiCall(sb, project.slug, "content-products", "PATCH", updates);
  await logActivity(sb, project.id, user.userId, "product_updated", "product", args.product_id, { fields: Object.keys(updates) });
  return `Product updated successfully.`;
}

export async function siteDeleteProduct(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  await siteApiCall(sb, project.slug, `content-products?id=${args.product_id}`, "DELETE");
  await logActivity(sb, project.id, user.userId, "product_deleted", "product", args.product_id);
  return "Product removed (unpublished).";
}

// ─── Article Tools ───────────────────────────────────────────────────

export async function siteListArticles(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const params: Record<string, string> = {};
  if (args.status) params.status = args.status;
  if (args.category) params.category = args.category;
  params.limit = String(args.limit || 30);

  const data = await siteApiCall(sb, project.slug, `content-articles?${new URLSearchParams(params)}`, "GET");
  const articles = Array.isArray(data) ? data : [];
  if (!articles.length) return "No articles found.";

  return articles.map((a: any) =>
    `${a.title} — ${a.slug} — SEO: ${a.seo_score ?? "?"}/100${a.is_published ? "" : " (draft)"}${a.scheduled_at ? ` scheduled: ${a.scheduled_at}` : ""}`
  ).join("\n");
}

export async function siteCreateArticle(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const slug = (args.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const data = await siteApiCall(sb, project.slug, "content-articles", "POST", {
    title: args.title,
    slug,
    category: args.category,
    tags: args.tags ? (typeof args.tags === "string" ? args.tags.split(",").map((t: string) => t.trim()) : args.tags) : [],
    excerpt: args.excerpt,
    seo_title: args.title,
    is_published: false,
  });

  await logActivity(sb, project.id, user.userId, "article_created", "article", data?.id, { title: args.title });
  return `Article draft created: "${args.title}" — slug: ${slug}. Use site_publish_article to publish.`;
}

export async function siteUpdateArticle(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const updates: Record<string, any> = { id: args.article_id };
  if (args.title) updates.title = args.title;
  if (args.seo_title) updates.seo_title = args.seo_title;
  if (args.seo_description) updates.seo_description = args.seo_description;
  if (args.category) updates.category = args.category;
  if (args.tags) updates.tags = typeof args.tags === "string" ? args.tags.split(",").map((t: string) => t.trim()) : args.tags;
  if (args.excerpt) updates.excerpt = args.excerpt;
  if (args.featured_image) updates.featured_image = args.featured_image;

  await siteApiCall(sb, project.slug, "content-articles", "PATCH", updates);
  await logActivity(sb, project.id, user.userId, "article_updated", "article", args.article_id, { fields: Object.keys(updates) });
  return "Article updated successfully.";
}

export async function siteScheduleArticle(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  await siteApiCall(sb, project.slug, "content-articles", "PATCH", {
    id: args.article_id,
    scheduled_at: args.publish_at,
  });
  await logActivity(sb, project.id, user.userId, "article_scheduled", "article", args.article_id, { publish_at: args.publish_at });
  return `Article scheduled for ${args.publish_at}.`;
}

export async function sitePublishArticle(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  await siteApiCall(sb, project.slug, "content-articles", "PATCH", {
    id: args.article_id,
    is_published: true,
  });
  await logActivity(sb, project.id, user.userId, "article_published", "article", args.article_id);

  // Trigger rebuild
  await triggerRebuild(sb, project.slug);
  return "Article published! Site rebuild triggered.";
}

// ─── SEO Tools ───────────────────────────────────────────────────────

export async function siteSeoStatus(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const data = await siteApiCall(sb, project.slug, "content-seo", "GET");
  if (!data) return "Could not fetch SEO status.";

  const lines = [
    `SEO Health — ${project.name}`,
    `Articles: ${data.total_articles} | Average Score: ${data.average_score}/100`,
    `Critical (score < 50): ${data.critical_count}`,
  ];
  if (data.critical?.length) {
    lines.push("\nCritical articles:");
    for (const c of data.critical.slice(0, 5)) {
      lines.push(`  ${c.title} (${c.score}/100) — ${c.issues.join(", ")}`);
    }
  }
  return lines.join("\n");
}

export async function siteSeoCheckArticle(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const data = await siteApiCall(sb, project.slug, `content-seo?article_id=${args.article_id}`, "GET");
  if (!data) return "Could not check article SEO.";

  const lines = [`SEO Check: ${data.article}`, `Score: ${data.score}/100`];
  if (data.issues?.length) {
    lines.push("Issues:");
    for (const issue of data.issues) lines.push(`  - ${issue}`);
  } else {
    lines.push("No issues found!");
  }
  return lines.join("\n");
}

export async function siteSeoSuggestions(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const data = await siteApiCall(sb, project.slug, "content-seo", "GET");
  if (!data?.all?.length) return "No articles to analyze.";

  const worst = data.all.filter((a: any) => a.score < 70).slice(0, 5);
  if (!worst.length) return "All articles score 70+ — site SEO is healthy!";

  const lines = ["SEO Improvement Suggestions:"];
  for (const a of worst) {
    lines.push(`\n${a.title} (${a.score}/100):`);
    for (const issue of a.issues) {
      lines.push(`  Fix: ${issue}`);
    }
  }
  return lines.join("\n");
}

// ─── Stripe Tools ────────────────────────────────────────────────────

async function getStripeConfig(sb: SbConfig, site?: string) {
  const project = await resolveProject(sb, site);
  const key = process.env.STRIPE_SECRET_KEY; // fallback to FlowB's key
  // In production, each site could have its own key stored encrypted
  if (!key) throw new Error("Stripe not configured");
  return { secretKey: key, accountId: project.stripe_account_id || undefined };
}

export async function stripeListProducts(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const config = await getStripeConfig(sb, args.site);
  const products = await listStripeProducts(config, args.limit || 20);
  if (!products.length) return "No Stripe products found.";
  return products.map((p: any) => `${p.name} — ${p.id} — ${p.active ? "active" : "inactive"}`).join("\n");
}

export async function stripeCreateCheckout(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const config = await getStripeConfig(sb, args.site);
  const project = await resolveProject(sb, args.site);
  const domain = project.domain || "noredfarms.com";

  const items = Array.isArray(args.items) ? args.items : [{ price: args.price_id, quantity: args.quantity || 1 }];
  const { url } = await createStripeCheckout(
    config,
    items,
    `https://${domain}/success`,
    `https://${domain}/cancel`,
  );
  return `Checkout link: ${url}`;
}

export async function stripeListOrders(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const config = await getStripeConfig(sb, args.site);
  const orders = await listStripeOrders(config, { status: args.status, limit: args.limit });
  if (!orders.length) return "No orders found.";
  return orders.map((o: any) =>
    `${o.id} — ${formatPrice(o.amount || 0)} ${o.currency} — ${o.status} — ${new Date((o.created || 0) * 1000).toISOString().slice(0, 10)}`
  ).join("\n");
}

export async function stripeRefund(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const config = await getStripeConfig(sb, args.site);
  const amountCents = args.amount ? Math.round(args.amount * 100) : undefined;
  const refund = await refundPayment(config, args.payment_id, amountCents);
  const project = await resolveProject(sb, args.site);
  await logActivity(sb, project.id, user.userId, "stripe_refund", "payment", args.payment_id, {
    amount: refund.amount,
    status: refund.status,
  });
  return `Refund processed: ${formatPrice(refund.amount)} — status: ${refund.status}`;
}

export async function stripeRevenue(args: any, _user: BizUserContext, sb: SbConfig): Promise<string> {
  const config = await getStripeConfig(sb, args.site);
  const days = args.period === "weekly" ? 7 : args.period === "daily" ? 1 : 30;
  const { total, count, currency } = await getRevenueSummary(config, days);
  return `Revenue (${args.period || "monthly"}): ${formatPrice(total)} ${currency} from ${count} payments`;
}

export async function stripeSyncProducts(args: any, user: BizUserContext, sb: SbConfig): Promise<string> {
  const project = await resolveProject(sb, args.site);
  const config = await getStripeConfig(sb, args.site);

  // Get products without Stripe IDs from site
  const products = await siteApiCall(sb, project.slug, "content-products?published=all", "GET");
  const unsynced = (products || []).filter((p: any) => !p.stripe_product_id);

  if (!unsynced.length) return "All products already synced with Stripe.";

  let synced = 0;
  for (const p of unsynced) {
    try {
      const { productId, priceId } = await createStripeProduct(config, p.name, p.price_cents, { nf_id: p.id });
      await siteApiCall(sb, project.slug, "content-products", "PATCH", {
        id: p.id,
        stripe_product_id: productId,
        stripe_price_id: priceId,
      });
      synced++;
    } catch (err: any) {
      console.error(`[stripe-sync] ${p.name}: ${err.message}`);
    }
  }

  await logActivity(sb, project.id, user.userId, "stripe_sync", "site", project.slug, { synced, total: unsynced.length });
  return `Synced ${synced}/${unsynced.length} products with Stripe.`;
}
