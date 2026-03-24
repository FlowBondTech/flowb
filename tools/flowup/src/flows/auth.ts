import type { Page } from "playwright";
import { launchBrowser, getPage, closeBrowser, screenshotOnError } from "../core/browser.js";
import { humanDelay, waitForPageLoad } from "../core/timing.js";
import { createLogger } from "../core/logger.js";
import { AUTH, URLS } from "../selectors/partiful.js";
import type { FlowUpConfig, AuthOptions } from "../types.js";

const log = createLogger("auth");

/**
 * Check if the current session is authenticated.
 * Navigates to partiful.com and looks for auth indicators.
 */
async function isAuthenticated(page: Page, config: FlowUpConfig): Promise<boolean> {
  try {
    await page.goto(URLS.home, { waitUntil: "domcontentloaded", timeout: 15000 });
    await humanDelay(config.timing.pageLoad);

    // Check if we got redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/signin")) {
      log.debug("Redirected to login page - not authenticated");
      return false;
    }

    // Check for any logged-in indicators
    for (const selector of AUTH.loggedIn) {
      try {
        const el = await page.$(selector);
        if (el) {
          log.debug(`Found auth indicator: ${selector}`);
          return true;
        }
      } catch {
        // selector not found, try next
      }
    }

    // Check if we're on a page that requires auth (home page loaded successfully)
    if (currentUrl.includes("/home")) {
      return true;
    }

    return false;
  } catch (err: any) {
    log.warn(`Auth check failed: ${err.message}`);
    return false;
  }
}

/**
 * Ensure the user is authenticated.
 * - If session exists and is valid, returns immediately.
 * - If session is expired/missing, opens headed browser for manual login.
 */
export async function ensureAuthenticated(
  config: FlowUpConfig,
  opts: AuthOptions = {},
): Promise<void> {
  const forceHeaded = opts.headed ?? false;
  const checkOnly = opts.check ?? false;

  // For check-only, just verify the session
  if (checkOnly) {
    const ctx = await launchBrowser({
      headless: true,
      profile: config.profile,
    });
    const page = await getPage();
    const authed = await isAuthenticated(page, config);
    await closeBrowser();

    if (authed) {
      log.success("Session is valid");
    } else {
      log.warn("Session is expired or not found. Run: flowup auth --headed");
      process.exit(1);
    }
    return;
  }

  // Try headless first (unless --headed was explicitly passed)
  if (!forceHeaded) {
    const ctx = await launchBrowser({
      headless: true,
      profile: config.profile,
    });
    const page = await getPage();
    const authed = await isAuthenticated(page, config);

    if (authed) {
      log.success("Session is valid (headless check)");
      await closeBrowser();
      return;
    }

    log.info("Session expired, switching to headed mode for login...");
    await closeBrowser();
  }

  // Open headed browser for manual login
  await launchBrowser({
    headless: false,
    profile: config.profile,
  });
  const page = await getPage();

  log.info("Opening Partiful login page...");
  log.info("Please log in manually. The session will be saved automatically.");
  log.info("Press Ctrl+C when done, or the tool will detect login automatically.");

  await page.goto(URLS.login, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Poll for successful login (check every 3s for up to 5 minutes)
  const maxWaitMs = 5 * 60 * 1000;
  const pollIntervalMs = 3000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const authed = await isAuthenticated(page, config);
    if (authed) {
      log.success("Login detected! Session saved.");
      await closeBrowser();
      return;
    }
  }

  log.error("Login timeout (5 minutes). Please try again.");
  await screenshotOnError(page, "auth-timeout");
  await closeBrowser();
  process.exit(1);
}
