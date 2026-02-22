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
    try {
      // Get initData from Telegram WebApp
      const tg = (window as any).Telegram?.WebApp;
      if (!tg?.initData) {
        setState({ user: null, loading: false, error: "Not in Telegram" });
        return;
      }

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
      setState({ user: null, loading: false, error: err.message });
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      authenticate();
    }
  }, [authenticate]);

  return state;
}
