import { chromium, type BrowserContext, type Page } from "playwright";
import { createLogger } from "./logger.js";
import { getDataDir } from "../config.js";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const log = createLogger("browser");

let context: BrowserContext | null = null;

export interface LaunchOptions {
  headless?: boolean;
  profile?: string;
}

/**
 * Launch a persistent browser context with stealth measures.
 * Uses persistent context for session/cookie reuse across runs.
 */
export async function launchBrowser(opts: LaunchOptions = {}): Promise<BrowserContext> {
  if (context) return context;

  const { headless = true, profile = "default" } = opts;
  const sessionDir = resolve(getDataDir("sessions"), profile);

  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  log.info(`Launching browser (headless=${headless}, profile=${profile})`);

  // Try loading stealth plugin - graceful fallback if not available
  let stealthArgs: string[] = [];
  try {
    // playwright-extra + stealth plugin for fingerprint masking
    const { chromium: stealthChromium } = await import("playwright-extra");
    const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
    stealthChromium.use(StealthPlugin());

    context = await stealthChromium.launchPersistentContext(sessionDir, {
      headless,
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      timezoneId: "America/New_York",
      userAgent: undefined, // let stealth plugin handle this
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
      ],
    });
    log.info("Launched with stealth plugin");
  } catch {
    log.warn("Stealth plugin not available, using standard Playwright");
    context = await chromium.launchPersistentContext(sessionDir, {
      headless,
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      timezoneId: "America/New_York",
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
      ],
    });
  }

  return context;
}

/**
 * Get a page from the browser context (reuses existing or creates new).
 */
export async function getPage(): Promise<Page> {
  if (!context) throw new Error("Browser not launched. Call launchBrowser() first.");
  const pages = context.pages();
  return pages.length > 0 ? pages[0] : await context.newPage();
}

/**
 * Take a screenshot on error for debugging.
 */
export async function screenshotOnError(page: Page, name: string): Promise<string | null> {
  try {
    const dir = getDataDir("screenshots");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const path = resolve(dir, `${name}-${Date.now()}.png`);
    await page.screenshot({ path, fullPage: false });
    log.info(`Screenshot saved: ${path}`);
    return path;
  } catch (err: any) {
    log.warn(`Failed to take screenshot: ${err.message}`);
    return null;
  }
}

/**
 * Close browser context and clean up.
 */
export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
    log.info("Browser closed");
  }
}

/**
 * Retry a function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; delayMs?: number; label?: string } = {},
): Promise<T> {
  const { retries = 2, delayMs = 1000, label = "operation" } = opts;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        const wait = delayMs * Math.pow(2, attempt);
        log.warn(`${label} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${wait}ms: ${err.message}`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  throw lastError;
}
