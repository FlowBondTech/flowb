import Foundation

/// HTTP client for the FlowB backend API.
actor APIClient {
    static let shared = APIClient()

    private let baseURL = "https://flowb.fly.dev"
    private let supabaseURL = "https://eoajujwpdkfuicnoxetk.supabase.co"
    private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg"

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
    }

    // MARK: - Retry with Backoff

    /// Retries an async operation with exponential backoff on network and 5xx errors.
    /// Backoff delays: 1s, 2s, 4s.
    private func retryRequest<T>(
        _ operation: () async throws -> T,
        maxRetries: Int = 3
    ) async throws -> T {
        var lastError: Error?

        for attempt in 0..<maxRetries {
            do {
                return try await operation()
            } catch let error as URLError {
                // Network errors are retryable
                lastError = error
                if attempt < maxRetries - 1 {
                    let delaySeconds = UInt64(pow(2.0, Double(attempt))) // 1, 2, 4
                    try? await Task.sleep(nanoseconds: delaySeconds * 1_000_000_000)
                }
            } catch let error as APIError {
                switch error {
                case .httpError(let code, _) where code >= 500:
                    // 5xx server errors are retryable
                    lastError = error
                    if attempt < maxRetries - 1 {
                        let delaySeconds = UInt64(pow(2.0, Double(attempt)))
                        try? await Task.sleep(nanoseconds: delaySeconds * 1_000_000_000)
                    }
                default:
                    // Non-retryable API errors (4xx, auth, etc.) — fail immediately
                    throw error
                }
            } catch {
                // Unknown errors — fail immediately
                throw error
            }
        }

        throw lastError ?? APIError.invalidResponse
    }

    // MARK: - Supabase Auth

    /// Sign in with email + password via Supabase Auth REST API.
    func supabaseSignIn(email: String, password: String) async throws -> SupabaseAuthResponse {
        try await retryRequest {
            let url = URL(string: "\(self.supabaseURL)/auth/v1/token?grant_type=password")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(self.supabaseAnonKey, forHTTPHeaderField: "apikey")

            let body: [String: String] = ["email": email, "password": password]
            request.httpBody = try JSONEncoder().encode(body)

            let (data, response) = try await self.session.data(for: request)

            guard let http = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            if http.statusCode == 400 {
                // Parse Supabase error — not retryable
                if let errBody = try? JSONDecoder().decode(SupabaseErrorResponse.self, from: data) {
                    throw APIError.authFailed(errBody.errorDescription ?? errBody.msg ?? "Invalid credentials")
                }
                throw APIError.authFailed("Invalid email or password")
            }

            guard (200...299).contains(http.statusCode) else {
                throw APIError.httpError(http.statusCode, String(data: data, encoding: .utf8))
            }

            return try self.decoder.decode(SupabaseAuthResponse.self, from: data)
        }
    }

    /// Refresh a Supabase Auth session using a refresh token.
    func supabaseRefresh(refreshToken: String) async throws -> SupabaseAuthResponse {
        try await retryRequest {
            let url = URL(string: "\(self.supabaseURL)/auth/v1/token?grant_type=refresh_token")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(self.supabaseAnonKey, forHTTPHeaderField: "apikey")

            let body: [String: String] = ["refresh_token": refreshToken]
            request.httpBody = try JSONEncoder().encode(body)

            let (data, response) = try await self.session.data(for: request)

            guard let http = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            guard (200...299).contains(http.statusCode) else {
                throw APIError.httpError(http.statusCode, String(data: data, encoding: .utf8))
            }

            return try self.decoder.decode(SupabaseAuthResponse.self, from: data)
        }
    }

    // MARK: - FlowB Auth

    /// Exchange a Supabase access token for a FlowB JWT via /api/v1/auth/passport.
    func authPassport(accessToken: String, displayName: String? = nil) async throws -> PassportResponse {
        var body: [String: String] = ["accessToken": accessToken]
        if let name = displayName {
            body["displayName"] = name
        }

        return try await retryRequest {
            try await self.post(path: "/api/v1/auth/passport", body: body, jwt: nil)
        }
    }

    // MARK: - Notifications

    /// Fetch notifications from the FlowB API.
    func getNotifications(jwt: String, unread: Bool = true, limit: Int = 50) async throws -> NotificationsResponse {
        var path = "/api/v1/me/notifications?limit=\(limit)"
        if unread {
            path += "&unread=true"
        }
        return try await retryRequest {
            try await self.get(path: path, jwt: jwt)
        }
    }

    /// Mark specific notification IDs as read.
    func markRead(jwt: String, ids: [String]) async throws {
        let body: [String: Any] = ["ids": ids]
        let _: EmptyOKResponse = try await retryRequest {
            try await self.postRaw(path: "/api/v1/me/notifications/read", body: body, jwt: jwt)
        }
    }

    /// Mark all notifications as read.
    func markAllRead(jwt: String) async throws {
        let body: [String: Bool] = ["all": true]
        let _: EmptyOKResponse = try await retryRequest {
            try await self.post(path: "/api/v1/me/notifications/read", body: body, jwt: jwt)
        }
    }

    // MARK: - Generic Request Helpers

    private func get<T: Decodable>(path: String, jwt: String?) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL(path)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let jwt = jwt {
            request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if http.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            throw APIError.httpError(http.statusCode, String(data: data, encoding: .utf8))
        }

        return try decoder.decode(T.self, from: data)
    }

    private func post<T: Decodable, B: Encodable>(path: String, body: B, jwt: String?) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL(path)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let jwt = jwt {
            request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if http.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            throw APIError.httpError(http.statusCode, String(data: data, encoding: .utf8))
        }

        return try decoder.decode(T.self, from: data)
    }

    /// POST with a raw [String: Any] body for cases where Encodable does not work.
    private func postRaw<T: Decodable>(path: String, body: [String: Any], jwt: String?) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL(path)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let jwt = jwt {
            request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if http.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            throw APIError.httpError(http.statusCode, String(data: data, encoding: .utf8))
        }

        return try decoder.decode(T.self, from: data)
    }
}

// MARK: - Error Types

enum APIError: LocalizedError {
    case invalidURL(String)
    case invalidResponse
    case httpError(Int, String?)
    case unauthorized
    case authFailed(String)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL(let path):
            return "Invalid URL: \(path)"
        case .invalidResponse:
            return "Invalid server response"
        case .httpError(let code, let body):
            return "HTTP \(code): \(body ?? "Unknown error")"
        case .unauthorized:
            return "Session expired. Please sign in again."
        case .authFailed(let message):
            return message
        case .decodingError(let error):
            return "Failed to parse response: \(error.localizedDescription)"
        }
    }
}

// MARK: - Helper Response Types

struct EmptyOKResponse: Codable {
    let ok: Bool?
}

struct SupabaseErrorResponse: Codable {
    let error: String?
    let errorDescription: String?
    let msg: String?

    enum CodingKeys: String, CodingKey {
        case error
        case errorDescription = "error_description"
        case msg
    }
}
