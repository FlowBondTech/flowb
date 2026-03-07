/**
 * Meetup Scraper Adapter (Keyless)
 *
 * Scrapes public Meetup listing pages using Cheerio for DOM parsing.
 * Uses JSON-LD structured data when available, falls back to Cheerio.
 * No API key required - works purely from public HTML.
 *
 * URL pattern: meetup.com/find/?location={city}&source=EVENTS
 */

import * as cheerio from "cheerio";
import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";
import {
  fetchHtml,
  parseJsonLd,
  jsonLdToEventResult,
  hashString,
} from "./parse-utils.js";

// Map city names to Meetup location strings
const CITY_LOCATIONS: Record<string, string> = {
  austin: "us--tx--Austin",
  denver: "us--co--Denver",
  "new york": "us--ny--New+York",
  nyc: "us--ny--New+York",
  "san francisco": "us--ca--San+Francisco",
  sf: "us--ca--San+Francisco",
  "los angeles": "us--ca--Los+Angeles",
  la: "us--ca--Los+Angeles",
  miami: "us--fl--Miami",
  chicago: "us--il--Chicago",
  seattle: "us--wa--Seattle",
  portland: "us--or--Portland",
  boston: "us--ma--Boston",
  atlanta: "us--ga--Atlanta",
};

export class MeetupScraperAdapter implements EventSourceAdapter {
  id = "meetup-scraper";
  name = "Meetup (scraper)";

  private cities: string[];

  constructor(cities: string[] = ["austin"]) {
    this.cities = cities;
  }

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    const city = params.city?.toLowerCase() || this.cities[0] || "austin";
    const location = CITY_LOCATIONS[city];
    if (!location) {
      console.log(`[egator:meetup-scraper] No location for city: ${city}`);
      return [];
    }

    const allEvents: EventResult[] = [];

    try {
      let url = `https://www.meetup.com/find/?location=${location}&source=EVENTS&eventType=inPerson`;
      if (params.category) {
        url += `&keywords=${encodeURIComponent(params.category)}`;
      }

      console.log(`[egator:meetup-scraper] Fetching ${url}`);
      const html = await fetchHtml(url);
      if (!html) return [];

      // JSON-LD first
      const jsonLdEvents = parseJsonLd(html);
      if (jsonLdEvents.length > 0) {
        console.log(`[egator:meetup-scraper] Found ${jsonLdEvents.length} JSON-LD events`);
        for (const ld of jsonLdEvents) {
          const event = jsonLdToEventResult(ld, url, "meetup", city);
          if (event) allEvents.push(event);
        }
      }

      // Cheerio: extract event cards from listing
      const $ = cheerio.load(html);
      const cheerioEvents = extractMeetupCards($, city);
      if (cheerioEvents.length > 0) {
        console.log(`[egator:meetup-scraper] Cheerio found ${cheerioEvents.length} event cards`);
        allEvents.push(...cheerioEvents);
      }

      // Extract event links for individual scraping
      const eventUrls = extractMeetupLinks($);
      console.log(`[egator:meetup-scraper] Found ${eventUrls.length} event links`);

      const pagesToScrape = eventUrls.slice(0, 12);
      const results = await Promise.allSettled(
        pagesToScrape.map((eventUrl) => this.scrapeEventPage(eventUrl, city)),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          allEvents.push(result.value);
        }
      }

      // Also try tech category if no specific category
      if (!params.category) {
        const techUrl = `https://www.meetup.com/find/?location=${location}&source=EVENTS&keywords=tech`;
        const techHtml = await fetchHtml(techUrl);
        if (techHtml) {
          const $tech = cheerio.load(techHtml);
          const techJsonLd = parseJsonLd(techHtml);
          for (const ld of techJsonLd) {
            const event = jsonLdToEventResult(ld, techUrl, "meetup", city);
            if (event) allEvents.push(event);
          }
          allEvents.push(...extractMeetupCards($tech, city));
          const techLinks = extractMeetupLinks($tech);
          const techResults = await Promise.allSettled(
            techLinks.slice(0, 8).map((u) => this.scrapeEventPage(u, city)),
          );
          for (const r of techResults) {
            if (r.status === "fulfilled" && r.value) allEvents.push(r.value);
          }
        }
      }
    } catch (err: any) {
      console.error("[egator:meetup-scraper] Error:", err.message);
    }

    // Deduplicate by normalized title
    const seen = new Set<string>();
    const deduped = allEvents.filter((e) => {
      const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[egator:meetup-scraper] Returning ${deduped.length} events for ${city}`);
    return deduped;
  }

  private async scrapeEventPage(url: string, city: string): Promise<EventResult | null> {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

    const html = await fetchHtml(url, { retries: 1, timeoutMs: 10000 });
    if (!html) return null;

    // JSON-LD on individual event pages (most reliable)
    const jsonLdEvents = parseJsonLd(html);
    if (jsonLdEvents.length > 0) {
      const event = jsonLdToEventResult(jsonLdEvents[0], url, "meetup", city);
      if (event) {
        // Enrich with Cheerio
        const $ = cheerio.load(html);
        event.rsvpCount = extractRsvpCount($) || event.rsvpCount;
        event.organizerName = extractGroupName($) || event.organizerName;
        event.description = event.description || extractDescription($);
        return event;
      }
    }

    // Cheerio fallback for individual event pages
    const $ = cheerio.load(html);
    return extractSingleEventPage($, url, city);
  }
}

/** Extract event cards from Meetup listing pages */
function extractMeetupCards($: cheerio.CheerioAPI, city: string): EventResult[] {
  const events: EventResult[] = [];

  // Meetup uses various card/list item selectors
  const selectors = [
    "[data-testid='categoryResults-eventCard']",
    ".eventCard",
    "[id^='event-card']",
    ".searchResult",
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const $card = $(el);
      const title = $card.find("h2, h3, [data-testid='event-card-title']").first().text().trim();
      if (!title || title.length < 3) return;

      const link = $card.find("a[href*='/events/']").first().attr("href");
      const url = link?.startsWith("http") ? link : link ? `https://www.meetup.com${link}` : "";

      const dateText = $card.find("time").first().attr("datetime")
        || $card.find("time").first().text().trim();

      const venue = $card.find("[data-testid='venue-name']").text().trim()
        || $card.find(".venueDisplay").text().trim();

      const groupName = $card.find("[data-testid='group-name']").text().trim();
      const image = $card.find("img").first().attr("src");
      const attendees = $card.find("[data-testid='attendee-count']").text().trim();
      const rsvpCount = attendees ? parseInt(attendees.replace(/\D/g, ""), 10) : undefined;

      events.push({
        id: `meetup_${hashString(url || title)}`,
        title,
        startTime: parseDate(dateText) || new Date().toISOString(),
        locationName: venue || undefined,
        locationCity: city,
        source: "meetup",
        url: url?.split("?")[0] || "",
        imageUrl: image || undefined,
        organizerName: groupName || undefined,
        rsvpCount: rsvpCount && !isNaN(rsvpCount) ? rsvpCount : undefined,
      });
    });

    if (events.length > 0) break;
  }

  return events;
}

/** Extract a single event from a Meetup event page using Cheerio */
function extractSingleEventPage($: cheerio.CheerioAPI, url: string, city: string): EventResult | null {
  const title = $("meta[property='og:title']").attr("content")
    || $("h1").first().text().trim();
  if (!title || title.length < 3) return null;

  const description = extractDescription($);
  const image = $("meta[property='og:image']").attr("content");
  const dateTime = $("time[datetime]").first().attr("datetime");

  return {
    id: `meetup_${hashString(url)}`,
    title: title.replace(/\s*\|\s*Meetup.*$/i, "").trim(),
    description: description?.substring(0, 500) || undefined,
    startTime: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
    locationCity: city,
    source: "meetup",
    url,
    imageUrl: image || undefined,
    rsvpCount: extractRsvpCount($),
    organizerName: extractGroupName($),
  };
}

/** Extract event description from Meetup page */
function extractDescription($: cheerio.CheerioAPI): string | undefined {
  const desc = $("meta[property='og:description']").attr("content")
    || $("[data-testid='event-description']").text().trim()
    || $(".event-description").text().trim()
    || $(".break-words").first().text().trim();
  return desc && desc.length > 10 ? desc.substring(0, 500) : undefined;
}

/** Extract RSVP/attendee count */
function extractRsvpCount($: cheerio.CheerioAPI): number | undefined {
  const text = $("[data-testid='attendee-count']").text()
    || $(".attendee-count").text()
    || $("body").text();
  const match = text.match(/(\d+)\s*(?:attendees?|going|RSVPs?)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/** Extract group/organizer name */
function extractGroupName($: cheerio.CheerioAPI): string | undefined {
  return $("meta[property='og:site_name']").attr("content")
    || $("[data-testid='group-name']").text().trim()
    || undefined;
}

/** Extract event links from listing page */
function extractMeetupLinks($: cheerio.CheerioAPI): string[] {
  const urls = new Set<string>();
  $("a[href*='/events/']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && /\/events\/\d+/.test(href)) {
      const full = href.startsWith("http") ? href : `https://www.meetup.com${href}`;
      urls.add(full.split("?")[0]);
    }
  });
  return Array.from(urls);
}

function parseDate(text: string): string | null {
  if (!text) return null;
  try {
    const d = new Date(text);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch { /* ignore */ }
  return null;
}
