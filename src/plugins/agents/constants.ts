/**
 * Agents Plugin Constants
 *
 * Centralizes all hardcoded pricing, defaults, and configuration
 * for the personal AI agent system.
 */

export const SEED_BALANCE_USDC = 0.50;

export const DEFAULT_SKILLS = ["basic-search"];

export const PRICING = {
  RECOMMENDATION: 0.02,
  EVENT_BOOST: 0.50,
  TIP_MAX: 10,
} as const;

export const CHAMPION_AWARD = {
  SLOTS: [9, 10] as const,
  PRIZE_USDC: 25,
  SKILLS: ["basic-search", "event-discovery", "social-connector"],
} as const;

export const PAYMENT_CONFIG = {
  currency: "USDC",
  network: "base",
} as const;

export const DEFAULT_BOOST_HOURS = 24;
