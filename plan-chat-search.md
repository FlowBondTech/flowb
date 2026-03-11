# Plan: Comprehensive Chat & Search Overhaul

## Goal
Transform FlowB's AI chat from a Denver-locked Luma API proxy into a **full-featured event search engine** that queries the local `flowb_events` database with natural language — supporting any city, date ranges, categories, free/paid, and smart recommendations.

**User should be able to say things like:**
- "What's happening March 2-28 in Austin?"
- "Any free AI workshops this weekend?"
- "Show me parties near me tonight"
- "What DeFi events are coming up in Denver?"
- "Find me hackathons in the next 2 weeks"
- "What's happening tomorrow?"
- "Compare events in Austin vs Denver this month"

---

## Current Problems

| Problem | Impact |
|---------|--------|
| `search_events` queries Luma discover API, NOT local `flowb_events` table | Misses all EventBrite, Meetup, manually-added events |
| Hardcoded Denver coords (39.7392, -104.9903) | Can't search any other city |
| Max 8 results, no pagination | Misses events, poor UX for broad queries |
| No date range support in AI tool | "March 2-28" impossible |
| No category filtering in AI tool | "AI workshops" requires post-filtering guess |
| No free/paid filtering actually works | `isFree` from Luma is unreliable |
| System prompt is Denver/EthDenver-focused | Doesn't generalize to other cities |
| No "what cities have events?" capability | User can't discover available locations |
| No event count/summary tool | Can't answer "how many events this week?" |
| No recommendations based on user history | Everyone gets same generic results |

---

## Architecture Overview

```
USER: "What's happening March 2-28 in Austin?"
  |
  v
AI Chat (xAI Grok) — enhanced system prompt
  |
  v
search_events tool (REWRITTEN)
  |  Parameters: city, from, to, categories, free, q, limit, offset
  |
  v
flowb_events (Supabase) — NOT Luma API
  |  PostgREST query with filters
  |  Category join via flowb_event_category_map
  |
  v
Formatted results with links, dates, venues
  |
  v
AI formats response with context
```

---

## Phase 1: Rewrite `search_events` Tool
**Status**: `complete`
**Priority**: CRITICAL — this is the core fix

### Tasks
- [ ] 1.1 Replace Luma API call with Supabase `flowb_events` query
- [ ] 1.2 Add `city` parameter (uses ilike matching, same as REST API)
- [ ] 1.3 Add `from` / `to` date range parameters (ISO dates)
- [ ] 1.4 Add `categories` parameter (comma-separated slugs)
- [ ] 1.5 Add `free_only` boolean filter
- [ ] 1.6 Increase default limit to 20, max to 50
- [ ] 1.7 Include event source, categories, ticket URL in response
- [ ] 1.8 Format dates in human-readable form (not ISO)
- [ ] 1.9 Add event count summary at top ("Found 47 events in Austin, Mar 2-28")

### Tool Definition (new)
```json
{
  "name": "search_events",
  "description": "Search FlowB's event database. Use for any question about events, parties, meetups, hackathons, workshops, conferences. Supports city, date ranges, categories, free/paid filtering, and keyword search. Returns real events with links.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Keyword search (title, description, organizer)" },
      "city": { "type": "string", "description": "City name (e.g. 'Austin', 'Denver', 'New York')" },
      "from": { "type": "string", "description": "Start date YYYY-MM-DD" },
      "to": { "type": "string", "description": "End date YYYY-MM-DD" },
      "categories": { "type": "string", "description": "Comma-separated category slugs: defi, nft, ai, social, music, hackathon, workshop, networking, party, conference, meetup" },
      "free_only": { "type": "boolean", "description": "Only free events" },
      "event_type": { "type": "string", "description": "Event type: main_stage, side_event, party, workshop, hackathon, meetup, activation" },
      "limit": { "type": "number", "description": "Max results (default 20, max 50)" },
      "offset": { "type": "number", "description": "Pagination offset" }
    }
  }
}
```

### Files Modified
- `src/services/ai-chat.ts` — rewrite `search_events` tool def + `searchEvents()` function

---

## Phase 2: Add New Search Tools
**Status**: `complete`
**Priority**: HIGH — enables richer queries

### Tasks
- [ ] 2.1 Add `get_available_cities` tool — returns cities with upcoming event counts
- [ ] 2.2 Add `get_event_categories` tool — returns available categories with counts
- [ ] 2.3 Add `get_event_summary` tool — returns counts by day/category for a city+date range
- [ ] 2.4 Add `get_event_details` tool — fetch single event by ID with full details
- [ ] 2.5 Add `get_trending_events` tool — most RSVP'd / shared events in a city

### Tool Definitions
```
get_available_cities → "What cities have events?"
get_event_categories → "What types of events are there?"
get_event_summary → "How many events in Austin this week?" (returns day-by-day breakdown)
get_event_details → "Tell me more about [event name]" (full description, ticket link, etc.)
get_trending_events → "What's popular in Denver?" (sorted by rsvp_count + share_count)
```

### Files Modified
- `src/services/ai-chat.ts` — add 5 new tools + executors

---

## Phase 3: Upgrade System Prompt
**Status**: `complete`
**Priority**: HIGH — guides AI to use new tools effectively

### Tasks
- [ ] 3.1 Remove Denver/EthDenver specificity — make city-agnostic
- [ ] 3.2 Add tool usage instructions (when to use which tool)
- [ ] 3.3 Add date reasoning instructions (handle "this weekend", "next Friday", etc.)
- [ ] 3.4 Add category awareness (list available categories in prompt)
- [ ] 3.5 Add response formatting guidelines for event lists
- [ ] 3.6 Add "ask clarifying questions" behavior (if query is ambiguous, ask city/dates)
- [ ] 3.7 Include user's current_city / destination_city in prompt context
- [ ] 3.8 Add multi-tool chaining guidance ("search, then summarize, then recommend")

### Key System Prompt Changes
```
- "crew coordinator and event discovery AI" → "event discovery and social AI"
- Remove hardcoded Denver references
- Add: "When user asks about events without specifying a city, use their current_city or ask"
- Add: "For broad date queries, call get_event_summary first, then search_events for details"
- Add: "Available categories: defi, nft, ai, social, music, hackathon, workshop, networking, party, conference, meetup"
- Add: "Today is {date}. 'This weekend' means {saturday}-{sunday}. 'Next week' means {monday}-{sunday}."
```

### Files Modified
- `src/services/ai-chat.ts` — rewrite `buildSystemPrompt()`

---

## Phase 4: User Context & Personalization
**Status**: `complete`
**Priority**: MEDIUM — makes responses smarter

### Tasks
- [ ] 4.1 Fetch user's `current_city` and `destination_city` from `flowb_sessions`
- [ ] 4.2 Fetch user's past event categories (from `flowb_event_attendance`) for recommendations
- [ ] 4.3 Include crew event activity in context (what are crewmates attending?)
- [ ] 4.4 Add `get_recommended_events` tool — suggests events based on user interests + crew activity
- [ ] 4.5 Pass user context into system prompt for personalization

### Files Modified
- `src/services/ai-chat.ts` — enhanced `handleChat()` + new tool

---

## Phase 5: Response Quality & Formatting
**Status**: `complete`
**Priority**: MEDIUM — polish and UX

### Tasks
- [ ] 5.1 Format event listings consistently (title, date, time, venue, city, link)
- [ ] 5.2 Group events by day when showing multi-day results
- [ ] 5.3 Add "See more" pagination hint when results are truncated
- [ ] 5.4 Add RSVP inline action suggestion ("Reply with the event name to RSVP")
- [ ] 5.5 Handle empty results gracefully ("No events found. Try broadening your search...")
- [ ] 5.6 Add event count header ("Showing 20 of 47 events")
- [ ] 5.7 Increase `max_tokens` from 1024 to 2048 for longer event listings

### Files Modified
- `src/services/ai-chat.ts` — response formatting + max_tokens

---

## Phase 6: Testing & Deploy
**Status**: `complete`
**Priority**: CRITICAL — ship it

### Tasks
- [ ] 6.1 Test natural language queries locally
- [ ] 6.2 Test multi-city queries ("Austin events", "Denver workshops")
- [ ] 6.3 Test date range queries ("March 2-28", "this weekend", "tomorrow")
- [ ] 6.4 Test category filtering ("AI events", "parties tonight")
- [ ] 6.5 Test edge cases (no results, ambiguous queries, very broad queries)
- [ ] 6.6 Deploy to flowb.fly.dev
- [ ] 6.7 Smoke test in TG bot + mini apps

### Files Modified
- None (testing + deploy only)

---

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | | |

---

## Decisions Log
| Decision | Rationale |
|----------|-----------|
| Query Supabase instead of Luma API | Local DB has all sources (Luma + EventBrite + Meetup + manual), is faster, and supports rich filtering |
| Keep Luma as data source via scrapers | Don't remove Luma ingestion — just stop querying their API at chat time |
| Increase limits (20 default, 50 max) | Broad queries like "March 2-28" need more results |
| Add summary tool before detail tool | "How many events?" should be fast, then drill down |
| City-agnostic system prompt | FlowB isn't just for Denver anymore |
