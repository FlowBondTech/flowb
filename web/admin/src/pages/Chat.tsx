import { useState, useRef, useEffect, useCallback } from 'react'
import { chatComplete } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Send, Bot, User, Loader2 } from 'lucide-react'

// ---------- Types ----------

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ---------- Markdown rendering ----------

function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Fenced code blocks: ```...```
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="chat-code-block"><code>${code.trim()}</code></pre>`
  })

  // Inline code: `...`
  html = html.replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')

  // Bold: **...**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Line breaks
  html = html.replace(/\n/g, '<br />')

  return html
}

// ---------- Component ----------

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: Message = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const reply = await chatComplete(updatedMessages)
      const assistantMessage: Message = { role: 'assistant', content: reply }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get response')
      // Remove the user message on failure so they can retry
      setMessages((prev) => prev.slice(0, -1))
      setInput(text)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage],
  )

  return (
    <div className="space-y-4">
      {/* Chat container */}
      <div
        className="glass rounded-xl border border-[var(--color-glass-border)] flex flex-col"
        style={{ height: 'calc(100vh - 180px)' }}
      >
        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3"
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
              <Bot size={40} className="text-[var(--color-primary)]" />
              <div className="text-sm text-[var(--color-muted-foreground)]">
                Start a conversation with the FlowB AI assistant.
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[70%] ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    msg.role === 'user'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-white/10 text-[var(--color-muted-foreground)]'
                  }`}
                >
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Bubble */}
                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--color-primary)] text-white rounded-2xl rounded-br-md'
                      : 'glass border border-[var(--color-glass-border)] rounded-2xl rounded-bl-md text-[var(--color-foreground)]'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      className="chat-markdown"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(msg.content),
                      }}
                    />
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[70%]">
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-white/10 text-[var(--color-muted-foreground)]">
                  <Bot size={14} />
                </div>
                <div className="glass border border-[var(--color-glass-border)] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted-foreground)] animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted-foreground)] animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted-foreground)] animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input row */}
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1 bg-white/5 border-white/10"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Inline styles for markdown rendering */}
      <style>{`
        .chat-markdown strong {
          font-weight: 600;
        }
        .chat-inline-code {
          background: rgba(255, 255, 255, 0.08);
          padding: 0.15em 0.4em;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
        }
        .chat-code-block {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px 14px;
          margin: 8px 0;
          overflow-x: auto;
          font-size: 0.82em;
          line-height: 1.5;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
        }
        .chat-code-block code {
          background: none;
          padding: 0;
          font-size: inherit;
        }
      `}</style>
    </div>
  )
}
