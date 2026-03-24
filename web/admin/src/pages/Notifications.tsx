import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Bell,
  Send,
  Loader2,
  Users,
  User,
  Radio,
  Shield,
  Search,
  AlertTriangle,
} from 'lucide-react'

// ---------- Types ----------

interface NotificationStats {
  farcasterTokens: { active: number; disabled: number }
  pushTokens: { active: number }
}

type TargetType = 'user' | 'crew' | 'role' | 'broadcast'

interface RecipientResult {
  id: string
  displayName?: string
  tgUsername?: string
  name?: string
  emoji?: string
  memberCount?: number
}

// ---------- Component ----------

export default function Notifications() {
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [targetType, setTargetType] = useState<TargetType>('user')
  const [targetId, setTargetId] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmBroadcast, setConfirmBroadcast] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RecipientResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<{ stats: NotificationStats }>('/api/v1/admin/notifications/stats')
      setStats(res.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset selection when target type changes
  useEffect(() => {
    setTargetId('')
    setSelectedLabel('')
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    setConfirmBroadcast(false)
  }, [targetType])

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const searchType = targetType === 'user' ? 'user' : 'crew'
        const res = await apiGet<{ results: RecipientResult[] }>(
          `/api/v1/admin/notifications/recipients?q=${encodeURIComponent(searchQuery)}&type=${searchType}`,
        )
        setSearchResults(res.results || [])
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchQuery, targetType])

  function selectRecipient(r: RecipientResult) {
    setTargetId(r.id)
    if (targetType === 'user') {
      setSelectedLabel(r.displayName || r.tgUsername || r.id)
      setSearchQuery(r.displayName || r.tgUsername || r.id)
    } else {
      setSelectedLabel(`${r.emoji || ''} ${r.name}`.trim())
      setSearchQuery(`${r.emoji || ''} ${r.name}`.trim())
    }
    setShowDropdown(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) {
      toast.error('Message cannot be empty')
      return
    }

    if (targetType === 'broadcast' && !confirmBroadcast) {
      setConfirmBroadcast(true)
      return
    }

    if ((targetType === 'user' || targetType === 'crew') && !targetId) {
      toast.error(`Please select a ${targetType} first`)
      return
    }

    setSending(true)
    try {
      const payload: { message: string; title?: string; targetType: string; targetId?: string } = {
        message: trimmed,
        targetType,
      }
      if (title.trim()) payload.title = title.trim()
      if (targetType === 'role') payload.targetId = targetId || 'admin'
      else if (targetId) payload.targetId = targetId

      const res = await apiPost<{ ok: boolean; sent: number; failed: number; total: number }>(
        '/api/v1/admin/notifications/send',
        payload,
      )

      toast.success(`Sent to ${res.sent}/${res.total} recipients${res.failed ? ` (${res.failed} failed)` : ''}`)
      setMessage('')
      setTitle('')
      setTargetId('')
      setSelectedLabel('')
      setSearchQuery('')
      setConfirmBroadcast(false)
      fetchStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const targetTypes: { value: TargetType; label: string; icon: React.ReactNode }[] = [
    { value: 'user', label: 'User', icon: <User size={14} /> },
    { value: 'crew', label: 'Crew', icon: <Users size={14} /> },
    { value: 'role', label: 'Role', icon: <Shield size={14} /> },
    { value: 'broadcast', label: 'Broadcast', icon: <Radio size={14} /> },
  ]

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {error ? (
        <div className="glass rounded-xl p-5 text-center text-red-400 text-sm">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={fetchStats}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-xl h-28 animate-pulse" />
            ))
          ) : stats ? (
            <>
              <StatCard
                title="FC Tokens (Active)"
                value={stats.farcasterTokens?.active ?? 0}
                icon={<Bell size={18} />}
                color="text-purple-400"
              />
              <StatCard
                title="FC Tokens (Disabled)"
                value={stats.farcasterTokens?.disabled ?? 0}
                icon={<Bell size={18} />}
                color="text-red-400"
              />
              <StatCard
                title="Push Tokens (Active)"
                value={stats.pushTokens?.active ?? 0}
                icon={<Send size={18} />}
                color="text-green-400"
              />
            </>
          ) : (
            <div className="col-span-full glass rounded-xl p-5 text-center text-[var(--color-muted-foreground)] text-sm">
              No notification stats available
            </div>
          )}
        </div>
      )}

      {/* Send notification form */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Send size={18} className="text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Send Notification
          </h2>
        </div>

        <form onSubmit={handleSend} className="space-y-4 max-w-xl">
          {/* Target type selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-2">
              Target
            </label>
            <div className="flex gap-1 p-1 rounded-lg bg-black/20">
              {targetTypes.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTargetType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-1 justify-center ${
                    targetType === t.value
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/5'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* User / Crew search */}
          {(targetType === 'user' || targetType === 'crew') && (
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5">
                {targetType === 'user' ? 'Search User' : 'Search Crew'}
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <Input
                  placeholder={targetType === 'user' ? 'Search by name, username, or ID...' : 'Search by crew name...'}
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value)
                    if (targetId) {
                      setTargetId('')
                      setSelectedLabel('')
                    }
                  }}
                  disabled={sending}
                  className="pl-9"
                />
                {searching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-muted-foreground)]" />
                )}
              </div>

              {/* Dropdown results */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 rounded-lg border border-white/10 bg-[var(--color-card)] shadow-xl max-h-48 overflow-y-auto">
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectRecipient(r)}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      {targetType === 'user' ? (
                        <div>
                          <span className="text-sm font-medium text-[var(--color-foreground)]">
                            {r.displayName || r.id}
                          </span>
                          {r.tgUsername && (
                            <span className="text-xs text-[var(--color-muted-foreground)] ml-2">
                              @{r.tgUsername}
                            </span>
                          )}
                          <div className="text-xs text-[var(--color-muted-foreground)] opacity-60">
                            {r.id}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[var(--color-foreground)]">
                            {r.emoji} {r.name}
                          </span>
                          <span className="text-xs text-[var(--color-muted-foreground)]">
                            {r.memberCount} member{r.memberCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <div className="absolute z-50 w-full mt-1 rounded-lg border border-white/10 bg-[var(--color-card)] shadow-xl p-3 text-center text-xs text-[var(--color-muted-foreground)]">
                  No {targetType === 'user' ? 'users' : 'crews'} found
                </div>
              )}

              {/* Selected indicator */}
              {targetId && (
                <p className="text-xs text-green-400 mt-1">
                  Selected: {selectedLabel} ({targetId})
                </p>
              )}
            </div>
          )}

          {/* Role selector */}
          {targetType === 'role' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5">
                Role
              </label>
              <select
                value={targetId || 'admin'}
                onChange={e => setTargetId(e.target.value)}
                disabled={sending}
                className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="admin">All Admins (crew admins)</option>
                <option value="creator">All Creators (crew owners)</option>
              </select>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                Sends to all users with this role across all crews
              </p>
            </div>
          )}

          {/* Broadcast warning */}
          {targetType === 'broadcast' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Broadcast Mode</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                    This will send to all users (up to 500). Use sparingly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="notif-title"
              className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5"
            >
              Title <span className="opacity-50">(optional)</span>
            </label>
            <Input
              id="notif-title"
              placeholder="Notification title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={sending}
            />
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="notif-message"
              className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5"
            >
              Message
            </label>
            <Textarea
              id="notif-message"
              placeholder="Enter notification message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              disabled={sending}
              className="resize-none"
            />
          </div>

          {/* Send button */}
          {targetType === 'broadcast' && confirmBroadcast ? (
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={sending || !message.trim()}
                variant="destructive"
              >
                {sending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Radio size={14} />
                    Confirm Broadcast
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmBroadcast(false)}
                disabled={sending}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={
                sending ||
                !message.trim() ||
                ((targetType === 'user' || targetType === 'crew') && !targetId)
              }
            >
              {sending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={14} />
                  {targetType === 'broadcast'
                    ? 'Send Broadcast'
                    : targetType === 'role'
                      ? `Send to ${targetId === 'creator' ? 'Creators' : 'Admins'}`
                      : targetType === 'crew' && selectedLabel
                        ? `Send to ${selectedLabel}`
                        : targetType === 'user' && selectedLabel
                          ? `Send to ${selectedLabel}`
                          : `Send to ${targetType}`}
                </>
              )}
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}
