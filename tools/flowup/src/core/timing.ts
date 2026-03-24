import type { Page } from "playwright";
import type { TimingConfig } from "../types.js";

/**
 * Gaussian-distributed random number (Box-Muller transform).
 * Returns a value centered around the midpoint of [min, max]
 * with ~68% of values within the inner half of the range.
 */
function gaussianRandom(min: number, max: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const normal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

  const mean = (min + max) / 2;
  const stddev = (max - min) / 4; // ~95% within range
  const value = mean + normal * stddev;

  return Math.max(min, Math.min(max, Math.round(value)));
}

/** Sleep for a gaussian-distributed random duration within [min, max] ms. */
export function humanDelay(range: [number, number]): Promise<void> {
  const ms = gaussianRandom(range[0], range[1]);
  return new Promise((r) => setTimeout(r, ms));
}

/** Sleep for a fixed duration. */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Type text with human-like variable inter-key delays.
 * Occasionally pauses longer (simulating thinking).
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string,
  timing: TimingConfig,
): Promise<void> {
  await page.click(selector);
  await humanDelay(timing.betweenActions);

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    await page.keyboard.type(char, { delay: 0 });

    // Variable delay per character
    const charDelay = gaussianRandom(timing.typing[0], timing.typing[1]);
    await sleep(charDelay);

    // Occasional pause every 5-15 chars (simulating thinking)
    if (i > 0 && i % gaussianRandom(5, 15) === 0) {
      await sleep(gaussianRandom(200, 600));
    }
  }
}

/**
 * Click with a small pre-delay (human reaction time).
 */
export async function humanClick(
  page: Page,
  selector: string,
  timing: TimingConfig,
): Promise<void> {
  await humanDelay([100, 300]);
  await page.click(selector);
  await humanDelay(timing.betweenActions);
}

/**
 * Scroll the page naturally - small increments with variable speed.
 */
export async function humanScroll(
  page: Page,
  distance: number,
  timing: TimingConfig,
): Promise<void> {
  const steps = Math.ceil(Math.abs(distance) / gaussianRandom(80, 200));
  const stepDistance = distance / steps;

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepDistance);
    await humanDelay(timing.scroll);
  }
}

/**
 * Wait for page to load with human-like patience.
 */
export async function waitForPageLoad(
  page: Page,
  timing: TimingConfig,
): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await humanDelay(timing.pageLoad);
}
