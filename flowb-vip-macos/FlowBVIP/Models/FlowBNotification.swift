import SwiftUI

struct FlowBNotification: Codable, Identifiable, Equatable {
    let id: String
    let notificationType: String
    let referenceId: String?
    let triggeredBy: String?
    let sentAt: String
    let title: String?
    let body: String?
    let priority: String?
    let readAt: String?
    let data: [String: AnyCodable]?

    enum CodingKeys: String, CodingKey {
        case id
        case notificationType = "notification_type"
        case referenceId = "reference_id"
        case triggeredBy = "triggered_by"
        case sentAt = "sent_at"
        case title, body, priority
        case readAt = "read_at"
        case data
    }

    var isUnread: Bool { readAt == nil }

    var priorityLevel: PriorityLevel {
        PriorityLevel(rawValue: priority ?? "p1") ?? .p1
    }

    var sentDate: Date? {
        ISO8601DateFormatter.flexibleParser.date(from: sentAt)
    }

    var timeAgo: String {
        guard let date = sentDate else { return "" }
        let interval = Date().timeIntervalSince(date)

        if interval < 60 {
            return "just now"
        } else if interval < 3600 {
            let mins = Int(interval / 60)
            return "\(mins)m ago"
        } else if interval < 86400 {
            let hours = Int(interval / 3600)
            return "\(hours)h ago"
        } else {
            let days = Int(interval / 86400)
            return "\(days)d ago"
        }
    }

    var typeIcon: String {
        switch notificationType {
        case "lead_new", "lead_assigned":
            return "person.badge.plus"
        case "lead_status_change":
            return "arrow.triangle.2.circlepath"
        case "task_due", "task_overdue":
            return "checklist"
        case "task_assigned":
            return "person.badge.clock"
        case "meeting_reminder":
            return "calendar.badge.clock"
        case "deal_won":
            return "trophy.fill"
        case "deal_lost":
            return "xmark.circle.fill"
        case "comment_mention":
            return "at"
        case "system":
            return "gearshape.fill"
        case "crew_invite":
            return "person.3.fill"
        case "payment_received":
            return "dollarsign.circle.fill"
        default:
            return "bell.fill"
        }
    }

    static func == (lhs: FlowBNotification, rhs: FlowBNotification) -> Bool {
        lhs.id == rhs.id && lhs.readAt == rhs.readAt
    }
}

// MARK: - Priority Level

enum PriorityLevel: String, CaseIterable {
    case p0
    case p1
    case p2

    var color: Color {
        switch self {
        case .p0: return .red
        case .p1: return .orange
        case .p2: return .secondary
        }
    }

    var label: String {
        switch self {
        case .p0: return "Urgent"
        case .p1: return "Normal"
        case .p2: return "Low"
        }
    }

    var systemImage: String {
        switch self {
        case .p0: return "exclamationmark.triangle.fill"
        case .p1: return "bell.fill"
        case .p2: return "bell"
        }
    }
}

// MARK: - Notifications Response

struct NotificationsResponse: Codable {
    let notifications: [FlowBNotification]
    let unreadCount: Int

    enum CodingKeys: String, CodingKey {
        case notifications
        case unreadCount = "unread_count"
    }
}

// MARK: - ISO8601 Flexible Parser

extension ISO8601DateFormatter {
    static let flexibleParser: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}
