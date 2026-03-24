import Foundation
import Security

/// Lightweight Keychain wrapper for storing tokens and credentials.
enum KeychainHelper {
    private static let serviceName = "me.flowb.alert.macos"

    // MARK: - Save

    @discardableResult
    static func save(key: String, data: Data) -> Bool {
        // Delete any existing item first
        delete(key: key)

        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: serviceName,
            kSecAttrAccount: key,
            kSecValueData: data,
            kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlock,
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    @discardableResult
    static func save(key: String, string: String) -> Bool {
        guard let data = string.data(using: .utf8) else { return false }
        return save(key: key, data: data)
    }

    // MARK: - Load

    static func load(key: String) -> Data? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: serviceName,
            kSecAttrAccount: key,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    static func loadString(key: String) -> String? {
        guard let data = load(key: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // MARK: - Delete

    @discardableResult
    static func delete(key: String) -> Bool {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: serviceName,
            kSecAttrAccount: key,
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    // MARK: - Convenience: Codable

    static func save<T: Encodable>(key: String, object: T) -> Bool {
        guard let data = try? JSONEncoder().encode(object) else { return false }
        return save(key: key, data: data)
    }

    static func load<T: Decodable>(key: String, as type: T.Type) -> T? {
        guard let data = load(key: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    // MARK: - Clear All

    static func clearAll() {
        let keys = [Keys.jwt, Keys.supabaseAccessToken, Keys.supabaseRefreshToken, Keys.user]
        for key in keys {
            delete(key: key)
        }
    }

    // MARK: - Key Constants

    enum Keys {
        static let jwt = "flowb_jwt"
        static let supabaseAccessToken = "supabase_access_token"
        static let supabaseRefreshToken = "supabase_refresh_token"
        static let user = "flowb_user"
    }
}
