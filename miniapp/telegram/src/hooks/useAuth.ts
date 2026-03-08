import { useState, useEffect, useCallback } from "react";
import { authTelegram, getToken, claimPendingPoints } from "../api/client";
import { getPendingActions, clearPendingActions } from "../lib/pendingPoints";

import type { UserProfile } from "../api/types";

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const authenticate = useCallback(async () => {
    const tg = (window as any).Telegram?.WebApp;

    // If not in Telegram, just mark as loaded with no user (no error)
    if (!tg?.initData) {
      setState({ user: null, loading: false, error: null });
      return;
    }

    try {
      const result = await authTelegram(tg.initData);
      setState({ user: result.user, loading: false, error: null });

      // Claim any points earned before auth completed
      const pending = getPendingActions();
      if (pending.length > 0) {
        claimPendingPoints(pending)
          .then(({ claimed }) => {
            if (claimed > 0) console.log(`[auth] Claimed ${claimed} pending points`);
            clearPendingActions();
          })
          .catch(() => {});
      }

      // Tell Telegram the app is ready
      tg.ready();
      tg.expand();
    } catch (err: any) {
      // Auth failed — still allow browsing, just no user
      console.warn("[auth] Failed:", err.message);
      setState({ user: null, loading: false, error: null });
      tg?.ready();
      tg?.expand();
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      authenticate();
    }
  }, [authenticate]);

  return state;
}
