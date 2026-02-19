import { useState, useRef, useEffect, useCallback } from "react";
import { sendChat } from "../api/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "What's happening now?", msg: "What events are happening right now?" },
  { label: "Find events", msg: "Show me upcoming events today" },
  { label: "My schedule", msg: "What's on my schedule?" },
  { label: "Nearby venues", msg: "What venues have events nearby?" },
];

const SYSTEM_MESSAGE = {
  role: "system",
  content: `You are FlowB, a friendly AI assistant for ETHDenver 2026 side events. You help users discover events, hackathons, parties, meetups, and summits happening during ETHDenver week (Feb 15-27, 2026) in Denver.

You have access to a tool called "flowb" that can search events, browse categories, check tonight's events, find free events, and more. Use it when users ask about events.

CRITICAL RULES:
1. ALWAYS reply in a SINGLE message. If the user asks multiple questions, address ALL of them in ONE cohesive response with clear sections.
2. Be conversational, helpful, and concise. Use emojis sparingly.
3. Format event listings clearly with titles, dates, venues, and prices.
4. The user's platform is "farcaster" (miniapp).`,
};

interface Props {
  authed: boolean;
  username?: string;
}

export function FlowBChat({ authed, username }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    setInput("");
    const userMsg: ChatMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const chatMessages = [
        SYSTEM_MESSAGE,
        ...messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: msg },
      ];

      const response = await sendChat(chatMessages, username || undefined);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again!" }]);
    }

    setSending(false);
  }, [input, sending, messages, username]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Markdown rendering: bold, italic, inline code, links, lists, line breaks
  const renderContent = (content: string) => {
    let html = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent-light)">$1</a>');
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--accent-light)">$1</a>');
    html = html.replace(/^([-*])\s+(.+)$/gm, '<li>$2</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/^### (.+)$/gm, '<strong style="font-size:14px">$1</strong>');
    html = html.replace(/^## (.+)$/gm, '<strong style="font-size:15px">$1</strong>');
    html = html.replace(/\n/g, "<br>");
    html = html.replace(/<br><ul>/g, '<ul>');
    html = html.replace(/<\/ul><br>/g, '</ul>');
    html = html.replace(/<br><li>/g, '<li>');
    html = html.replace(/<\/li><br>/g, '</li>');
    return html;
  };

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>FlowB</h1>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Your EthDenver AI assistant
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{"\u26A1"}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Hey{username ? ` @${username}` : ""}!</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Ask me about events, venues, or anything EthDenver. I can help you find what's happening and plan your day.
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"}`}
            dangerouslySetInnerHTML={
              msg.role === "assistant" ? { __html: renderContent(msg.content) } : undefined
            }
          >
            {msg.role === "user" ? msg.content : undefined}
          </div>
        ))}

        {sending && (
          <div className="chat-typing">
            <div className="chat-typing-dot" />
            <div className="chat-typing-dot" />
            <div className="chat-typing-dot" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="chat-quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              className="chat-quick-chip"
              onClick={() => handleSend(action.msg)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="input"
          type="text"
          placeholder="Ask FlowB anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="btn btn-primary"
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
          style={{ padding: "10px 16px" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
