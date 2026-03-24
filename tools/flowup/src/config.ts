import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import type { FlowUpConfig, TimingConfig } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const DEFAULT_TIMING: TimingConfig = {
  pageLoad: [2000, 5000],
  betweenActions: [800, 2500],
  typing: [50, 150],
  rsvpCooldown: [5000, 15000],
  inviteBatchCooldown: [10000, 20000],
  scroll: [300, 800],
};

const DEFAULT_CONFIG: FlowUpConfig = {
  cities: ["nyc", "sf", "la"],
  defaultRsvpStatus: "going",
  timing: DEFAULT_TIMING,
  profile: "default",
  headless: true,
  keywords: [],
  inviteBatchSize: 10,
};

export function loadConfig(overrides?: Partial<FlowUpConfig>): FlowUpConfig {
  const configPath = resolve(PROJECT_ROOT, "flowup.config.yaml");
  let fileConfig: Partial<FlowUpConfig> = {};

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      fileConfig = parseYaml(raw) || {};
    } catch (err: any) {
      console.warn(`[flowup:config] Failed to parse config: ${err.message}`);
    }
  }

  const timing: TimingConfig = {
    ...DEFAULT_TIMING,
    ...(fileConfig.timing || {}),
    ...(overrides?.timing || {}),
  };

  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...overrides,
    timing,
  };
}

export function getProjectRoot(): string {
  return PROJECT_ROOT;
}

export function getDataDir(sub: string): string {
  return resolve(PROJECT_ROOT, "data", sub);
}
