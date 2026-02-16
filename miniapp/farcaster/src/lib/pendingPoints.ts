/**
 * Pending Points - tracks anonymous actions in localStorage
 * for claiming to the backend after authentication.
 */

const PENDING_LEDGER_KEY = "flowb-pending-actions";

export interface PendingAction {
  action: string;
  ts: number;
}

export function logPendingAction(action: string): void {
  const ledger = getPendingActions();
  ledger.push({ action, ts: Date.now() });
  localStorage.setItem(PENDING_LEDGER_KEY, JSON.stringify(ledger));
}

export function getPendingActions(): PendingAction[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_LEDGER_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearPendingActions(): void {
  localStorage.removeItem(PENDING_LEDGER_KEY);
}
