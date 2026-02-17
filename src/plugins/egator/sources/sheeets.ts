/**
 * Sheeets.xyz Google Spreadsheet Event Source Adapter
 * Fetches curated EthDenver side events from the community-maintained spreadsheet
 * Source: https://docs.google.com/spreadsheets/d/1xWmIHyEyOmPHfkYuZkucPRlLGWbb9CF6Oqvfl8FUV6k
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

export class SheeetsAdapter implements EventSourceAdapter {
  id = "sheeets";
  name = "Sheeets";

  constructor(private spreadsheetId: string, private gid: string = "356217373") {}

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=${this.gid}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`[egator:sheeets] ${res.status}: ${await res.text()}`);
        return [];
      }

      const csv = await res.text();
      const rows = parseCSV(csv);

      // Find the header row (contains "Date", "Event Name", etc.)
      const headerIdx = rows.findIndex(
        (r) => r[0]?.trim() === "Date" && r.some((c) => c.trim() === "Event Name")
      );
      if (headerIdx < 0) {
        console.error("[egator:sheeets] Could not find header row");
        return [];
      }

      const headers = rows[headerIdx].map((h) => h.trim());
      const colIdx = (name: string) => headers.indexOf(name);

      const dateCol = colIdx("Date");
      const startCol = colIdx("Start Time");
      const endCol = colIdx("End Time");
      const orgCol = colIdx("Organizer");
      const nameCol = colIdx("Event Name");
      const addrCol = colIdx("Address");
      const costCol = colIdx("Cost");
      const tagsCol = colIdx("Tags");
      const linkCol = colIdx("Link");
      const foodCol = colIdx("Food");
      const barCol = colIdx("Bar");

      const events: EventResult[] = [];
      const now = new Date();
      const year = 2026; // EthDenver 2026

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[nameCol]?.trim() || !row[dateCol]?.trim()) continue;

        const title = row[nameCol].trim();
        const dateStr = row[dateCol].trim();
        const startStr = row[startCol]?.trim();
        const endStr = row[endCol]?.trim();
        const organizer = row[orgCol]?.trim();
        const address = row[addrCol]?.trim();
        const costRaw = row[costCol]?.trim();
        const tags = row[tagsCol]?.trim();
        const link = row[linkCol]?.trim();
        const hasFood = row[foodCol]?.trim().toUpperCase() === "TRUE";
        const hasBar = row[barCol]?.trim().toUpperCase() === "TRUE";

        const startTime = parseDateTime(dateStr, startStr, year);
        if (!startTime) continue;

        // Skip past events
        if (startTime < now) continue;

        const endTime = parseDateTime(dateStr, endStr, year);

        const isFree = !costRaw || costRaw.toLowerCase() === "free";
        const price = isFree ? undefined : parsePrice(costRaw);

        const descParts: string[] = [];
        if (organizer) descParts.push(`By ${organizer}`);
        if (tags) descParts.push(tags);
        if (hasFood) descParts.push("Food provided");
        if (hasBar) descParts.push("Bar available");

        events.push({
          id: `sheeets_${i}`,
          title,
          description: descParts.join(" | ") || undefined,
          startTime: startTime.toISOString(),
          endTime: endTime?.toISOString(),
          locationName: address || undefined,
          locationCity: "Denver",
          isFree,
          price,
          isVirtual: false,
          source: "sheeets",
          url: link || undefined,
        });
      }

      // Sort by start time
      events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      // Apply limit
      const limit = params.limit || 20;
      return events.slice(0, limit);
    } catch (err: any) {
      console.error("[egator:sheeets] Fetch error:", err.message);
      return [];
    }
  }
}

/** Parse "Sun, Feb 8" + "3:00p" into a Date */
function parseDateTime(dateStr: string, timeStr: string | undefined, year: number): Date | null {
  try {
    // dateStr: "Sun, Feb 8" or "Mon, Feb 17"
    const match = dateStr.match(/(\w+),?\s+(\w+)\s+(\d+)/);
    if (!match) return null;

    const monthStr = match[2];
    const day = parseInt(match[3], 10);

    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const month = months[monthStr];
    if (month === undefined) return null;

    let hours = 12;
    let minutes = 0;

    if (timeStr) {
      // timeStr: "3:00p", "11:00a", "12:00a"
      const tm = timeStr.match(/(\d+):(\d+)\s*([ap])/i);
      if (tm) {
        hours = parseInt(tm[1], 10);
        minutes = parseInt(tm[2], 10);
        const ampm = tm[3].toLowerCase();
        if (ampm === "p" && hours !== 12) hours += 12;
        if (ampm === "a" && hours === 12) hours = 0;
      }
    }

    // Use Denver timezone (MST = UTC-7)
    const date = new Date(Date.UTC(year, month, day, hours + 7, minutes));
    return date;
  } catch {
    return null;
  }
}

/** Parse "$133.70" or "Free" into a number */
function parsePrice(costStr: string): number | undefined {
  const match = costStr.match(/\$?([\d,.]+)/);
  if (!match) return undefined;
  return parseFloat(match[1].replace(",", ""));
}

/** Simple CSV parser that handles quoted fields with commas */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        if (ch === "\r") i++;
      } else {
        field += ch;
      }
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
