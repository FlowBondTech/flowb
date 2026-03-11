# FlowB TODO

Running list of tasks, features, and follow-ups.
Todos are also stored in the `flowb_todos` database table and queryable via `/api/v1/todos`.

---

## Signal Integration (added 2026-02-26)

Code is written and compiles clean. Remaining steps to go live:

- [ ] Deploy signal-cli-rest-api Docker container (alongside flowb.fly.dev or separate)
  - Register a phone number with Signal
  - Configure json-rpc mode for best performance
- [ ] Set env vars on Fly.io: `SIGNAL_API_URL`, `SIGNAL_BOT_NUMBER`, `SIGNAL_WEBHOOK_SECRET`
- [ ] Configure signal-cli-rest-api webhook to POST to `https://flowb.fly.dev/api/v1/signal/webhook`
- [ ] Run migration `010_signal.sql` against Supabase
- [ ] Test end-to-end: send "hi" to bot number on Signal, verify welcome message
- [ ] Test cross-platform identity linking (Signal + Telegram same phone via Privy)
- [ ] Test notifications dispatch to Signal users
- [ ] Add Signal to admin daily summary counts
- [ ] Consider: Signal mini app (miniapp/signal/) - same pattern as wa.flowb.me
- [ ] Consider: Signal group bot support (currently DM-only)
- [ ] Add Signal to docs site platform list

---

## Postiz Per-Org API Key (added 2026-02-26)

**Priority: HIGH** - Security/isolation issue

- [ ] Extract per-org API key from Postiz response instead of using master key
  - File: `src/plugins/social/index.ts:104`
  - Currently: `const orgApiKey = cfg.postizMasterApiKey; // TODO: use per-org key`
  - Impact: All orgs share same master key, no isolation

---

## Privy Social Linking - Phase 3 (added 2026-02-26)

From PLAN-telegram-auth.md, Phase 3 not started:

- [ ] Add Discord social linking via Privy
- [ ] Add Twitter/X social linking via Privy
- [ ] Add GitHub social linking via Privy
- [ ] Add Farcaster social linking via Privy
- [ ] Implement verification badges system
- [ ] Multi-social bonus points (10 pts per linked social)

---

## SocialB - Mastodon Support (added 2026-02-26)

UI exists in web/social.html but marked "Coming Soon":

- [ ] Implement Mastodon posting via Postiz integration
- [ ] Enable Mastodon checkbox in social.html

---

## SMS Notifications (added 2026-02-26)

Mentioned on pitch.html as "coming soon":

- [ ] Research SMS provider (Twilio, etc.)
- [ ] Implement SMS notification channel in notifications.ts
- [ ] Add SMS opt-in to user settings

---

## Mobile App Polish (added 2026-02-26)

App exists in `mobile/` (Expo) but web about.html says "Coming soon":

- [ ] Update about.html copy to reflect actual mobile app status
- [ ] Submit to App Store / Google Play if not already live

---

## Farcaster Mini App - Missing Features (added 2026-02-26)

AboutScreen.tsx has "Coming soon" placeholder:

- [ ] Identify and implement the planned feature in Farcaster mini app AboutScreen

---

## Admin Notifications Setup (added 2026-02-26)

- [ ] Set `FLOWB_ADMIN_ALERT_IDS` env var with steph + koH Telegram chat IDs
- [ ] Add `FLOWB_ADMIN_ALERT_IDS` to .env.example for documentation

---

## eGator Multi-Source Scraping (added 2026-02-28)

All adapters re-enabled in code. Current status:

- [x] Luma - active, 26 events synced
- [ ] Tavily - **key hit usage limit (432)** - upgrade plan or get new key at tavily.com
- [ ] Resident Advisor - enabled but returns 0 for Denver (European/dance focus)
- [ ] Eventbrite - set `EVENTBRITE_API_KEY` on Fly.io
- [ ] Brave Search - set `BRAVE_API_KEY` on Fly.io
- [ ] Lemonade - set `EGATOR_LEMONADE=true` on Fly.io
- [ ] Sheeets (Google Spreadsheet) - set `SHEEETS_SPREADSHEET_ID` on Fly.io
- [ ] Google Places - set `GOOGLE_PLACES_API_KEY` on Fly.io

Trigger scan: `curl -X POST https://flowb.fly.dev/api/v1/admin/scan-events -H "x-admin-key: $KEY" -H "Content-Type: application/json" -d '{}'`

---

## Todo System (added 2026-02-26)

- [ ] Run migration `011_todos.sql` against Supabase
- [ ] Add todo UI to web app or mini apps
- [ ] Add /todo command to WhatsApp + Signal bots (Telegram done)

---
