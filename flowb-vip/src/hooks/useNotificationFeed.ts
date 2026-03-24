import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import * as api from "../api/client";
import type { Notification } from "../api/types";
import { useAuthStore } from "../stores/useAuthStore";
import { POLL_INTERVAL } from "../utils/constants";
import { enqueueMarkRead, replayQueue } from "../utils/offline-queue";

export interface NotificationFeedHook {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (ids?: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotificationFeed(): NotificationFeedHook {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const { token } = useAuthStore();

  // ── Update app badge count ────────────────────────────────────────────

  const updateBadge = useCallback(async (count: number) => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch {
      // Badge API may not be available on all platforms
    }
  }, []);

  // ── Fetch (always loads first page for fresh data) ────────────────────

  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
      if (!token) return;

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        }

        const data = await api.getNotifications({ limit: 50 });
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread || 0);
        setError(null);

        // Update app badge with current unread count
        updateBadge(data.unread || 0);
      } catch (err: any) {
        setError(err.message || "Failed to load notifications");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, updateBadge]
  );

  // ── Cursor-based pagination ───────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!token || notifications.length === 0) return;

    try {
      // Use the sent_at of the last notification as cursor
      const lastNotification = notifications[notifications.length - 1];
      const before = lastNotification?.sent_at;

      const data = await api.getNotifications({
        limit: 50,
        before,
      });

      if (data.notifications?.length) {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }
    } catch {
      // Silently fail on pagination
    }
  }, [token, notifications]);

  const refresh = useCallback(async () => {
    await fetchNotifications(true);
  }, [fetchNotifications]);

  // ── Mark read with offline queue fallback ─────────────────────────────

  const markRead = useCallback(
    async (ids?: string[]) => {
      if (!token || !ids?.length) return;

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          ids.includes(n.id)
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      const newUnread = Math.max(0, unreadCount - ids.length);
      setUnreadCount(newUnread);
      updateBadge(newUnread);

      try {
        await api.markNotificationsRead({ ids });
      } catch {
        // API call failed - queue for later replay
        await enqueueMarkRead(ids);
      }
    },
    [token, unreadCount, updateBadge]
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;

    // Optimistically update local state
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      }))
    );
    setUnreadCount(0);
    updateBadge(0);

    try {
      await api.markNotificationsRead({ all: true });
    } catch {
      // Best-effort - data will reconcile on next fetch
    }
  }, [token, updateBadge]);

  // ── Initial fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Polling ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;

    pollRef.current = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [token, fetchNotifications]);

  // ── Replay offline queue on app foreground ────────────────────────────

  useEffect(() => {
    const replayFn = async (ids: string[]) => {
      await api.markNotificationsRead({ ids });
    };

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const wasBackground =
          appStateRef.current === "background" ||
          appStateRef.current === "inactive";

        if (wasBackground && nextState === "active") {
          // Replay queued offline actions
          replayQueue(replayFn).catch(() => {});
          // Also refresh feed to pick up any new notifications
          fetchNotifications();
        }

        appStateRef.current = nextState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    error,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  };
}
