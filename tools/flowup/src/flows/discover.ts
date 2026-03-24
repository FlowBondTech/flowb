import type { Page } from "playwright";
import { launchBrowser, getPage, closeBrowser, screenshotOnError, withRetry } from "../core/browser.js";
import { humanDelay, humanScroll, waitForPageLoad } from "../core/timing.js";
import { createLogger } from "../core/logger.js";
import {
  URLS, DISCOVER, COMMON, SLUG_TO_CITY,
  ALL_DISCOVER_SLUGS, resolveCity,
} from "../selectors/partiful.js";
import type { FlowUpConfig, DiscoveredEvent, DiscoverOptions } from "../types.js";

const log = createLogger("discover");

/**
 * Discover events from Partiful discover pages.
 * Uses __NEXT_DATA__ extraction (primary) with DOM fallback.
 */
export async function discoverEvents(
  config: FlowUpConfig,
  opts: DiscoverOptions = {},
): Promise<DiscoveredEvent[]> {
  const cities = opts.cities?.length
    ? opts.cities
    : config.cities;

  const slugs = cities
    .map((c) => resolveCity(c))
    .filter((s): s is string => s !== null);

  if (slugs.length === 0) {
    log.warn("No valid cities specified. Available: " + ALL_DISCOVER_SLUGS.join(", "));
    return [];
  }

  const ctx = await launchBrowser({
    headless: config.headless,
    profile: config.profile,
  });
  const page = await getPage();

  const allEvents: DiscoveredEvent[] = [];

  try {
    for (const slug of slugs) {
      log.info(`Discovering events in ${SLUG_TO_CITY[slug] || slug}...`);

      const events = await withRetry(
        () => scrapeDiscoverPage(page, slug, config),
        { retries: 1, label: `discover:${slug}` },
      );

      allEvents.push(...events);
      log.info(`  Found ${events.length} events`);

      // Cooldown between cities
      if (slugs.indexOf(slug) < slugs.length - 1) {
        await humanDelay(config.timing.betweenActions);
      }
    }
  } catch (err: any) {
    log.error(`Discovery failed: ${err.message}`);
    await screenshotOnError(page, "discover-error");
  } finally {
    await closeBrowser();
  }

  // Deduplicate
  const seen = new Set<string>();
  const deduped = allEvents.filter((e) => {
    const key = e.id || e.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter by keywords
  const keywords = opts.keywords?.length ? opts.keywords : config.keywords;
  let filtered = deduped;
  if (keywords.length > 0) {
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    filtered = deduped.filter((e) => {
      const text = `${e.title} ${e.description || ""} ${(e.tags || []).join(" ")}`.toLowerCase();
      return lowerKeywords.some((kw) => text.includes(kw));
    });
    log.info(`Filtered ${deduped.length} → ${filtered.length} events by keywords: ${keywords.join(", ")}`);
  }

  // Apply limit
  const limit = opts.limit ?? filtered.length;
  return filtered.slice(0, limit);
}

/**
 * Scrape a single discover page for events.
 */
async function scrapeDiscoverPage(
  page: Page,
  slug: string,
  config: FlowUpConfig,
): Promise<DiscoveredEvent[]> {
  const url = URLS.discover(slug);
  const city = SLUG_TO_CITY[slug] || slug;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await waitForPageLoad(page, config.timing);

  // Dismiss any modals
  try {
    const dismissBtn = await page.$(COMMON.dismissModal);
    if (dismissBtn) {
      await dismissBtn.click();
      await humanDelay(config.timing.betweenActions);
    }
  } catch {
    // no modal
  }

  // Scroll down to load more events
  for (let i = 0; i < 3; i++) {
    await humanScroll(page, 600, config.timing);
    await humanDelay(config.timing.betweenActions);
  }

  // Primary: Extract from __NEXT_DATA__
  const nextDataEvents = await extractNextDataEvents(page, city);
  if (nextDataEvents.length > 0) {
    log.debug(`${slug}: ${nextDataEvents.length} events via __NEXT_DATA__`);
    return nextDataEvents;
  }

  // Fallback: Extract from DOM
  log.debug(`${slug}: __NEXT_DATA__ empty, falling back to DOM extraction`);
  return extractDomEvents(page, city);
}

/**
 * Extract events from __NEXT_DATA__ script tag via page.evaluate().
 * Reuses logic from src/plugins/egator/sources/partiful.ts.
 */
async function extractNextDataEvents(page: Page, city: string): Promise<DiscoveredEvent[]> {
  const results = await page.evaluate((city: string) => {
    const script = document.querySelector("script#__NEXT_DATA__");
    if (!script?.textContent) return [];

    let data: any;
    try {
      data = JSON.parse(script.textContent);
    } catch {
      return [];
    }

    const pageProps = data?.props?.pageProps;
    if (!pageProps) return [];

    // Collect raw items from all known structures
    const rawItems: any[] = [];

    if (pageProps.trendingSection?.items) {
      rawItems.push(...pageProps.trendingSection.items);
    }
    if (Array.isArray(pageProps.sections)) {
      for (const section of pageProps.sections) {
        if (section.items) rawItems.push(...section.items);
        if (section.events) rawItems.push(...section.events);
      }
    }
    if (Array.isArray(pageProps.events)) {
      rawItems.push(...pageProps.events);
    }
    if (pageProps.event) {
      rawItems.push(pageProps.event);
    }

    // Unwrap nested event objects (items have shape { event: {...}, tags: [...] })
    const rawEvents: any[] = rawItems.map((item: any) => {
      if (item.event && typeof item.event === "object") {
        // Merge item-level tags into event
        const ev = item.event;
        if (item.tags && !ev.tags) ev.tags = item.tags;
        if (item.descriptionTags && !ev.descriptionTags) ev.descriptionTags = item.descriptionTags;
        return ev;
      }
      return item;
    });

    // Deduplicate by ID
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const e of rawEvents) {
      const id = e.id || e._id || e.eventId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(e);
    }

    // Map to DiscoveredEvent shape
    return unique.map((e: any) => {
      const title = e.title || e.name;
      if (!title || title.length < 2) return null;

      const id = e.id || e._id || e.eventId;
      const startTime = e.startDate || e.start || e.startAt;
      const endTime = e.endDate || e.end || e.endAt;

      // Location
      let locationName: string | undefined;
      const loc = e.locationInfo || e.location;
      if (loc) {
        if (typeof loc === "string") {
          locationName = loc;
        } else {
          locationName = loc.displayName || loc.name || loc.value || loc.mapsInfo?.name;
          const addrLines = loc.displayAddressLines || loc.mapsInfo?.addressLines;
          if (!locationName && Array.isArray(addrLines) && addrLines.length > 0) {
            locationName = addrLines[0];
          }
        }
      }

      // Image
      let imageUrl: string | undefined;
      if (typeof e.image === "string") imageUrl = e.image;
      else if (e.image?.url) imageUrl = e.image.url;
      else if (e.coverImage?.url) imageUrl = e.coverImage.url;

      // Description
      const description = (e.description || e.descriptionPlainText || "").substring(0, 500) || undefined;

      // RSVP count
      const rsvpCount = e.goingGuestCount || e.interestedGuestCount || e.approvedGuestCount || e.guestCount || undefined;

      // Tags - prefer descriptionTags (event-specific) over discover category tags
      const tags: string[] = [];
      const tagSrc = e.descriptionTags || e.tags;
      if (Array.isArray(tagSrc)) {
        for (const t of tagSrc) {
          if (typeof t === "string") tags.push(t);
          else if (t.label || t.title) tags.push(t.label || t.title);
        }
      }

      const isFree = e.isFree ?? (e.cost === 0 || e.cost === "0" || e.price === 0) ?? undefined;

      // Host
      const hostName = e.hostName || e.host?.name || e.organizer?.name || undefined;

      return {
        id,
        title,
        description,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        locationName,
        city,
        url: e.url || `https://partiful.com/e/${id}`,
        imageUrl,
        hostName,
        rsvpCount,
        tags: tags.length > 0 ? tags : undefined,
        isFree,
      };
    }).filter(Boolean);
  }, city);
  return results as DiscoveredEvent[];
}

/**
 * Fallback: extract events from DOM elements.
 */
async function extractDomEvents(page: Page, city: string): Promise<DiscoveredEvent[]> {
  const events: DiscoveredEvent[] = [];

  const cards = await page.$$(DISCOVER.eventCard);
  log.debug(`DOM fallback: found ${cards.length} event cards`);

  for (const card of cards) {
    try {
      const href = await card.getAttribute("href");
      if (!href || !href.startsWith("/e/")) continue;

      const id = href.replace("/e/", "").split("?")[0];
      const url = `https://partiful.com${href}`;

      // Try to get title
      const titleEl = await card.$(DISCOVER.eventTitle);
      const title = titleEl ? (await titleEl.textContent())?.trim() : undefined;
      if (!title) continue;

      // Try to get date
      const dateEl = await card.$(DISCOVER.eventDate);
      const dateText = dateEl ? (await dateEl.textContent())?.trim() : undefined;

      // Try to get location
      const locEl = await card.$(DISCOVER.eventLocation);
      const locationName = locEl ? (await locEl.textContent())?.trim() : undefined;

      // Try to get host
      const hostEl = await card.$(DISCOVER.hostName);
      const hostName = hostEl ? (await hostEl.textContent())?.trim() : undefined;

      events.push({
        id,
        title,
        startTime: dateText,
        locationName,
        city,
        url,
        hostName,
      });
    } catch {
      // skip malformed card
    }
  }

  return events;
}

/**
 * Format discovered events as a table for CLI output.
 */
export function formatEventsTable(events: DiscoveredEvent[]): string {
  if (events.length === 0) return "No events found.";

  const lines: string[] = [];
  const header = `${"#".padEnd(4)} ${"Title".padEnd(40)} ${"Date".padEnd(22)} ${"City".padEnd(15)} ${"ID".padEnd(24)}`;
  lines.push(header);
  lines.push("-".repeat(header.length));

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const num = String(i + 1).padEnd(4);
    const title = (e.title || "").substring(0, 38).padEnd(40);
    const date = (e.startTime ? new Date(e.startTime).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }) : "TBD").padEnd(22);
    const city = (e.city || "").padEnd(15);
    const id = (e.id || "").padEnd(24);
    lines.push(`${num} ${title} ${date} ${city} ${id}`);
  }

  return lines.join("\n");
}
