/**
 * Structured Logger
 *
 * Lightweight console wrapper with ISO timestamps and level prefixes.
 * No external dependencies.
 */

function fmt(level: string, ns: string, msg: string, data?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const extra = data ? " " + JSON.stringify(data) : "";
  return `${ts} ${level} ${ns} ${msg}${extra}`;
}

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

export const log = {
  info(ns: string, msg: string, data?: Record<string, unknown>) {
    console.log(fmt("INFO", ns, msg, data));
  },
  warn(ns: string, msg: string, data?: Record<string, unknown>) {
    console.warn(fmt("WARN", ns, msg, data));
  },
  error(ns: string, msg: string, data?: Record<string, unknown>) {
    console.error(fmt("ERROR", ns, msg, data));
  },
  debug(ns: string, msg: string, data?: Record<string, unknown>) {
    if (process.env.DEBUG) {
      console.debug(fmt("DEBUG", ns, msg, data));
    }
  },
};

/**
 * Fire-and-forget wrapper that logs failures instead of silently swallowing them.
 *
 * Usage: fireAndForget(core.awardPoints(...), "award points")
 */
export function fireAndForget(promise: Promise<unknown>, context: string): void {
  promise.catch((err) => log.warn("[bg]", context, { error: extractError(err) }));
}
