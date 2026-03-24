import Foundation
import UserNotifications
import AppKit

/// Manages local UNNotifications (permission, firing, badge clearing).
final class PushManager: NSObject {
    static let shared = PushManager()

    private override init() {
        super.init()
    }

    // MARK: - Permission

    /// Request notification permission (alerts, sounds, badges, time sensitive).
    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .sound, .badge, .criticalAlert]
            )
            return granted
        } catch {
            print("[PushManager] Permission request failed: \(error)")
            return false
        }
    }

    /// Check current authorization status.
    func checkPermission() async -> UNAuthorizationStatus {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        return settings.authorizationStatus
    }

    // MARK: - Fire Notification

    /// Create and deliver a local notification based on a FlowBNotification.
    func fireNotification(notification: FlowBNotification) async {
        let content = UNMutableNotificationContent()

        // Title
        content.title = notification.title ?? formatTypeTitle(notification.notificationType)

        // Body
        if let body = notification.body {
            content.body = body
        }

        // Sound based on priority
        switch notification.priorityLevel {
        case .p0:
            content.sound = .defaultCritical
        case .p1:
            content.sound = .default
        case .p2:
            content.sound = nil
        }

        // Interruption level based on priority
        switch notification.priorityLevel {
        case .p0:
            content.interruptionLevel = .timeSensitive
        case .p1:
            content.interruptionLevel = .active
        case .p2:
            content.interruptionLevel = .passive
        }

        // Category for notification actions
        content.categoryIdentifier = "FLOWB_NOTIFICATION"

        // Attach metadata for tap handling
        content.userInfo = [
            "notificationId": notification.id,
            "notificationType": notification.notificationType,
            "priority": notification.priority ?? "p1",
        ]

        // Thread identifier groups related notifications
        content.threadIdentifier = notification.notificationType

        // Trigger immediately
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "flowb-\(notification.id)",
            content: content,
            trigger: trigger
        )

        do {
            try await UNUserNotificationCenter.current().add(request)

            // P0 urgent: dock badge + bounce dock icon for maximum visibility
            if notification.priorityLevel == .p0 {
                await MainActor.run {
                    NSApp.dockTile.badgeLabel = "!"
                    NSApp.requestAttention(.criticalRequest)
                }
            }
        } catch {
            print("[PushManager] Failed to deliver notification: \(error)")
        }
    }

    // MARK: - Badge / Clear

    func clearBadge() {
        UNUserNotificationCenter.current().setBadgeCount(0) { error in
            if let error = error {
                print("[PushManager] Failed to clear badge: \(error)")
            }
        }
        // Also clear the dock tile badge
        DispatchQueue.main.async {
            NSApp.dockTile.badgeLabel = nil
        }
    }

    func clearDelivered() {
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }

    // MARK: - Notification Actions

    func registerCategories() {
        let markReadAction = UNNotificationAction(
            identifier: "MARK_READ",
            title: "Mark as Read",
            options: []
        )

        let openAction = UNNotificationAction(
            identifier: "OPEN",
            title: "Open in FlowB",
            options: [.foreground]
        )

        let category = UNNotificationCategory(
            identifier: "FLOWB_NOTIFICATION",
            actions: [markReadAction, openAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    // MARK: - Helpers

    private func formatTypeTitle(_ type: String) -> String {
        type
            .replacingOccurrences(of: "_", with: " ")
            .split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }
}
