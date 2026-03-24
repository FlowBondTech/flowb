import * as SecureStore from "expo-secure-store";
import { API_URL } from "./constants";

const QUEUE_KEY = "flowbvip_offline_queue";

interface QueuedAction {
  type: "mark_read";
  ids: string[];
  timestamp: string;
}

/**
 * Read the current offline action queue from SecureStore.
 */
async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_KEY);
    if (raw) {
      return JSON.parse(raw) as QueuedAction[];
    }
  } catch {
    // Corrupted data - start fresh
  }
  return [];
}

/**
 * Persist the action queue to SecureStore.
 */
async function saveQueue(queue: QueuedAction[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Best-effort persistence
  }
}

/**
 * Enqueue a mark-read action for later replay when connectivity returns.
 */
export async function enqueueMarkRead(ids: string[]): Promise<void> {
  const queue = await getQueue();
  queue.push({
    type: "mark_read",
    ids,
    timestamp: new Date().toISOString(),
  });
  await saveQueue(queue);
}

/**
 * Check if the API is reachable with a fast health check.
 * Returns true if the server responds within 3 seconds.
 */
export async function isApiReachable(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${API_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Replay all queued offline actions against the API.
 * Called on app foreground and connectivity restore.
 * Uses the provided markReadFn so auth headers are properly attached.
 */
export async function replayQueue(
  markReadFn: (ids: string[]) => Promise<void>
): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  const reachable = await isApiReachable();
  if (!reachable) return;

  const failed: QueuedAction[] = [];

  for (const action of queue) {
    if (action.type === "mark_read") {
      try {
        await markReadFn(action.ids);
      } catch {
        failed.push(action);
      }
    }
  }

  await saveQueue(failed);
}

/**
 * Get the number of pending queued actions.
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
