import { useState, useEffect, useCallback } from "react";
import { authWhatsApp, getToken } from "../api/client";
import type { UserProfile } from "../api/types";

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

/**
 * WhatsApp auth hook.
 *
 * Reads phone, ts, sig from URL search params (set by the bot's CTA URL button).
 * Sends them to POST /api/v1/auth/whatsapp for HMAC verification and JWT issuance.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const authenticate = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const phone = params.get("phone");
      const ts = params.get("ts");
      const sig = params.get("sig");

      if (!phone || !ts || !sig) {
        setState({ user: null, loading: false, error: "Missing auth params" });
        return;
      }

      const result = await authWhatsApp(phone, ts, sig);
      setState({ user: result.user, loading: false, error: null });

      // Clean URL after auth (remove params)
      const url = new URL(window.location.href);
      url.searchParams.delete("phone");
      url.searchParams.delete("ts");
      url.searchParams.delete("sig");
      window.history.replaceState({}, "", url.pathname + url.search);
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
