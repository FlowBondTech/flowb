#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig } from "./config.js";
import { setVerbose } from "./core/logger.js";
import { ensureAuthenticated } from "./flows/auth.js";
import { discoverEvents, formatEventsTable } from "./flows/discover.js";
import { batchRsvp, rsvpDiscover, formatRsvpResults } from "./flows/rsvp.js";
import { createEvent } from "./flows/create.js";
import { inviteContacts, formatInviteResult } from "./flows/invite.js";

const program = new Command();

program
  .name("flowup")
  .description("Partiful web automation tool")
  .version("0.1.0")
  .option("--headed", "Run browser in headed mode")
  .option("--headless", "Run browser in headless mode")
  .option("--verbose", "Enable verbose logging")
  .option("--dry-run", "Preview actions without executing")
  .option("--profile <name>", "Browser profile name", "default");

// ============================================================================
// auth
// ============================================================================

program
  .command("auth")
  .description("Login or validate Partiful session")
  .option("--headed", "Force headed mode for login")
  .option("--check", "Only check if session is valid")
  .action(async (opts) => {
    const globalOpts = program.opts();
    applyGlobalOpts(globalOpts);

    const config = loadConfig({
      headless: globalOpts.headed ? false : !opts.headed,
      profile: globalOpts.profile,
    });

    await ensureAuthenticated(config, {
      headed: opts.headed || globalOpts.headed,
      check: opts.check,
    });
  });

// ============================================================================
// discover
// ============================================================================

program
  .command("discover")
  .description("Browse Partiful Discover pages and extract events")
  .option("--city <cities>", "Comma-separated city slugs", "")
  .option("--keywords <words>", "Comma-separated keywords to filter", "")
  .option("--limit <n>", "Max events to return", parseInt)
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const globalOpts = program.opts();
    applyGlobalOpts(globalOpts);

    const config = loadConfig({
      headless: resolveHeadless(globalOpts),
      profile: globalOpts.profile,
    });

    const cities = opts.city ? opts.city.split(",").map((c: string) => c.trim()) : undefined;
    const keywords = opts.keywords ? opts.keywords.split(",").map((k: string) => k.trim()) : undefined;

    const events = await discoverEvents(config, {
      cities,
      keywords,
      limit: opts.limit,
    });

    if (opts.json) {
      console.log(JSON.stringify(events, null, 2));
    } else {
      console.log(formatEventsTable(events));
    }
  });

// ============================================================================
// rsvp
// ============================================================================

program
  .command("rsvp <event-ids...>")
  .description("RSVP to one or more events by ID")
  .option("--status <status>", "RSVP status: going or maybe", "going")
  .option("--message <msg>", "Optional message with RSVP")
  .option("--dry-run", "Preview without RSVPing")
  .action(async (eventIds: string[], opts) => {
    const globalOpts = program.opts();
    applyGlobalOpts(globalOpts);

    const config = loadConfig({
      headless: resolveHeadless(globalOpts),
      profile: globalOpts.profile,
    });

    const results = await batchRsvp(config, eventIds, {
      status: opts.status as "going" | "maybe",
      message: opts.message,
      dryRun: opts.dryRun || globalOpts.dryRun,
    });

    console.log(formatRsvpResults(results));
  });

// ============================================================================
// rsvp-discover
// ============================================================================

program
  .command("rsvp-discover")
  .description("Discover events and auto-RSVP to matching ones")
  .option("--city <cities>", "Comma-separated city slugs", "")
  .option("--keywords <words>", "Comma-separated keywords", "")
  .option("--max <n>", "Max events to RSVP to", parseInt, 5)
  .option("--status <status>", "RSVP status: going or maybe", "going")
  .option("--dry-run", "Preview without RSVPing")
  .action(async (opts) => {
    const globalOpts = program.opts();
    applyGlobalOpts(globalOpts);

    const config = loadConfig({
      headless: resolveHeadless(globalOpts),
      profile: globalOpts.profile,
    });

    const cities = opts.city ? opts.city.split(",").map((c: string) => c.trim()) : undefined;
    const keywords = opts.keywords ? opts.keywords.split(",").map((k: string) => k.trim()) : undefined;

    const results = await rsvpDiscover(
      config,
      { cities, keywords },
      {
        max: opts.max,
        status: opts.status as "going" | "maybe",
        dryRun: opts.dryRun || globalOpts.dryRun,
      },
    );

    console.log(formatRsvpResults(results));
  });

// ============================================================================
// create
// ============================================================================

program
  .command("create")
  .description("Create a new event from template or inline options")
  .option("--template <path>", "JSON template file path")
  .option("--title <title>", "Event title")
  .option("--date <date>", "Event date (YYYY-MM-DD)")
  .option("--dry-run", "Preview without creating")
  .action(async (opts) => {
    const globalOpts = program.opts();
    applyGlobalOpts(globalOpts);

    const config = loadConfig({
      headless: resolveHeadless(globalOpts),
      profile: globalOpts.profile,
    });

    const result = await createEvent(config, {
      templatePath: opts.template,
      title: opts.title,
      date: opts.date,
      dryRun: opts.dryRun || globalOpts.dryRun,
    });

    if (result.success) {
      console.log(`\nEvent created successfully!`);
      if (result.eventUrl) console.log(`URL: ${result.eventUrl}`);
    } else {
      console.error(`\nFailed to create event: ${result.error}`);
      process.exit(1);
    }
  });

// ============================================================================
// invite
// ============================================================================

program
  .command("invite <event-id>")
  .description("Invite contacts to an event from CSV")
  .option("--contacts <path>", "CSV file path", "contacts.csv")
  .option("--batch-size <n>", "Contacts per batch", parseInt, 10)
  .option("--dry-run", "Preview without inviting")
  .action(async (eventId: string, opts) => {
    const globalOpts = program.opts();
    applyGlobalOpts(globalOpts);

    const config = loadConfig({
      headless: resolveHeadless(globalOpts),
      profile: globalOpts.profile,
    });

    const result = await inviteContacts(config, eventId, {
      contactsPath: opts.contacts,
      batchSize: opts.batchSize,
      dryRun: opts.dryRun || globalOpts.dryRun,
    });

    console.log(formatInviteResult(result));
  });

// ============================================================================
// Helpers
// ============================================================================

function applyGlobalOpts(opts: Record<string, any>): void {
  if (opts.verbose) setVerbose(true);
}

function resolveHeadless(opts: Record<string, any>): boolean {
  if (opts.headed) return false;
  if (opts.headless) return true;
  return true; // default headless
}

// ============================================================================
// Run
// ============================================================================

program.parse();
