# Findings: Chat & Search Overhaul

## Current Architecture (as of March 5, 2026)

### AI Chat Service (`src/services/ai-chat.ts`)
- **LLM**: xAI Grok 3 Mini (`grok-3-mini-fast`)
- **Endpoint**: `POST /v1/chat/completions` on flowb.fly.dev
- **Max tool rounds**: 5
- **Max tokens**: 1024
- **12 tools**: search_events, get_my_schedule, find_person, locate_my_crew, update_my_location, share_location_code, lookup_location_code, rsvp_event, get_my_points, who_is_going, get_my_crews, get_activity_feed

### `search_events` Current Implementation (lines 206-271)
- Queries `https://api.lu.ma/discover/get-paginated-events`
- Hardcoded Denver: lat=39.7392, lng=-104.9903
- Default limit: 8, max: 15
- Post-filters by keyword, date, free_only (client-side)
- Returns: title, startTime, endTime, venue, city, isFree, url, organizer, rsvpCount

### Events REST API (`GET /api/v1/events`, routes.ts:910-1002)
- Queries `flowb_events` Supabase table directly
- Supports: city (ilike), categories (via join), zone, type, date, from, to, featured, free, q (full-text), limit, offset
- Auto-detects city from user session
- Default limit: 50, max: 200
- Category filter via `flowb_event_category_map` join

### Gap: AI chat does NOT use the REST API or Supabase
The `searchEvents()` function bypasses the entire local database and hits Luma directly. This means:
- Events from EventBrite, Meetup, manual submissions are invisible to chat
- Categories, zones, featured flags are unused
- City is hardcoded to Denver
- No date range support

### Supabase Tables for Events
| Table | Key Columns |
|-------|-------------|
| `flowb_events` | id, title, starts_at, ends_at, venue_name, city, is_free, price, ticket_url, event_type, source, tags, rsvp_count, share_count |
| `flowb_event_categories` | id, slug, name, icon, color |
| `flowb_event_category_map` | event_id, category_id |
| `flowb_venues` | id, name, city, latitude, longitude |
| `flowb_zones` | id, name, slug |

### Available Categories (from GET /api/v1/categories)
Slugs: defi, nft, ai, social, music, hackathon, workshop, networking, party, conference, meetup, gaming, dao, infrastructure, identity, privacy, payments, scaling, regulation, sustainability, art, health, education, governance, community

### Event Sources (scrapers in `src/plugins/egator/sources/`)
- `luma.ts` — Luma events
- `eventbrite-scraper.ts` — EventBrite events
- `meetup-scraper.ts` — Meetup events
- `lemonade.ts` — Lemonade events
- Plus manual submissions via `POST /api/v1/events/submit`

### System Prompt (lines 706-740)
- Denver/EthDenver focused
- No category awareness
- No date reasoning guidance
- No multi-city support
- Timezone hardcoded to MST

### Chat Clients
- **TG Mini App**: `miniapp/telegram/src/screens/Chat.tsx` (260 lines)
- **FC Mini App**: `miniapp/farcaster/src/components/FlowBChat.tsx` (191 lines)
- **Mobile App**: Has AI chat screen (Zustand store + API call)
- All call `POST /v1/chat/completions` on flowb.fly.dev

### Chatter (Passive Signal Extraction)
- `src/telegram/chatter.ts` — extracts event signals from group messages
- Stores in `flowb_channel_signals` table
- Not related to active search, but could feed recommendations

---

## Key Implementation Notes

### Supabase Query Pattern (from routes.ts)
```typescript
// PostgREST query string building
let query = `flowb_events?hidden=eq.false&order=starts_at.asc&limit=${limit}&offset=${offset}`;
if (city) query += `&city=ilike.*${encodeURIComponent(city)}*`;
if (from) query += `&starts_at=gte.${encodeURIComponent(from)}`;
if (to) query += `&starts_at=lte.${encodeURIComponent(to)}`;
if (q) query += `&or=(title.ilike.*${q}*,description.ilike.*${q}*,organizer_name.ilike.*${q}*)`;
```

### Category Filter Pattern (from routes.ts)
```typescript
// 1. Get category IDs from slugs
const catRows = await sbFetch(cfg, `flowb_event_categories?slug=in.(${slugs.join(",")})`);
// 2. Get event IDs from category map
const mappings = await sbFetch(cfg, `flowb_event_category_map?category_id=in.(${catIds.join(",")})`);
// 3. Filter events by IDs
events = events.filter(e => eventIds.has(e.id));
```

### `sbFetch` Helper
```typescript
import { sbFetch, type SbConfig } from "../utils/supabase.js";
// Already used throughout ai-chat.ts for other tools
```

### `dbEventToResult` (routes.ts)
Maps raw DB rows to clean API response — can reuse this pattern in AI tool.
