import { useState } from "react";
import { submitFeedback } from "../api/client";

interface Props {
  onClose: () => void;
  screen?: string;
}

const TYPES = [
  { id: "bug" as const, label: "Bug", icon: "\u{1F41B}" },
  { id: "feature" as const, label: "Feature", icon: "\u{1F4A1}" },
  { id: "feedback" as const, label: "Feedback", icon: "\u{1F4AC}" },
];

export function FeedbackModal({ onClose, screen }: Props) {
  const [type, setType] = useState<"bug" | "feature" | "feedback">("feedback");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await submitFeedback({ type, message: message.trim(), contact: contact.trim() || undefined, screen });
      setDone(true);
      const tg = (window as any).Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred("success");
    } catch {
      const tg = (window as any).Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{"\u{2705}"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Thanks for the feedback!</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
              Your {type === "bug" ? "bug report" : type === "feature" ? "feature request" : "feedback"} has been sent to the team. We read every one.
            </div>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Share Feedback</div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, fontSize: 18, lineHeight: 1 }}
          >
            {"\u2715"}
          </button>
        </div>

        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
          Don't see a feature or notice a bug? Let us know so we can build the flow.
        </div>

        {/* Type selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setType(t.id);
                const tg = (window as any).Telegram?.WebApp;
                tg?.HapticFeedback?.selectionChanged();
              }}
              style={{
                flex: 1,
                padding: "8px 6px",
                borderRadius: "var(--radius, 10px)",
                border: type === t.id ? "1.5px solid var(--accent, #6366f1)" : "1.5px solid var(--border, #2a2a3e)",
                background: type === t.id ? "rgba(99, 102, 241, 0.12)" : "var(--card, #1e1e2e)",
                color: type === t.id ? "var(--accent, #6366f1)" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            type === "bug"
              ? "What happened? What did you expect?"
              : type === "feature"
              ? "What feature would make FlowB better?"
              : "Tell us what's on your mind..."
          }
          rows={4}
          maxLength={2000}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "var(--radius, 10px)",
            border: "1.5px solid var(--border, #2a2a3e)",
            background: "var(--card, #1e1e2e)",
            color: "var(--text, #e4e4ec)",
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
            marginBottom: 10,
            outline: "none",
            boxSizing: "border-box",
          }}
          autoFocus
        />

        {/* Optional contact */}
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Your TG/FC handle (optional, for follow-up)"
          maxLength={200}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: "var(--radius, 10px)",
            border: "1.5px solid var(--border, #2a2a3e)",
            background: "var(--card, #1e1e2e)",
            color: "var(--text, #e4e4ec)",
            fontSize: 13,
            fontFamily: "inherit",
            marginBottom: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <button
          className="btn btn-primary btn-block"
          onClick={handleSubmit}
          disabled={!message.trim() || submitting}
          style={{ opacity: !message.trim() || submitting ? 0.5 : 1 }}
        >
          {submitting ? "Sending..." : "Send Feedback"}
        </button>
      </div>
    </div>
  );
}
