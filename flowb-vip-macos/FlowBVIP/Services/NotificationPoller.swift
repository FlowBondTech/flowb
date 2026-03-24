import Foundation
import SwiftUI
import Combine
import AppKit

/// Polls the FlowB API for new notifications and triggers local alerts.
@MainActor
final class NotificationPoller: ObservableObject {
    @Published var notifications: [FlowBNotification] = []
    @Published var unreadCount: Int = 0
    @Published var isPolling = false
    @Published var lastPollTime: Date?
    @Published var pollError: String?
    @Published var isOnline = true

    /// Interval when the user recently interacted (menu open, etc.)
    var activeInterval: TimeInterval = 30

    /// Interval when the app is idle.
    var idleInterval: TimeInterval = 300

    private var pollingTimer: Timer?
    private var isActive = false
    private var knownIds: Set<String> = []
    private var hasCompletedFirstPoll = false

    /// Tracks IDs we have already fired local notifications for (deduplication).
    /// Capped at 500 entries using FIFO eviction.
    private var seenNotificationIds: Set<String> = []
    private var seenNotificationOrder: [String] = []
    private static let maxSeenIds = 500

    /// True when the screen is asleep — polling is fully paused.
    private var isSleeping = false

    /// Auth service reference kept for system observer callbacks.
    private weak var currentAuthService: AuthService?

    init() {
        setupSystemObservers()
    }

    // MARK: - System Sleep / Wake Observers

    private func setupSystemObservers() {
        let ws = NSWorkspace.shared.notificationCenter

        ws.addObserver(
            forName: NSWorkspace.screensDidSleepNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleScreenSleep()
            }
        }

        ws.addObserver(
            forName: NSWorkspace.screensDidWakeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleScreenWake()
            }
        }

        ws.addObserver(
            forName: NSWorkspace.sessionDidResignActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleSessionResignActive()
            }
        }

        ws.addObserver(
            forName: NSWorkspace.sessionDidBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleSessionBecomeActive()
            }
        }
    }

    private func handleScreenSleep() {
        isSleeping = true
        pollingTimer?.invalidate()
        pollingTimer = nil
    }

    private func handleScreenWake() {
        isSleeping = false
        guard isPolling, let authService = currentAuthService else { return }

        // Resume polling and immediately refresh
        scheduleTimer(authService: authService)
        Task {
            await poll(authService: authService)
        }
    }

    private func handleSessionResignActive() {
        guard !isSleeping, isPolling, let authService = currentAuthService else { return }
        // Switch to idle interval
        isActive = false
        scheduleTimer(authService: authService)
    }

    private func handleSessionBecomeActive() {
        guard !isSleeping, isPolling, let authService = currentAuthService else { return }
        // Switch to active interval
        isActive = true
        scheduleTimer(authService: authService)
        Task {
            await poll(authService: authService)
        }
    }

    // MARK: - Polling Control

    func startPolling(authService: AuthService) {
        guard !isPolling else { return }
        isPolling = true
        currentAuthService = authService

        // Do an immediate fetch
        Task {
            await poll(authService: authService)
        }

        scheduleTimer(authService: authService)
    }

    func stopPolling() {
        isPolling = false
        pollingTimer?.invalidate()
        pollingTimer = nil
    }

    /// Call this when the user opens the menu or interacts with the app.
    func setActive(_ active: Bool, authService: AuthService) {
        let wasActive = isActive
        isActive = active
        currentAuthService = authService

        // If becoming active from idle, reschedule with shorter interval
        if active && !wasActive && isPolling {
            scheduleTimer(authService: authService)
            // Refresh immediately when opening
            Task {
                await poll(authService: authService)
            }
        } else if !active && wasActive && isPolling {
            scheduleTimer(authService: authService)
        }
    }

    /// Manual refresh triggered by the user.
    func refresh(authService: AuthService) async {
        await poll(authService: authService)
    }

    // MARK: - Mark Read

    func markRead(id: String, authService: AuthService) async {
        guard let jwt = await authService.validJWT() else { return }

        // Optimistic update
        if let idx = notifications.firstIndex(where: { $0.id == id }) {
            // We cannot mutate the struct's readAt directly since it is a let.
            // Instead, remove and re-fetch will handle it.
            // For now, just call the API and refresh.
        }

        do {
            try await APIClient.shared.markRead(jwt: jwt, ids: [id])
            // Update local state
            await poll(authService: authService)
        } catch {
            pollError = "Failed to mark as read"
        }
    }

    func markAllRead(authService: AuthService) async {
        guard let jwt = await authService.validJWT() else { return }

        do {
            try await APIClient.shared.markAllRead(jwt: jwt)
            // Clear all unread
            unreadCount = 0
            await poll(authService: authService)
        } catch {
            pollError = "Failed to mark all as read"
        }
    }

    // MARK: - Deduplication

    /// Record an ID as seen. Evicts oldest entries when the cap is exceeded.
    private func markAsSeen(_ id: String) {
        guard !seenNotificationIds.contains(id) else { return }

        seenNotificationIds.insert(id)
        seenNotificationOrder.append(id)

        // FIFO eviction when exceeding cap
        while seenNotificationOrder.count > Self.maxSeenIds {
            let oldest = seenNotificationOrder.removeFirst()
            seenNotificationIds.remove(oldest)
        }
    }

    // MARK: - Private

    private func scheduleTimer(authService: AuthService) {
        pollingTimer?.invalidate()

        let interval = isActive ? activeInterval : idleInterval

        pollingTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                await self.poll(authService: authService)
            }
        }
    }

    private func poll(authService: AuthService) async {
        // Pause polling completely during sleep
        guard !isSleeping else { return }

        guard authService.isAuthenticated else { return }

        guard let jwt = await authService.validJWT() else {
            pollError = "Session expired"
            return
        }

        do {
            let response = try await APIClient.shared.getNotifications(jwt: jwt, unread: false, limit: 50)

            let oldIds = knownIds
            let newNotifications = response.notifications

            // Update state
            notifications = newNotifications
            unreadCount = response.unreadCount
            lastPollTime = Date()
            pollError = nil
            isOnline = true

            // Cap retained notifications at 100 to save memory
            if notifications.count > 100 {
                notifications = Array(notifications.prefix(100))
            }

            // Update known IDs
            knownIds = Set(newNotifications.map(\.id))

            // Fire local notifications for truly new unread items (skip on first poll)
            if hasCompletedFirstPoll {
                let brandNew = newNotifications.filter { n in
                    n.isUnread && !oldIds.contains(n.id)
                }

                for notification in brandNew {
                    // Deduplication: skip if we already fired a notification for this ID
                    guard !seenNotificationIds.contains(notification.id) else { continue }
                    markAsSeen(notification.id)

                    await PushManager.shared.fireNotification(notification: notification)
                }
            } else {
                // Seed the seen set with all current IDs on first poll
                for notification in newNotifications {
                    markAsSeen(notification.id)
                }
            }

            hasCompletedFirstPoll = true

        } catch let error as APIError {
            if case .unauthorized = error {
                await authService.refreshTokenIfNeeded()
            }
            pollError = error.errorDescription

            // Detect network errors for connectivity status
            isOnline = !isNetworkError(error)
        } catch let error as URLError {
            pollError = error.localizedDescription
            isOnline = false
        } catch {
            pollError = error.localizedDescription

            // Check if underlying error is a network issue
            if let urlError = error as? URLError {
                isOnline = false
            }
        }
    }

    /// Returns true if the API error is likely caused by a network issue.
    private func isNetworkError(_ error: APIError) -> Bool {
        switch error {
        case .invalidResponse:
            return true
        case .httpError(let code, _):
            // 5xx errors may indicate server-side issues but not necessarily client offline
            return code >= 500
        default:
            return false
        }
    }
}
