import SwiftUI

/// A single notification row displayed in the menu bar dropdown.
struct NotificationRow: View {
    let notification: FlowBNotification
    var onMarkRead: (() -> Void)?

    @State private var isHovering = false

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            // Type icon
            ZStack {
                Circle()
                    .fill(notification.priorityLevel.color.opacity(0.15))
                    .frame(width: 32, height: 32)

                Image(systemName: notification.typeIcon)
                    .font(.system(size: 14))
                    .foregroundStyle(notification.priorityLevel.color)
            }

            // Content
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(notification.title ?? formatType(notification.notificationType))
                        .font(.subheadline.weight(notification.isUnread ? .semibold : .regular))
                        .foregroundStyle(notification.isUnread ? .primary : .secondary)
                        .lineLimit(1)

                    Spacer()

                    // Priority indicator
                    if notification.priorityLevel == .p0 {
                        Text("URGENT")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(.red, in: Capsule())
                    }
                }

                if let body = notification.body, !body.isEmpty {
                    Text(body)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }

                HStack(spacing: 6) {
                    Text(notification.timeAgo)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)

                    if notification.isUnread {
                        Circle()
                            .fill(.blue)
                            .frame(width: 6, height: 6)
                    }

                    Spacer()

                    // Mark read button (shows on hover)
                    if notification.isUnread && isHovering {
                        Button {
                            onMarkRead?()
                        } label: {
                            Text("Mark read")
                                .font(.caption2)
                                .foregroundStyle(.blue)
                        }
                        .buttonStyle(.borderless)
                        .transition(.opacity)
                    }
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(isHovering ? Color.primary.opacity(0.05) : Color.clear)
        )
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.15)) {
                isHovering = hovering
            }
        }
        .onTapGesture {
            if notification.isUnread {
                onMarkRead?()
            }
        }
    }

    // MARK: - Helpers

    private func formatType(_ type: String) -> String {
        type
            .replacingOccurrences(of: "_", with: " ")
            .split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 0) {
        NotificationRow(
            notification: FlowBNotification(
                id: "1",
                notificationType: "lead_new",
                referenceId: nil,
                triggeredBy: nil,
                sentAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-120)),
                title: "New lead from website",
                body: "John Smith submitted a contact form requesting a demo of the premium plan.",
                priority: "p0",
                readAt: nil,
                data: nil
            )
        )

        Divider().padding(.leading, 44)

        NotificationRow(
            notification: FlowBNotification(
                id: "2",
                notificationType: "task_due",
                referenceId: nil,
                triggeredBy: nil,
                sentAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600)),
                title: "Follow up with Sarah",
                body: "Task is due today at 3:00 PM",
                priority: "p1",
                readAt: nil,
                data: nil
            )
        )

        Divider().padding(.leading, 44)

        NotificationRow(
            notification: FlowBNotification(
                id: "3",
                notificationType: "system",
                referenceId: nil,
                triggeredBy: nil,
                sentAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-86400)),
                title: "Weekly report ready",
                body: nil,
                priority: "p2",
                readAt: ISO8601DateFormatter().string(from: Date()),
                data: nil
            )
        )
    }
    .frame(width: 380)
    .background(.ultraThinMaterial)
}
