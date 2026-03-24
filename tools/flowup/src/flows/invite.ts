import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { launchBrowser, getPage, closeBrowser, screenshotOnError } from "../core/browser.js";
import { humanDelay, humanClick, humanType, waitForPageLoad } from "../core/timing.js";
import { createLogger } from "../core/logger.js";
import { URLS, EVENT_PAGE, COMMON } from "../selectors/partiful.js";
import { getDataDir } from "../config.js";
import type { FlowUpConfig, Contact, InviteResult, InviteOptions } from "../types.js";

const log = createLogger("invite");

/**
 * Parse contacts from a CSV file.
 * Expected format: name,phone,email (header row optional)
 */
function loadContacts(csvPath: string): Contact[] {
  const fullPath = csvPath.startsWith("/")
    ? csvPath
    : resolve(getDataDir("contacts"), csvPath);

  if (!existsSync(fullPath)) {
    throw new Error(`Contacts file not found: ${fullPath}`);
  }

  const raw = readFileSync(fullPath, "utf-8");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  // Detect if first line is a header
  const firstLine = lines[0].toLowerCase();
  const startIdx = (firstLine.includes("name") || firstLine.includes("phone") || firstLine.includes("email"))
    ? 1
    : 0;

  const contacts: Contact[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    if (parts.length === 0) continue;

    const contact: Contact = {};

    // Try to detect which field is which
    for (const part of parts) {
      if (!part) continue;
      if (part.includes("@")) {
        contact.email = part;
      } else if (/^[\d\s\-\+\(\)]+$/.test(part) && part.replace(/\D/g, "").length >= 7) {
        contact.phone = part;
      } else if (!contact.name) {
        contact.name = part;
      }
    }

    if (contact.phone || contact.email) {
      contacts.push(contact);
    }
  }

  return contacts;
}

/**
 * Invite contacts to a Partiful event.
 */
export async function inviteContacts(
  config: FlowUpConfig,
  eventId: string,
  opts: InviteOptions = {},
): Promise<InviteResult> {
  const batchSize = opts.batchSize ?? config.inviteBatchSize;
  const dryRun = opts.dryRun ?? false;

  const contactsPath = opts.contactsPath || "contacts.csv";
  let contacts: Contact[];
  try {
    contacts = loadContacts(contactsPath);
  } catch (err: any) {
    return {
      eventId,
      totalContacts: 0,
      invited: 0,
      failed: 0,
      errors: [err.message],
      dryRun,
    };
  }

  log.info(`Loaded ${contacts.length} contacts from ${contactsPath}`);

  const result: InviteResult = {
    eventId,
    totalContacts: contacts.length,
    invited: 0,
    failed: 0,
    errors: [],
    dryRun,
  };

  if (contacts.length === 0) {
    log.warn("No contacts to invite");
    return result;
  }

  if (dryRun) {
    log.info(`[DRY RUN] Would invite ${contacts.length} contacts to event ${eventId}`);
    for (const c of contacts.slice(0, 5)) {
      log.info(`  - ${c.name || "unknown"}: ${c.phone || c.email}`);
    }
    if (contacts.length > 5) {
      log.info(`  ... and ${contacts.length - 5} more`);
    }
    result.invited = contacts.length;
    return result;
  }

  const ctx = await launchBrowser({
    headless: config.headless,
    profile: config.profile,
  });
  const page = await getPage();

  try {
    // Navigate to event page
    await page.goto(URLS.event(eventId), { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForPageLoad(page, config.timing);

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

    // Click invite button
    const inviteBtn = await page.$(EVENT_PAGE.inviteButton);
    if (!inviteBtn) {
      result.errors.push("Invite button not found - you may not be the host");
      await screenshotOnError(page, `invite-no-button-${eventId}`);
      return result;
    }

    await humanClick(page, EVENT_PAGE.inviteButton, config.timing);
    await humanDelay(config.timing.betweenActions);

    // Process contacts in batches
    const batches: Contact[][] = [];
    for (let i = 0; i < contacts.length; i += batchSize) {
      batches.push(contacts.slice(i, i + batchSize));
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      log.info(`Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} contacts)`);

      for (const contact of batch) {
        const identifier = contact.phone || contact.email;
        if (!identifier) {
          result.failed++;
          result.errors.push(`No phone/email for contact: ${contact.name || "unknown"}`);
          continue;
        }

        try {
          // Find and fill the invite input
          const input = await page.$(EVENT_PAGE.inviteInput);
          if (!input) {
            result.failed++;
            result.errors.push("Invite input not found");
            continue;
          }

          // Clear existing text
          await page.click(EVENT_PAGE.inviteInput, { clickCount: 3 });
          await humanDelay([100, 200]);

          await humanType(page, EVENT_PAGE.inviteInput, identifier, config.timing);
          await humanDelay(config.timing.betweenActions);

          // Click send/add
          const sendBtn = await page.$(EVENT_PAGE.inviteSend);
          if (sendBtn) {
            await humanClick(page, EVENT_PAGE.inviteSend, config.timing);
            await humanDelay(config.timing.betweenActions);
          } else {
            // Try Enter key
            await page.keyboard.press("Enter");
            await humanDelay(config.timing.betweenActions);
          }

          result.invited++;
          log.debug(`Invited: ${contact.name || identifier}`);
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Failed to invite ${contact.name || identifier}: ${err.message}`);
        }
      }

      // Cooldown between batches
      if (batchIdx < batches.length - 1) {
        log.debug("Batch cooldown...");
        await humanDelay(config.timing.inviteBatchCooldown);
      }
    }

    log.success(`Invited ${result.invited}/${result.totalContacts} contacts`);
  } catch (err: any) {
    result.errors.push(err.message);
    log.error(`Invite failed: ${err.message}`);
    await screenshotOnError(page, `invite-error-${eventId}`);
  } finally {
    await closeBrowser();
  }

  return result;
}

/**
 * Format invite results for CLI output.
 */
export function formatInviteResult(result: InviteResult): string {
  const lines: string[] = ["", "Invite Results:", "-".repeat(40)];
  const dry = result.dryRun ? " [DRY RUN]" : "";
  lines.push(`  Event: ${result.eventId}${dry}`);
  lines.push(`  Total contacts: ${result.totalContacts}`);
  lines.push(`  Invited: ${result.invited}`);
  lines.push(`  Failed: ${result.failed}`);
  if (result.errors.length > 0) {
    lines.push(`  Errors:`);
    for (const err of result.errors.slice(0, 10)) {
      lines.push(`    - ${err}`);
    }
    if (result.errors.length > 10) {
      lines.push(`    ... and ${result.errors.length - 10} more`);
    }
  }
  return lines.join("\n");
}
