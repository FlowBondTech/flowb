/**
 * Supabase REST helpers (PostgREST)
 * Same pattern as flowb/src/plugins/danz/index.ts
 */

export interface DbConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

let _cfg: DbConfig | null = null;

export function initDb(config: DbConfig): void {
  _cfg = config;
}

function cfg(): DbConfig {
  if (!_cfg) throw new Error("db not initialized - call initDb() first");
  return _cfg;
}

function headers(): Record<string, string> {
  const c = cfg();
  return {
    apikey: c.supabaseKey,
    Authorization: `Bearer ${c.supabaseKey}`,
    "Content-Type": "application/json",
  };
}

export async function query<T>(
  table: string,
  params: Record<string, string>,
): Promise<T | null> {
  const c = cfg();
  const url = new URL(`${c.supabaseUrl}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url.toString(), { headers: headers() });
    if (!res.ok) {
      console.error(`[db] query ${table} failed: ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[db] query ${table} error:`, (err as Error).message);
    return null;
  }
}

export async function insert<T = any>(
  table: string,
  data: Record<string, any>,
): Promise<T | null> {
  const c = cfg();
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...headers(), Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.error(`[db] insert ${table} failed: ${res.status}`);
      return null;
    }
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    console.error(`[db] insert ${table} error:`, (err as Error).message);
    return null;
  }
}

export async function upsert<T = any>(
  table: string,
  data: Record<string, any>,
  onConflict: string,
): Promise<T | null> {
  const c = cfg();
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        ...headers(),
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.error(`[db] upsert ${table} failed: ${res.status}`);
      return null;
    }
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    console.error(`[db] upsert ${table} error:`, (err as Error).message);
    return null;
  }
}

export async function update<T = any>(
  table: string,
  data: Record<string, any>,
  filter: Record<string, string>,
): Promise<T | null> {
  const c = cfg();
  const url = new URL(`${c.supabaseUrl}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(filter)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: { ...headers(), Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.error(`[db] update ${table} failed: ${res.status}`);
      return null;
    }
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    console.error(`[db] update ${table} error:`, (err as Error).message);
    return null;
  }
}

export async function patch(
  table: string,
  data: Record<string, any>,
  filter: Record<string, string>,
): Promise<boolean> {
  const c = cfg();
  const url = new URL(`${c.supabaseUrl}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(filter)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: { ...headers(), Prefer: "return=minimal" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}
