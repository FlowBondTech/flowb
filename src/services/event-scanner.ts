/**
 * Event Scanner Service
 * Scans for new EthDenver events and adds them to the discovered events table.
 */

interface SbConfig { supabaseUrl: string; supabaseKey: string }

interface DiscoveredEvent {
  source: string;
  source_event_id?: string;
  title: string;
  title_slug: string;
  starts_at?: string;
  venue_name?: string;
  city: string;
  category?: string;
  is_free?: boolean;
  url?: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);
}

/** Scan for new events using the FlowBCore event discovery */
export async function scanForNewEvents(
  cfg: SbConfig,
  discoverFn: (opts: any) => Promise<any[]>,
): Promise<{ newCount: number; updatedCount: number }> {
  let newCount = 0;
  let updatedCount = 0;

  try {
    const events = await discoverFn({ action: "events", city: "Denver" });

    for (const event of events) {
      const titleSlug = slugify(event.title || "");
      if (!titleSlug) continue;

      const source = event.source || "egator";
      const sourceEventId = event.id || null;

      // Check if already exists
      const checkRes = await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_discovered_events?source=eq.${encodeURIComponent(source)}&title_slug=eq.${encodeURIComponent(titleSlug)}&select=id&limit=1`,
        {
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
          },
        },
      );

      const existing = checkRes.ok ? await checkRes.json() : [];

      if (existing?.length) {
        // Update last_seen
        await fetch(
          `${cfg.supabaseUrl}/rest/v1/flowb_discovered_events?id=eq.${existing[0].id}`,
          {
            method: "PATCH",
            headers: {
              apikey: cfg.supabaseKey,
              Authorization: `Bearer ${cfg.supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ last_seen: new Date().toISOString() }),
          },
        );
        updatedCount++;
      } else {
        // Insert new event
        await fetch(
          `${cfg.supabaseUrl}/rest/v1/flowb_discovered_events`,
          {
            method: "POST",
            headers: {
              apikey: cfg.supabaseKey,
              Authorization: `Bearer ${cfg.supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              source,
              source_event_id: sourceEventId,
              title: event.title,
              title_slug: titleSlug,
              starts_at: event.startTime || null,
              venue_name: event.locationName || null,
              city: "Denver",
              category: event.category || null,
              is_free: event.isFree ?? null,
              url: event.url || null,
            }),
          },
        );
        newCount++;
      }
    }
  } catch (err) {
    console.error("[event-scanner] Scan error:", err);
  }

  console.log(`[event-scanner] Scan complete: ${newCount} new, ${updatedCount} updated`);
  return { newCount, updatedCount };
}
