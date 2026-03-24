import SwiftUI

/// The main dropdown content shown when clicking the menu bar icon.
struct MenuBarView: View {
    @EnvironmentObject var authService: AuthService
    @EnvironmentObject var poller: NotificationPoller

    @State private var isRefreshing = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            Divider()

            if !authService.isAuthenticated {
                signInPrompt
            } else if poller.notifications.isEmpty {
                emptyState
            } else {
                notificationList
            }

            Divider()

            // Footer
            footer
        }
        .frame(width: 380, maxHeight: 500)
        .background(.ultraThinMaterial)
        .onAppear {
            if authService.isAuthenticated {
                poller.setActive(true, authService: authService)
                poller.startPolling(authService: authService)
            }
        }
        .onDisappear {
            poller.setActive(false, authService: authService)
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Text("FlowB VIP")
                .font(.headline)
                .foregroundStyle(.primary)

            // Offline indicator
            if !poller.isOnline {
                Circle()
                    .fill(.orange)
                    .frame(width: 8, height: 8)
                    .help("Offline -- unable to reach server")
            }

            if poller.unreadCount > 0 {
                Text("\(poller.unreadCount)")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.red, in: Capsule())
            }

            Spacer()

            if authService.isAuthenticated {
                Button {
                    Task {
                        await poller.markAllRead(authService: authService)
                    }
                } label: {
                    Image(systemName: "checkmark.circle")
                        .help("Mark all as read")
                }
                .buttonStyle(.borderless)
                .disabled(poller.unreadCount == 0)
                .keyboardShortcut("m", modifiers: .command)

                Button {
                    Task {
                        isRefreshing = true
                        await poller.refresh(authService: authService)
                        isRefreshing = false
                    }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .rotationEffect(.degrees(isRefreshing ? 360 : 0))
                        .animation(
                            isRefreshing ? .linear(duration: 0.8).repeatForever(autoreverses: false) : .default,
                            value: isRefreshing
                        )
                        .help("Refresh")
                }
                .buttonStyle(.borderless)
                .keyboardShortcut("r", modifiers: .command)
            }

            SettingsLink {
                Image(systemName: "gearshape")
                    .help("Settings")
            }
            .buttonStyle(.borderless)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    // MARK: - Sign In Prompt

    private var signInPrompt: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)

            Text("Sign in to receive notifications")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Button("Sign In") {
                if let window = NSApp.windows.first(where: { $0.identifier?.rawValue == "onboarding" }) {
                    window.makeKeyAndOrderFront(nil)
                } else {
                    NSApp.sendAction(#selector(NSApplication.showOnboarding), to: nil, from: nil)
                    // Fallback: open via environment
                    openOnboarding()
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.regular)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "bell.slash")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)

            Text("No notifications")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if let lastPoll = poller.lastPollTime {
                Text("Last checked \(lastPoll.formatted(.relative(presentation: .named)))")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - Notification List

    private var notificationList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(poller.notifications.prefix(20)) { notification in
                    NotificationRow(
                        notification: notification,
                        onMarkRead: {
                            Task {
                                await poller.markRead(id: notification.id, authService: authService)
                            }
                        }
                    )

                    if notification.id != poller.notifications.prefix(20).last?.id {
                        Divider()
                            .padding(.leading, 44)
                    }
                }
            }
        }
        .scrollIndicators(.automatic)
    }

    // MARK: - Footer

    private var footer: some View {
        HStack {
            if let error = poller.pollError {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                    .font(.caption)
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Button("Quit FlowB VIP") {
                NSApplication.shared.terminate(nil)
            }
            .buttonStyle(.borderless)
            .font(.caption)
            .foregroundStyle(.secondary)
            .keyboardShortcut("q", modifiers: .command)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
    }

    // MARK: - Helpers

    @Environment(\.openWindow) private var openWindow

    private func openOnboarding() {
        openWindow(id: "onboarding")
    }
}

// Selector extension for opening onboarding
private extension NSApplication {
    @objc func showOnboarding() {
        // The environment-based openWindow is the primary mechanism
    }
}
