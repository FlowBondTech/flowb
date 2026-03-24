import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { launchBrowser, getPage, closeBrowser, screenshotOnError } from "../core/browser.js";
import { humanDelay, humanClick, humanType, waitForPageLoad } from "../core/timing.js";
import { createLogger } from "../core/logger.js";
import { URLS, CREATE, COMMON } from "../selectors/partiful.js";
import { getDataDir } from "../config.js";
import type { FlowUpConfig, CreateEventInput, CreateEventResult, CreateOptions } from "../types.js";

const log = createLogger("create");

/**
 * Load event template from a JSON file.
 */
function loadTemplate(templatePath: string): CreateEventInput {
  const fullPath = templatePath.startsWith("/")
    ? templatePath
    : resolve(getDataDir("templates"), templatePath);

  if (!existsSync(fullPath)) {
    throw new Error(`Template not found: ${fullPath}`);
  }

  const raw = readFileSync(fullPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Create an event on Partiful from a template or inline options.
 */
export async function createEvent(
  config: FlowUpConfig,
  opts: CreateOptions = {},
): Promise<CreateEventResult> {
  const result: CreateEventResult = {
    success: false,
    dryRun: opts.dryRun ?? false,
  };

  // Load template or build input from options
  let input: CreateEventInput;
  if (opts.templatePath) {
    input = loadTemplate(opts.templatePath);
    // CLI overrides
    if (opts.title) input.title = opts.title;
    if (opts.date) input.date = opts.date;
  } else {
    if (!opts.title) {
      result.error = "Either --template or --title is required";
      return result;
    }
    input = {
      title: opts.title,
      date: opts.date || new Date().toISOString().split("T")[0],
    };
  }

  log.info(`Creating event: "${input.title}" on ${input.date}`);

  if (opts.dryRun) {
    log.info("[DRY RUN] Event details:");
    log.info(`  Title: ${input.title}`);
    log.info(`  Date: ${input.date}`);
    if (input.description) log.info(`  Description: ${input.description.substring(0, 100)}...`);
    if (input.location) log.info(`  Location: ${input.location}`);
    if (input.startTime) log.info(`  Start: ${input.startTime}`);
    if (input.endTime) log.info(`  End: ${input.endTime}`);
    result.success = true;
    return result;
  }

  const ctx = await launchBrowser({
    headless: config.headless,
    profile: config.profile,
  });
  const page = await getPage();

  try {
    await page.goto(URLS.createEvent, { waitUntil: "domcontentloaded", timeout: 20000 });
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

    // Fill title
    const titleInput = await page.$(CREATE.titleInput);
    if (!titleInput) {
      result.error = "Title input not found on create page";
      await screenshotOnError(page, "create-no-title");
      return result;
    }
    await humanType(page, CREATE.titleInput, input.title, config.timing);
    await humanDelay(config.timing.betweenActions);

    // Fill description if provided
    if (input.description) {
      try {
        const descInput = await page.$(CREATE.descriptionInput);
        if (descInput) {
          await humanType(page, CREATE.descriptionInput, input.description, config.timing);
          await humanDelay(config.timing.betweenActions);
        }
      } catch {
        log.debug("Description input not found, skipping");
      }
    }

    // Fill date
    try {
      const dateInput = await page.$(CREATE.dateInput);
      if (dateInput) {
        await humanClick(page, CREATE.dateInput, config.timing);
        await humanDelay(config.timing.betweenActions);
        // Date pickers vary - try typing the date directly
        await page.keyboard.type(input.date);
        await humanDelay(config.timing.betweenActions);
      }
    } catch {
      log.debug("Date input interaction failed, skipping");
    }

    // Fill start time
    if (input.startTime) {
      try {
        const timeInput = await page.$(CREATE.startTimeInput);
        if (timeInput) {
          await humanClick(page, CREATE.startTimeInput, config.timing);
          await page.keyboard.type(input.startTime);
          await humanDelay(config.timing.betweenActions);
        }
      } catch {
        log.debug("Start time input not found, skipping");
      }
    }

    // Fill end time
    if (input.endTime) {
      try {
        const endInput = await page.$(CREATE.endTimeInput);
        if (endInput) {
          await humanClick(page, CREATE.endTimeInput, config.timing);
          await page.keyboard.type(input.endTime);
          await humanDelay(config.timing.betweenActions);
        }
      } catch {
        log.debug("End time input not found, skipping");
      }
    }

    // Fill location
    if (input.location) {
      try {
        const locInput = await page.$(CREATE.locationInput);
        if (locInput) {
          await humanType(page, CREATE.locationInput, input.location, config.timing);
          await humanDelay(config.timing.betweenActions);

          // Try to select first autocomplete suggestion
          try {
            await page.waitForSelector("[class*='suggestion'], [class*='result'], [role='option']", { timeout: 3000 });
            await humanDelay([500, 1000]);
            await page.keyboard.press("ArrowDown");
            await page.keyboard.press("Enter");
            await humanDelay(config.timing.betweenActions);
          } catch {
            // no autocomplete
          }
        }
      } catch {
        log.debug("Location input not found, skipping");
      }
    }

    // Publish
    const publishBtn = await page.$(CREATE.publishButton);
    if (!publishBtn) {
      result.error = "Publish button not found";
      await screenshotOnError(page, "create-no-publish");
      return result;
    }

    await humanClick(page, CREATE.publishButton, config.timing);
    await humanDelay(config.timing.pageLoad);

    // Try to capture the event URL after creation
    const currentUrl = page.url();
    if (currentUrl.includes("/e/")) {
      result.eventUrl = currentUrl;
      result.eventId = currentUrl.match(/\/e\/([a-zA-Z0-9]+)/)?.[1];
    }

    result.success = true;
    log.success(`Event created: ${result.eventUrl || "check Partiful"}`);
  } catch (err: any) {
    result.error = err.message;
    log.error(`Create failed: ${err.message}`);
    await screenshotOnError(page, "create-error");
  } finally {
    await closeBrowser();
  }

  return result;
}
