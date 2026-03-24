# FlowB Changelog - March 9-11, 2026

**22 commits** | **119 files changed** | **+12,213 / -1,217 lines**

---

## AI & Chat System

### Seamless Chat Experience (`750fedc`)
- Rebuilt AI chat as LLM-primary with expanded tool-calling across all platforms (TG, FC, web)
- New `chat-tools-biz.ts` service with 674 lines of business-context tools
- Farcaster responder refactored to use shared AI chat pipeline
- OpenClaw (FC bot) upgraded with 205+ lines of new routing logic

### RAG Memory System (`fabe775`, `e81ec15`, `9963554`)
- Added per-user agent memory with pgvector hybrid search (vector + FTS)
- Full-text search fallback when no embedding API key is set
- Switched embedding dimensions to 1024 for Voyage AI compatibility
- Migration: `031_agent_memory_rag.sql` (220 lines) + FTS fallback migration

### AI Identity & Tools (`57cdde9`, `ee7b939`)
- Added `get_flowb_features` and `get_whats_new` public tools to AI chat (289 lines)
- Expanded FlowB AI identity to include business assistant capabilities (177 lines)

### Todo Tools in AI Chat (`2509123`)
- Added todo/task management tools to AI chat interface
- Fixed usage tracking column mismatch
- Migration: `036_flowb_todos.sql`

### Memory Context Fix (`f66fd08`)
- Fixed memory context loading across all platforms (TG, FC, web)

---

## FiFlow CFO Plugin (`ed6bb86`)
- New financial persona plugin with CFO routing logic
- `fiflow/constants.ts` (264 lines), `fiflow/index.ts` (646 lines), `fiflow/personality.ts` (285 lines)
- Server routes: `fiflow-routes.ts` (264 lines)
- Telegram bot expanded with 432+ lines for FiFlow integration
- Migration: `035_fiflow_cfo.sql` (179 lines)

---

## Authentication & Identity

### Dual Auth + Supabase Passport (`1c82ae9`)
- Added dual auth mode supporting both Privy and Supabase Passport
- New `supabase-auth.ts` service (219 lines)
- Identity linking across platforms
- 221+ lines of new auth routes

### Mobile Passport Auth (`4771aac`)
- Added FlowB Passport auth support to Expo mobile app
- New `supabase-client.ts` utility for mobile
- Updated auth store and API client

---

## Business Platform

### Biz Onboarding (`a8da6aa`, `ab9b0b7`)
- Full onboarding flow: select-all deal, discount codes, angel pricing
- Backend routes for questionnaire submission (82 lines)
- Migration: `033_flowb_questionnaire.sql`
- Refined UI with shadcn-inspired design system (341 line rewrite)

### Biz Notifications Stub (`7a76fbd`)
- Added `biz-notifications.ts` service stub
- Fixed request.body type casting in routes (173 lines of route additions)

---

## Event Discovery (eGator)

### DuckDuckGo Search (`218def3`)
- Replaced Tavily (paid) with free DuckDuckGo search for event discovery
- Refactored `tavily.ts` source (204 insertions, 128 deletions)

### OG Image Backfill (`48137dd`)
- Added og:image scraping for event sources missing images
- New `parse-utils.ts` helpers
- Applied to Lemonade and Tavily/DDG sources

---

## Kanban & Task Management

### Elite Task Modal (`f16c225`)
- Complete rewrite of kanban task modal with modular tab system
- New tabs: activity timeline, attachments, checklist, dependencies, time tracking, description editor
- Bidirectional todo sync with backend
- Draft persistence via `use-auto-save.ts` and `use-local-preferences.ts`
- Migration: `030_kanban_elite_sync.sql` (171 lines)
- **21 files changed, +3,368 / -453 lines**

---

## Mini Apps & Mobile

### Telegram Mini App UX (`f391278`)
- Added splash screen and improved login flow
- Compact boost banner on home screen
- Onboarding skip option + daily reminder notifications
- New notification scheduling service (54 lines)

### Onboarding Fix (`d2f3ab7`)
- Fixed onboarding screen always showing on TG and FC mini apps
- Added `hasCompletedOnboarding` flag to user profile type
- Backend routes now return onboarding status (124 lines added)

---

## Branding & Docs

### Rebrand to "Find Your Flow" (`d51d7da`)
- Renamed "Event Discovery" to "Find Your Flow" across 24 files
- Updated all surfaces: bots, mini apps, mobile, web, docs, pitch pages

### Email Provisioning Docs (`3bdd211`)
- Added FlowBond email provisioning documentation (88 lines)
- Updated VitePress config with new sidebar entry

### Website Tool Descriptions (`3026f76`)
- Removed hardcoded site name from AI tool descriptions
- New `chat-tools-websites.ts` (347 lines)

---

## Bug Fixes

- Fixed broken `crew.png` image URL in Farcaster casts (`a7bd7bb`)
- Fixed build errors from missing biz-notifications stub (`7a76fbd`)
- Fixed onboarding screen persistence bug on mini apps (`d2f3ab7`)
- Fixed memory context not loading on web/FC platforms (`f66fd08`)
- Fixed AI usage tracking column mismatch (`2509123`)
