/**
 * Event Scanner Service
 * Scans for new EthDenver events and stores full data in flowb_events.
 * Includes auto-categorization, venue matching, quality scoring, and stale detection.
 */

import type { EventResult } from "../core/types.js";
import { createHash } from "crypto";
import { sbFetch, sbPatchRaw, sbInsert, type SbConfig } from "../utils/supabase.js";

interface CategoryRow { id: string; slug: string; name: string }
interface VenueRow { id: string; name: string; slug: string }

// Category keyword map for auto-categorization
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  defi: ["defi", "decentralized finance", "lending", "yield", "liquidity", "amm", "dex", "swap"],
  ai: ["ai", "artificial intelligence", "machine learning", "ml", "llm", "gpt", "neural"],
  infrastructure: ["infrastructure", "l1", "l2", "rollup", "scaling", "bridge", "rpc", "node"],
  social: ["social", "socialfi", "farcaster", "lens", "community"],
  workshop: ["workshop", "hands-on", "tutorial", "bootcamp", "masterclass"],
  party: ["party", "afterparty", "mixer", "celebration", "vibes", "rave", "club"],
  networking: ["networking", "meetup", "happy hour", "cocktail", "connect"],
  hackathon: ["hackathon", "hack", "buidl", "bounty", "build"],
  panel: ["panel", "fireside", "discussion", "talk", "keynote", "debate", "speaker"],
  "demo-day": ["demo day", "demo", "pitch", "showcase", "launch"],
  nft: ["nft", "collectible", "pfp", "art drop", "mint"],
  gaming: ["gaming", "gamefi", "esports", "play-to-earn", "p2e"],
  privacy: ["privacy", "zero knowledge", "zk", "zkp", "mpc", "fhe"],
  governance: ["governance", "dao", "voting", "proposal", "onchain governance"],
  rwa: ["rwa", "real world asset", "tokenization", "tokenized"],
  stablecoins: ["stablecoin", "usdc", "usdt", "dai", "stable"],
  depin: ["depin", "decentralized physical", "iot", "sensor"],
  developer: ["developer", "dev", "engineer", "sdk", "api", "tools", "devtool"],
  identity: ["identity", "did", "ssi", "soulbound", "attestation", "credential"],
  "food-drink": ["food", "dinner", "lunch", "brunch", "tasting", "restaurant", "bar crawl"],
  wellness: ["wellness", "yoga", "meditation", "run", "fitness", "health"],
  sports: ["sports", "basketball", "soccer", "volleyball", "pickleball"],
  brunch: ["brunch", "morning", "breakfast"],
  poker: ["poker", "texas hold", "tournament poker"],
};

// Luma is the sole trusted source
const TRUSTED_SOURCES = new Set(["luma"]);

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);
}

function computeSyncHash(event: EventResult): string {
  const parts = [
    event.title,
    event.startTime,
    event.endTime || "",
    event.locationName || "",
    event.description?.slice(0, 500) || "",
    event.imageUrl || "",
    String(event.price ?? ""),
  ].join("|");
  return createHash("md5").update(parts).digest("hex");
}

function computeQualityScore(event: EventResult): number {
  let score = 0;
  if (event.description && event.description.length > 20) score += 0.2;
  if (event.imageUrl) score += 0.2;
  if (event.endTime) score += 0.1;
  if (event.price !== undefined || event.isFree !== undefined) score += 0.1;
  if (TRUSTED_SOURCES.has(event.source)) score += 0.2;
  if (event.locationName) score += 0.2;
  return Math.min(score, 1);
}

function autoDetectCategories(event: EventResult): string[] {
  const searchText = [
    event.title,
    event.description || "",
    ...(event.tags || []),
    ...(event.danceStyles || []),
  ].join(" ").toLowerCase();

  const matched: string[] = [];
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => searchText.includes(kw))) {
      matched.push(slug);
    }
  }
  return matched.length ? matched : ["other"];
}

function fuzzyMatchVenue(
  eventVenueName: string | undefined,
  venues: VenueRow[],
): string | null {
  if (!eventVenueName) return null;
  const lower = eventVenueName.toLowerCase();
  for (const v of venues) {
    if (lower.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(lower)) {
      return v.id;
    }
    if (lower.includes(v.slug.replace(/-/g, " "))) {
      return v.id;
    }
  }
  return null;
}

/** Scan for new events using the FlowBCore event discovery */
export async function scanForNewEvents(
  cfg: SbConfig,
  discoverFn: (opts: any) => Promise<EventResult[]>,
): Promise<{ newCount: number; updatedCount: number; skippedCount: number }> {
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  try {
    // Load categories and venues for matching
    const [categories, venues] = await Promise.all([
      sbFetch<CategoryRow[]>(cfg, "flowb_event_categories?select=id,slug,name&active=eq.true"),
      sbFetch<VenueRow[]>(cfg, "flowb_venues?select=id,name,slug&active=eq.true"),
    ]);
    const categoryMap = new Map((categories || []).map(c => [c.slug, c.id]));

    const events = await discoverFn({ action: "events", city: "Denver" });

    for (const event of events) {
      const titleSlug = slugify(event.title || "");
      if (!titleSlug) continue;

      const source = event.source || "egator";
      const syncHash = computeSyncHash(event);
      const qualityScore = computeQualityScore(event);
      const venueId = fuzzyMatchVenue(event.locationName, venues || []);

      // Check if already exists
      const existing = await sbFetch<any[]>(
        cfg,
        `flowb_events?source=eq.${encodeURIComponent(source)}&title_slug=eq.${encodeURIComponent(titleSlug)}&select=id,sync_hash&limit=1`,
      );

      if (existing?.length) {
        // Skip if nothing changed
        if (existing[0].sync_hash === syncHash) {
          // Just update last_seen
          await sbPatchRaw(cfg, `flowb_events?id=eq.${existing[0].id}`, {
            last_seen: new Date().toISOString(),
            stale: false,
          });
          skippedCount++;
          continue;
        }

        // Update with full data
        await sbPatchRaw(cfg, `flowb_events?id=eq.${existing[0].id}`, {
          description: event.description || null,
          starts_at: event.startTime || null,
          ends_at: event.endTime || null,
          all_day: event.allDay || false,
          venue_id: venueId,
          venue_name: event.locationName || null,
          city: event.locationCity || "Denver",
          latitude: event.latitude || null,
          longitude: event.longitude || null,
          is_virtual: event.isVirtual || false,
          virtual_url: event.virtualUrl || null,
          is_free: event.isFree ?? null,
          price: event.price ?? null,
          ticket_url: event.ticketUrl || null,
          image_url: event.imageUrl || null,
          cover_url: event.coverUrl || null,
          url: event.url || null,
          organizer_name: event.organizerName || null,
          organizer_url: event.organizerUrl || null,
          tags: event.tags || [],
          quality_score: qualityScore,
          last_seen: new Date().toISOString(),
          last_synced: new Date().toISOString(),
          sync_hash: syncHash,
          stale: false,
        });

        // Update categories
        await updateCategories(cfg, existing[0].id, event, categoryMap);
        updatedCount++;
      } else {
        // Insert new event
        const inserted = await sbInsert<any>(cfg, "flowb_events", {
          source,
          source_event_id: event.sourceEventId || event.id || null,
          title: event.title,
          title_slug: titleSlug,
          description: event.description || null,
          starts_at: event.startTime || null,
          ends_at: event.endTime || null,
          all_day: event.allDay || false,
          venue_id: venueId,
          venue_name: event.locationName || null,
          venue_address: null,
          city: event.locationCity || "Denver",
          latitude: event.latitude || null,
          longitude: event.longitude || null,
          is_virtual: event.isVirtual || false,
          virtual_url: event.virtualUrl || null,
          is_free: event.isFree ?? null,
          price: event.price ?? null,
          ticket_url: event.ticketUrl || null,
          image_url: event.imageUrl || null,
          cover_url: event.coverUrl || null,
          url: event.url || null,
          organizer_name: event.organizerName || null,
          organizer_url: event.organizerUrl || null,
          tags: event.tags || [],
          quality_score: qualityScore,
          sync_hash: syncHash,
          stale: false,
        });

        // Auto-categorize
        if (inserted?.id) {
          await updateCategories(cfg, inserted.id, event, categoryMap);
        }
        newCount++;
      }
    }

    // Mark events not seen in 24h as stale
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await sbPatchRaw(cfg, `flowb_events?last_seen=lt.${staleThreshold}&stale=eq.false`, {
      stale: true,
    });
  } catch (err) {
    console.error("[event-scanner] Scan error:", err);
  }

  console.log(`[event-scanner] Scan complete: ${newCount} new, ${updatedCount} updated, ${skippedCount} unchanged`);
  return { newCount, updatedCount, skippedCount };
}

async function updateCategories(
  cfg: SbConfig,
  eventId: string,
  event: EventResult,
  categoryMap: Map<string, string>,
): Promise<void> {
  const detectedSlugs = autoDetectCategories(event);
  for (const slug of detectedSlugs) {
    const categoryId = categoryMap.get(slug);
    if (!categoryId) continue;
    try {
      await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_event_category_map`, {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal,resolution=merge-duplicates",
        },
        body: JSON.stringify({
          event_id: eventId,
          category_id: categoryId,
          confidence: 0.7,
          source: "auto",
        }),
      });
    } catch { /* non-critical */ }
  }
}
