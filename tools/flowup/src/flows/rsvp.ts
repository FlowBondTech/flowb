import type { Page } from "playwright";
import { launchBrowser, getPage, closeBrowser, screenshotOnError, withRetry } from "../core/browser.js";
import { humanDelay, humanClick, humanType, waitForPageLoad } from "../core/timing.js";
import { createLogger } from "../core/logger.js";
import { URLS, EVENT_PAGE, COMMON } from "../selectors/partiful.js";
import type { FlowUpConfig, RSVPResult, RSVPOptions } from "../types.js";
import { discoverEvents } from "./discover.js";
import type { DiscoverOptions } from "../types.js";

const log = createLogger("rsvp");

/**
 * RSVP to a single event by ID.
 */
async function rsvpToEvent(
  page: Page,
  eventId: string,
  config: FlowUpConfig,
  opts: RSVPOptions = {},
): Promise<RSVPResult> {
  const status = opts.status || config.defaultRsvpStatus;
  const url = URLS.event(eventId);
  const result: RSVPResult = {
    eventId,
    url,
    status,
    success: false,
    dryRun: opts.dryRun ?? false,
  };

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForPageLoad(page, config.timing);

    // Get event title for logging
    try {
      const titleEl = await page.$(EVENT_PAGE.title);
      result.eventTitle = titleEl ? (await titleEl.textContent())?.trim() : undefined;
    } catch {
      // non-critical
    }

    // Dismiss any modals
    try {
      const dismiss = await page.$(COMMON.dismissModal);
      if (dismiss) {
        await dismiss.click();
        await humanDelay(config.timing.betweenActions);
      }
    } catch {
      // no modal
    }

    // Check if already RSVP'd
    const existingStatus = await page.$(EVENT_PAGE.rsvpStatus);
    if (existingStatus) {
      const statusText = await existingStatus.textContent();
      if (statusText?.toLowerCase().includes("going") || statusText?.toLowerCase().includes("maybe")) {
        log.info(`Already RSVP'd to ${result.eventTitle || eventId}: ${statusText}`);
        result.success = true;
        return result;
      }
    }

    if (opts.dryRun) {
      log.info(`[DRY RUN] Would RSVP "${status}" to: ${result.eventTitle || eventId}`);
      result.success = true;
      return result;
    }

    // Click the appropriate RSVP button
    const buttonSelector = status === "going" ? EVENT_PAGE.goingButton : EVENT_PAGE.maybeButton;
    const rsvpBtn = await page.$(buttonSelector);

    if (!rsvpBtn) {
      // Try generic RSVP button
      const genericBtn = await page.$(EVENT_PAGE.rsvpButton);
      if (!genericBtn) {
        result.error = "RSVP button not found";
        await screenshotOnError(page, `rsvp-no-button-${eventId}`);
        return result;
      }
      await humanClick(page, EVENT_PAGE.rsvpButton, config.timing);
    } else {
      await humanClick(page, buttonSelector, config.timing);
    }

    await humanDelay(config.timing.betweenActions);

    // Add optional message
    if (opts.message) {
      try {
        const msgInput = await page.$(EVENT_PAGE.rsvpMessage);
        if (msgInput) {
          await humanType(page, EVENT_PAGE.rsvpMessage, opts.message, config.timing);
          await humanDelay(config.timing.betweenActions);
        }
      } catch {
        log.debug("No message input found, skipping");
      }
    }

    // Click submit/confirm if there's a separate step
    try {
      const submitBtn = await page.$(EVENT_PAGE.rsvpSubmit);
      if (submitBtn) {
        await humanClick(page, EVENT_PAGE.rsvpSubmit, config.timing);
        await humanDelay(config.timing.betweenActions);
      }
    } catch {
      // single-step RSVP, no submit needed
    }

    // Verify RSVP went through
    await humanDelay(config.timing.betweenActions);
    result.success = true;
    log.success(`RSVP'd "${status}" to: ${result.eventTitle || eventId}`);
  } catch (err: any) {
    result.error = err.message;
    log.error(`RSVP failed for ${eventId}: ${err.message}`);
    await screenshotOnError(page, `rsvp-error-${eventId}`);
  }

  return result;
}

/**
 * Batch RSVP to multiple events with cooldowns.
 */
export async function batchRsvp(
  config: FlowUpConfig,
  eventIds: string[],
  opts: RSVPOptions = {},
): Promise<RSVPResult[]> {
  if (eventIds.length === 0) {
    log.warn("No event IDs provided");
    return [];
  }

  const ctx = await launchBrowser({
    headless: config.headless,
    profile: config.profile,
  });
  const page = await getPage();
  const results: RSVPResult[] = [];

  try {
    for (let i = 0; i < eventIds.length; i++) {
      const eventId = eventIds[i];
      log.info(`RSVP ${i + 1}/${eventIds.length}: ${eventId}`);

      const result = await withRetry(
        () => rsvpToEvent(page, eventId, config, opts),
        { retries: 1, label: `rsvp:${eventId}` },
      );
      results.push(result);

      // Cooldown between RSVPs
      if (i < eventIds.length - 1) {
        log.debug("Cooldown between RSVPs...");
        await humanDelay(config.timing.rsvpCooldown);
      }
    }
  } finally {
    await closeBrowser();
  }

  // Print summary
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  log.info(`\nRSVP Summary: ${succeeded} succeeded, ${failed} failed out of ${results.length}`);

  return results;
}

/**
 * Discover events and auto-RSVP to matching ones.
 */
export async function rsvpDiscover(
  config: FlowUpConfig,
  discoverOpts: DiscoverOptions,
  rsvpOpts: RSVPOptions & { max?: number } = {},
): Promise<RSVPResult[]> {
  const events = await discoverEvents(config, discoverOpts);

  if (events.length === 0) {
    log.warn("No events found to RSVP to");
    return [];
  }

  const max = rsvpOpts.max ?? 5;
  const toRsvp = events.slice(0, max);

  log.info(`Found ${events.length} events, will RSVP to ${toRsvp.length}`);
  for (const e of toRsvp) {
    log.info(`  - ${e.title} (${e.id})`);
  }

  const eventIds = toRsvp.map((e) => e.id);
  return batchRsvp(config, eventIds, rsvpOpts);
}

/**
 * Format RSVP results for CLI output.
 */
export function formatRsvpResults(results: RSVPResult[]): string {
  if (results.length === 0) return "No RSVP results.";

  const lines: string[] = ["", "RSVP Results:", "-".repeat(60)];
  for (const r of results) {
    const icon = r.success ? "OK" : "FAIL";
    const dry = r.dryRun ? " [DRY RUN]" : "";
    const title = r.eventTitle || r.eventId;
    const err = r.error ? ` (${r.error})` : "";
    lines.push(`  ${icon} ${title} → ${r.status}${dry}${err}`);
  }

  const succeeded = results.filter((r) => r.success).length;
  lines.push(`\n  Total: ${succeeded}/${results.length} succeeded`);
  return lines.join("\n");
}
