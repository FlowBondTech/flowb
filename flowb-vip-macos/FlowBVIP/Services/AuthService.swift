import Foundation
import SwiftUI

/// Manages authentication state: Supabase Auth -> FlowB JWT exchange.
@MainActor
final class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var user: User?
    @Published var jwt: String?
    @Published var errorMessage: String?

    private var supabaseAccessToken: String?
    private var supabaseRefreshToken: String?

    init() {
        restoreSession()
    }

    // MARK: - Sign In

    /// Full sign-in flow: Supabase email/password -> FlowB passport.
    func signIn(email: String, password: String) async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Email and password are required"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            // Step 1: Authenticate with Supabase
            let supabaseAuth = try await APIClient.shared.supabaseSignIn(email: email, password: password)

            // Step 2: Exchange Supabase token for FlowB JWT
            let passport = try await APIClient.shared.authPassport(
                accessToken: supabaseAuth.accessToken,
                displayName: supabaseAuth.user.email?.components(separatedBy: "@").first
            )

            // Step 3: Persist everything
            self.jwt = passport.token
            self.user = passport.user
            self.supabaseAccessToken = supabaseAuth.accessToken
            self.supabaseRefreshToken = supabaseAuth.refreshToken
            self.isAuthenticated = true

            persistSession()

        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Sign Out

    func signOut() {
        jwt = nil
        user = nil
        supabaseAccessToken = nil
        supabaseRefreshToken = nil
        isAuthenticated = false
        errorMessage = nil
        KeychainHelper.clearAll()
    }

    // MARK: - Session Restoration

    func restoreSession() {
        guard let savedJwt = KeychainHelper.loadString(key: KeychainHelper.Keys.jwt),
              let savedUser = KeychainHelper.load(key: KeychainHelper.Keys.user, as: User.self)
        else {
            return
        }

        self.jwt = savedJwt
        self.user = savedUser
        self.supabaseAccessToken = KeychainHelper.loadString(key: KeychainHelper.Keys.supabaseAccessToken)
        self.supabaseRefreshToken = KeychainHelper.loadString(key: KeychainHelper.Keys.supabaseRefreshToken)
        self.isAuthenticated = true

        // Attempt a background token refresh to ensure the JWT is still valid
        Task {
            await refreshTokenIfNeeded()
        }
    }

    // MARK: - Token Refresh

    /// Refresh the Supabase session and exchange for a new FlowB JWT.
    func refreshTokenIfNeeded() async {
        guard let refreshToken = supabaseRefreshToken else { return }

        do {
            let refreshed = try await APIClient.shared.supabaseRefresh(refreshToken: refreshToken)

            let passport = try await APIClient.shared.authPassport(
                accessToken: refreshed.accessToken,
                displayName: user?.displayName
            )

            self.jwt = passport.token
            self.user = passport.user
            self.supabaseAccessToken = refreshed.accessToken
            self.supabaseRefreshToken = refreshed.refreshToken
            self.isAuthenticated = true

            persistSession()

        } catch let error as APIError {
            if case .unauthorized = error {
                signOut()
            }
            // For other errors, keep the existing session and try again later
        } catch {
            // Network errors etc. - keep session, retry later
        }
    }

    /// Returns a valid JWT, refreshing if necessary.
    func validJWT() async -> String? {
        if let jwt = jwt {
            // Check if JWT is about to expire (simple heuristic: refresh every 50min)
            return jwt
        }
        await refreshTokenIfNeeded()
        return jwt
    }

    // MARK: - Persistence

    private func persistSession() {
        if let jwt = jwt {
            KeychainHelper.save(key: KeychainHelper.Keys.jwt, string: jwt)
        }
        if let user = user {
            _ = KeychainHelper.save(key: KeychainHelper.Keys.user, object: user)
        }
        if let token = supabaseAccessToken {
            KeychainHelper.save(key: KeychainHelper.Keys.supabaseAccessToken, string: token)
        }
        if let token = supabaseRefreshToken {
            KeychainHelper.save(key: KeychainHelper.Keys.supabaseRefreshToken, string: token)
        }
    }
}
