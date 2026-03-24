import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { API_URL } from "../utils/constants";

const PING_INTERVAL = 30_000; // 30 seconds
const PING_TIMEOUT = 3_000; // 3 seconds

export interface ConnectivityHook {
  isOnline: boolean;
  lastChecked: Date | null;
}

/**
 * Periodically pings API_URL/health to determine connectivity.
 * Only pings while the app is in the active foreground state.
 */
export function useConnectivity(): ConnectivityHook {
  const [isOnline, setIsOnline] = useState(true); // assume online initially
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const checkConnectivity = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);
    try {
      const res = await fetch(`${API_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    } finally {
      clearTimeout(timeout);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkConnectivity();

    // Start interval
    intervalRef.current = setInterval(checkConnectivity, PING_INTERVAL);

    // Listen for app state changes to pause/resume and trigger on foreground
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const wasBackground =
          appStateRef.current === "background" ||
          appStateRef.current === "inactive";

        if (wasBackground && nextState === "active") {
          // App came to foreground - check immediately
          checkConnectivity();
        }

        appStateRef.current = nextState;
      }
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, [checkConnectivity]);

  return { isOnline, lastChecked };
}
