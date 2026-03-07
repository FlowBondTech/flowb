/**
 * Eventbrite Scraper Adapter (Keyless)
 *
 * Scrapes public Eventbrite listing and event pages using Cheerio.
 * Uses JSON-LD structured data when available, falls back to Cheerio DOM parsing.
 * No API key required - works purely from public HTML.
 *
 * Primary: eventbrite.com/d/{state}--{city}/events/
 * Fallback: eventbrite.com/d/{state}--{city}/all-events/ (broader listing)
 */

import * as cheerio from "cheerio";
import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";
import {
  fetchHtml,
  parseJsonLd,
  jsonLdToEventResult,
  hashString,
} from "./parse-utils.js";

// Map city names to Eventbrite URL slugs
const CITY_SLUGS: Record<string, string> = {
  austin: "tx--austin",
  denver: "co--denver",
  "new york": "ny--new-york",
  nyc: "ny--new-york",
  "san francisco": "ca--san-francisco",
  sf: "ca--san-francisco",
  "los angeles": "ca--los-angeles",
  la: "ca--los-angeles",
  miami: "fl--miami",
  chicago: "il--chicago",
  seattle: "wa--seattle",
  portland: "or--portland",
  boston: "ma--boston",
  atlanta: "ga--atlanta",
};

export class EventbriteScraperAdapter implements EventSourceAdapter {
  id = "eventbrite-scraper";
  name = "Eventbrite (scraper)";

  private cities: string[];

  constructor(cities: string[] = ["austin"]) {
    this.cities = cities;
  }

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    const city = params.city?.toLowerCase() || this.cities[0] || "austin";
    const slug = CITY_SLUGS[city];
    if (!slug) {
      console.log(`[egator:eventbrite-scraper] No slug for city: ${city}`);
      return [];
    }

    const allEvents: EventResult[] = [];

    try {
      // Try multiple URL patterns — Eventbrite sometimes blocks /events/ but allows others
      const urls = [
        `https://www.eventbrite.com/d/${slug}/events/`,
        `https://www.eventbrite.com/d/${slug}/all-events/`,
      ];

      for (const url of urls) {
        console.log(`[egator:eventbrite-scraper] Fetching ${url}`);
        const html = await fetchHtml(url);
        if (!html) continue;

        // Try JSON-LD first
        const jsonLdEvents = parseJsonLd(html);
        if (jsonLdEvents.length > 0) {
          console.log(`[egator:eventbrite-scraper] Found ${jsonLdEvents.length} JSON-LD events`);
          for (const ld of jsonLdEvents) {
            const event = jsonLdToEventResult(ld, url, "eventbrite", city);
            if (event) allEvents.push(event);
          }
        }

        // Cheerio: extract event cards from listing page
        const $ = cheerio.load(html);
        const cheerioEvents = extractEventCards($, city);
        if (cheerioEvents.length > 0) {
          console.log(`[egator:eventbrite-scraper] Cheerio found ${cheerioEvents.length} event cards`);
          allEvents.push(...cheerioEvents);
        }

        // Extract event links for individual scraping
        const eventUrls = extractEventbriteLinks($);
        console.log(`[egator:eventbrite-scraper] Found ${eventUrls.length} event links`);

        const pagesToScrape = eventUrls.slice(0, 15);
        const results = await Promise.allSettled(
          pagesToScrape.map((eventUrl) => this.scrapeEventPage(eventUrl, city)),
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            allEvents.push(result.value);
          }
        }

        if (allEvents.length > 0) break; // Got results, skip fallback URL
      }
    } catch (err: any) {
      console.error("[egator:eventbrite-scraper] Error:", err.message);
    }

    // Deduplicate by normalized title
    const seen = new Set<string>();
    const deduped = allEvents.filter((e) => {
      const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[egator:eventbrite-scraper] Returning ${deduped.length} events for ${city}`);
    return deduped;
  }

  private async scrapeEventPage(url: string, city: string): Promise<EventResult | null> {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

    const html = await fetchHtml(url, { retries: 1, timeoutMs: 10000 });
    if (!html) return null;

    // JSON-LD on individual pages
    const jsonLdEvents = parseJsonLd(html);
    if (jsonLdEvents.length > 0) {
      return jsonLdToEventResult(jsonLdEvents[0], url, "eventbrite", city);
    }

    // Cheerio fallback for individual event pages
    const $ = cheerio.load(html);
    return extractSingleEventPage($, url, city);
  }
}

/** Extract event cards from Eventbrite listing pages using Cheerio */
function extractEventCards($: cheerio.CheerioAPI, city: string): EventResult[] {
  const events: EventResult[] = [];

  // Eventbrite uses various card selectors across page versions
  const selectors = [
    "[data-testid='event-card']",
    ".eds-event-card",
    ".search-event-card",
    "article[data-event-id]",
    ".discover-search-desktop-card",
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const $card = $(el);
      const title = $card.find("h2, h3, [data-testid='event-card-title']").first().text().trim();
      if (!title || title.length < 3) return;

      const link = $card.find("a[href*='/e/']").first().attr("href")
        || $card.find("a").first().attr("href");
      const url = link?.startsWith("http") ? link : link ? `https://www.eventbrite.com${link}` : "";

      const dateText = $card.find("time, [datetime], [data-testid='event-card-date']").first().text().trim()
        || $card.find("time").attr("datetime") || "";

      const venue = $card.find("[data-testid='event-card-location'], .card-text--truncated__one").first().text().trim();
      const image = $card.find("img").first().attr("src") || $card.find("img").first().attr("data-src");
      const priceText = $card.find("[data-testid='event-card-price']").first().text().trim();
      const isFree = /free/i.test(priceText);

      events.push({
        id: `eventbrite_${hashString(url || title)}`,
        title,
        startTime: parseDate(dateText) || new Date().toISOString(),
        locationName: venue || undefined,
        locationCity: city,
        isFree: isFree || undefined,
        source: "eventbrite",
        url: url?.split("?")[0] || "",
        imageUrl: image || undefined,
      });
    });

    if (events.length > 0) break; // Found cards with this selector
  }

  return events;
}

/** Extract a single event from an Eventbrite event page */
function extractSingleEventPage($: cheerio.CheerioAPI, url: string, city: string): EventResult | null {
  const title = $("meta[property='og:title']").attr("content")
    || $("h1").first().text().trim();
  if (!title || title.length < 3) return null;

  const description = $("meta[property='og:description']").attr("content")
    || $("[data-testid='event-description']").text().trim()
    || $(".event-description").text().trim();

  const image = $("meta[property='og:image']").attr("content");
  const dateTime = $("time[datetime]").first().attr("datetime")
    || $("meta[property='event:start_time']").attr("content");

  const venue = $("[data-testid='venue-name']").text().trim()
    || $(".location-info__address-text").text().trim();

  const organizer = $("[data-testid='organizer-name']").text().trim()
    || $(".organizer-info__name").text().trim();

  return {
    id: `eventbrite_${hashString(url)}`,
    title: title.replace(/\s*\|\s*Eventbrite.*$/i, "").trim(),
    description: description?.substring(0, 500) || undefined,
    startTime: dateTime || new Date().toISOString(),
    locationName: venue || undefined,
    locationCity: city,
    source: "eventbrite",
    url,
    imageUrl: image || undefined,
    organizerName: organizer || undefined,
  };
}

/** Extract event links from listing page */
function extractEventbriteLinks($: cheerio.CheerioAPI): string[] {
  const urls = new Set<string>();
  $("a[href*='/e/']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const full = href.startsWith("http") ? href : `https://www.eventbrite.com${href}`;
      urls.add(full.split("?")[0]);
    }
  });
  return Array.from(urls);
}

/** Best-effort date parsing */
function parseDate(text: string): string | null {
  if (!text) return null;
  try {
    const d = new Date(text);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch { /* ignore */ }
  return null;
}
