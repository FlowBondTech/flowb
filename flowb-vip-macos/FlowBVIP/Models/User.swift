import Foundation

struct User: Codable {
    let id: String
    let supabaseUid: String?
    let platform: String?
    let email: String?
    let username: String?

    enum CodingKeys: String, CodingKey {
        case id
        case supabaseUid = "supabase_uid"
        case platform
        case email
        case username
    }

    var displayName: String {
        username ?? email?.components(separatedBy: "@").first ?? id
    }
}

// MARK: - Passport Response

struct PassportResponse: Codable {
    let token: String
    let user: User
}

// MARK: - Supabase Auth Types

struct SupabaseAuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let user: SupabaseUser

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
    }
}

struct SupabaseUser: Codable {
    let id: String
    let email: String?
}

struct SupabaseSessionWrapper: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresAt = "expires_at"
    }
}
