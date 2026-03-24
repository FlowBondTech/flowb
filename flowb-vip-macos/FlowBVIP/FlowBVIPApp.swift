import SwiftUI
import UserNotifications

@main
struct FlowBVIPApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authService = AuthService()
    @StateObject private var notificationPoller = NotificationPoller()

    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(authService)
                .environmentObject(notificationPoller)
        } label: {
            Label {
                Text("FlowB VIP")
            } icon: {
                Image(systemName: notificationPoller.unreadCount > 0 ? "bell.badge.fill" : "bell.fill")
            }
        }
        .menuBarExtraStyle(.window)

        Window("FlowB VIP Setup", id: "onboarding") {
            OnboardingView()
                .environmentObject(authService)
                .frame(width: 420, height: 520)
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)

        Settings {
            SettingsView()
                .environmentObject(authService)
                .environmentObject(notificationPoller)
        }
    }
}

// MARK: - App Delegate

final class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        UNUserNotificationCenter.current().delegate = self
    }

    // Show notification banners even when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification tap
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        if let notificationId = userInfo["notificationId"] as? String {
            NotificationCenter.default.post(
                name: .didTapNotification,
                object: nil,
                userInfo: ["notificationId": notificationId]
            )
        }
        completionHandler()
    }
}

extension Notification.Name {
    static let didTapNotification = Notification.Name("didTapNotification")
}
