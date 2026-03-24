import SwiftUI
import ServiceManagement

/// macOS Settings pane with tabs for account, polling, notification preferences.
struct SettingsView: View {
    @EnvironmentObject var authService: AuthService
    @EnvironmentObject var poller: NotificationPoller

    var body: some View {
        TabView {
            AccountTab()
                .environmentObject(authService)
                .tabItem {
                    Label("Account", systemImage: "person.crop.circle")
                }

            PollingTab()
                .environmentObject(poller)
                .tabItem {
                    Label("Polling", systemImage: "clock.arrow.circlepath")
                }

            NotificationsTab()
                .tabItem {
                    Label("Notifications", systemImage: "bell")
                }

            AboutTab()
                .tabItem {
                    Label("About", systemImage: "info.circle")
                }
        }
        .frame(width: 450, height: 320)
    }
}

// MARK: - Account Tab

struct AccountTab: View {
    @EnvironmentObject var authService: AuthService

    var body: some View {
        Form {
            if authService.isAuthenticated, let user = authService.user {
                Section {
                    LabeledContent("Display Name", value: user.displayName)
                    if let email = user.email {
                        LabeledContent("Email", value: email)
                    }
                    LabeledContent("User ID", value: user.id)
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        authService.signOut()
                    }
                }
            } else {
                Section {
                    Text("Not signed in")
                        .foregroundStyle(.secondary)

                    Text("Open FlowB VIP from the menu bar and sign in, or re-run the onboarding setup.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - Polling Tab

struct PollingTab: View {
    @EnvironmentObject var poller: NotificationPoller

    @AppStorage("pollingActiveInterval") private var activeInterval: Double = 30
    @AppStorage("pollingIdleInterval") private var idleInterval: Double = 300

    var body: some View {
        Form {
            Section("Active Polling") {
                HStack {
                    Slider(value: $activeInterval, in: 15...120, step: 5)
                    Text("\(Int(activeInterval))s")
                        .monospacedDigit()
                        .frame(width: 40, alignment: .trailing)
                }
                Text("How often to check when you have recently interacted with FlowB VIP.")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }

            Section("Idle Polling") {
                HStack {
                    Slider(value: $idleInterval, in: 60...600, step: 30)
                    Text("\(Int(idleInterval / 60))m")
                        .monospacedDigit()
                        .frame(width: 40, alignment: .trailing)
                }
                Text("How often to check when the menu bar is closed.")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }

            if let lastPoll = poller.lastPollTime {
                Section {
                    LabeledContent("Last Poll", value: lastPoll.formatted(.dateTime.hour().minute().second()))
                }
            }
        }
        .formStyle(.grouped)
        .padding()
        .onChange(of: activeInterval) { _, newValue in
            poller.activeInterval = newValue
        }
        .onChange(of: idleInterval) { _, newValue in
            poller.idleInterval = newValue
        }
        .onAppear {
            poller.activeInterval = activeInterval
            poller.idleInterval = idleInterval
        }
    }
}

// MARK: - Notifications Tab

struct NotificationsTab: View {
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("soundEnabled") private var soundEnabled = true
    @AppStorage("launchAtLogin") private var launchAtLogin = false

    // Category toggles
    @AppStorage("notify_lead_new") private var leadNew = true
    @AppStorage("notify_lead_status") private var leadStatus = true
    @AppStorage("notify_task_due") private var taskDue = true
    @AppStorage("notify_task_assigned") private var taskAssigned = true
    @AppStorage("notify_meeting") private var meeting = true
    @AppStorage("notify_deal") private var deal = true
    @AppStorage("notify_comment") private var comment = true
    @AppStorage("notify_system") private var system = true

    var body: some View {
        Form {
            Section {
                Toggle("Enable Notifications", isOn: $notificationsEnabled)
                Toggle("Notification Sound", isOn: $soundEnabled)
                Toggle("Launch at Login", isOn: $launchAtLogin)
                    .onChange(of: launchAtLogin) { _, newValue in
                        do {
                            if newValue {
                                try SMAppService.mainApp.register()
                            } else {
                                try SMAppService.mainApp.unregister()
                            }
                        } catch {
                            print("[Settings] Launch at login error: \(error)")
                        }
                    }
            }

            Section("Notification Categories") {
                Toggle("New Leads", isOn: $leadNew)
                Toggle("Lead Status Changes", isOn: $leadStatus)
                Toggle("Task Due / Overdue", isOn: $taskDue)
                Toggle("Task Assigned", isOn: $taskAssigned)
                Toggle("Meeting Reminders", isOn: $meeting)
                Toggle("Deal Won / Lost", isOn: $deal)
                Toggle("Comment Mentions", isOn: $comment)
                Toggle("System", isOn: $system)
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - About Tab

struct AboutTab: View {
    var body: some View {
        VStack(spacing: 12) {
            Spacer()

            Image(systemName: "bell.badge.fill")
                .font(.system(size: 48))
                .foregroundStyle(.blue)
                .symbolRenderingMode(.hierarchical)

            Text("FlowB VIP")
                .font(.title2.weight(.semibold))

            Text("Version 1.0.0")
                .font(.caption)
                .foregroundStyle(.secondary)

            Text("Real-time FlowB notifications\nfor your Mac menu bar.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Link("flowb.me", destination: URL(string: "https://flowb.me")!)
                .font(.subheadline)

            Spacer()

            Text("Built by koH")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding()
    }
}

// MARK: - Preview

#Preview {
    SettingsView()
        .environmentObject(AuthService())
        .environmentObject(NotificationPoller())
}
