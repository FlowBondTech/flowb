import SwiftUI
import ServiceManagement

/// Multi-step onboarding: Welcome -> Sign In -> Notifications -> Focus -> Launch at Login.
struct OnboardingView: View {
    @EnvironmentObject var authService: AuthService

    @State private var currentStep = 0
    @State private var email = ""
    @State private var password = ""
    @State private var notificationsGranted = false
    @State private var launchAtLogin = false

    private let totalSteps = 5

    var body: some View {
        VStack(spacing: 0) {
            // Step content
            Group {
                switch currentStep {
                case 0: welcomeStep
                case 1: signInStep
                case 2: notificationsStep
                case 3: focusModeStep
                case 4: launchAtLoginStep
                default: welcomeStep
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .transition(.asymmetric(
                insertion: .move(edge: .trailing).combined(with: .opacity),
                removal: .move(edge: .leading).combined(with: .opacity)
            ))
            .animation(.easeInOut(duration: 0.3), value: currentStep)

            Divider()

            // Bottom bar: step dots + navigation
            HStack {
                // Step indicator
                HStack(spacing: 6) {
                    ForEach(0..<totalSteps, id: \.self) { step in
                        Circle()
                            .fill(step == currentStep ? Color.accentColor : Color.secondary.opacity(0.3))
                            .frame(width: 7, height: 7)
                    }
                }

                Spacer()

                if currentStep > 0 {
                    Button("Back") {
                        withAnimation { currentStep -= 1 }
                    }
                    .buttonStyle(.borderless)
                }

                if currentStep < totalSteps - 1 {
                    Button(nextButtonTitle) {
                        handleNext()
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isNextDisabled)
                } else {
                    Button("Done") {
                        NSApp.keyWindow?.close()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
        .frame(width: 420, height: 520)
        .onAppear {
            // If already authenticated, skip to step 2
            if authService.isAuthenticated {
                currentStep = 2
            }
        }
    }

    // MARK: - Step 0: Welcome

    private var welcomeStep: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "bell.badge.fill")
                .font(.system(size: 56))
                .foregroundStyle(.blue)
                .symbolRenderingMode(.hierarchical)

            Text("Welcome to FlowB VIP")
                .font(.title.weight(.semibold))

            Text("Real-time notifications from FlowB, right in your menu bar. Never miss a lead, task, or update.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Spacer()
        }
        .padding()
    }

    // MARK: - Step 1: Sign In

    private var signInStep: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "person.crop.circle.fill")
                .font(.system(size: 44))
                .foregroundStyle(.blue)
                .symbolRenderingMode(.hierarchical)

            Text("Sign In")
                .font(.title2.weight(.semibold))

            Text("Use your FlowB email and password.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(spacing: 10) {
                TextField("Email", text: $email)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.emailAddress)

                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.password)
                    .onSubmit {
                        handleNext()
                    }
            }
            .frame(maxWidth: 280)

            if authService.isLoading {
                ProgressView()
                    .scaleEffect(0.8)
            }

            if let error = authService.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }

            if authService.isAuthenticated {
                Label("Signed in as \(authService.user?.displayName ?? "User")", systemImage: "checkmark.circle.fill")
                    .font(.subheadline)
                    .foregroundStyle(.green)
            }

            Spacer()
        }
        .padding()
    }

    // MARK: - Step 2: Notifications

    private var notificationsStep: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "bell.badge.fill")
                .font(.system(size: 44))
                .foregroundStyle(.orange)
                .symbolRenderingMode(.hierarchical)

            Text("Enable Notifications")
                .font(.title2.weight(.semibold))

            Text("FlowB VIP uses local notifications to alert you about important updates even when you are not looking at the menu bar.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)

            Button("Enable Notifications") {
                Task {
                    notificationsGranted = await PushManager.shared.requestPermission()
                    PushManager.shared.registerCategories()
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

            if notificationsGranted {
                Label("Notifications enabled", systemImage: "checkmark.circle.fill")
                    .font(.subheadline)
                    .foregroundStyle(.green)
            }

            Spacer()
        }
        .padding()
    }

    // MARK: - Step 3: Focus Mode

    private var focusModeStep: some View {
        VStack(spacing: 14) {
            Spacer()

            Image(systemName: "moon.fill")
                .font(.system(size: 44))
                .foregroundStyle(.indigo)

            Text("Focus Mode Setup")
                .font(.title2.weight(.semibold))

            VStack(alignment: .leading, spacing: 10) {
                Text("To receive urgent (P0) notifications during Focus modes:")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                stepInstruction(number: 1, text: "Open System Settings > Focus")
                stepInstruction(number: 2, text: "Select your Focus mode (e.g., Do Not Disturb)")
                stepInstruction(number: 3, text: "Under \"Allowed Notifications\", click Apps")
                stepInstruction(number: 4, text: "Add FlowB VIP to the allowed list")
                stepInstruction(number: 5, text: "Enable \"Time Sensitive Notifications\"")
            }
            .padding(.horizontal, 30)

            Button("Open Focus Settings") {
                if let url = URL(string: "x-apple.systempreferences:com.apple.Focus") {
                    NSWorkspace.shared.open(url)
                }
            }
            .buttonStyle(.bordered)

            Spacer()
        }
        .padding()
    }

    // MARK: - Step 4: Launch at Login

    private var launchAtLoginStep: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 56))
                .foregroundStyle(.green)
                .symbolRenderingMode(.hierarchical)

            Text("You are all set!")
                .font(.title.weight(.semibold))

            Text("FlowB VIP will monitor your FlowB notifications and alert you to important updates.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)

            Toggle("Launch FlowB VIP at login", isOn: $launchAtLogin)
                .toggleStyle(.switch)
                .onChange(of: launchAtLogin) { _, newValue in
                    setLaunchAtLogin(newValue)
                }
                .padding(.horizontal, 60)

            Spacer()
        }
        .padding()
    }

    // MARK: - Helpers

    private var nextButtonTitle: String {
        switch currentStep {
        case 1:
            return authService.isAuthenticated ? "Next" : "Sign In"
        default:
            return "Next"
        }
    }

    private var isNextDisabled: Bool {
        switch currentStep {
        case 1:
            return authService.isLoading || (email.isEmpty && !authService.isAuthenticated)
        default:
            return false
        }
    }

    private func handleNext() {
        switch currentStep {
        case 1:
            if authService.isAuthenticated {
                withAnimation { currentStep += 1 }
            } else {
                Task {
                    await authService.signIn(email: email, password: password)
                    if authService.isAuthenticated {
                        withAnimation { currentStep += 1 }
                    }
                }
            }
        default:
            withAnimation { currentStep += 1 }
        }
    }

    private func stepInstruction(number: Int, text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("\(number).")
                .font(.subheadline.weight(.semibold).monospacedDigit())
                .foregroundStyle(.blue)
                .frame(width: 20, alignment: .trailing)

            Text(text)
                .font(.subheadline)
                .foregroundStyle(.primary)
        }
    }

    private func setLaunchAtLogin(_ enabled: Bool) {
        do {
            if enabled {
                try SMAppService.mainApp.register()
            } else {
                try SMAppService.mainApp.unregister()
            }
        } catch {
            print("[Onboarding] Failed to set launch at login: \(error)")
        }
    }
}

// MARK: - Preview

#Preview {
    OnboardingView()
        .environmentObject(AuthService())
        .frame(width: 420, height: 520)
}
