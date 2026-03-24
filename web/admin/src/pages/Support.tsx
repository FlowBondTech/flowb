import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { formatRelative } from '@/lib/utils'
import { DataTable, type Column } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectOption } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  RefreshCw,
  ArrowLeft,
  Send,
  Loader2,
  Mail,
  TicketCheck,
} from 'lucide-react'

// ---------- Types ----------

interface TicketSummary {
  id: string
  subject: string
  from_email: string
  status: string
  created_at: string
}

interface TicketMessage {
  body: string
  direction: 'inbound' | 'outbound'
  from: string
  created_at: string
}

interface TicketDetail {
  subject: string
  status: string
  from_email: string
  messages: TicketMessage[]
}

type StatusFilter = 'all' | 'open' | 'pending' | 'closed'

// ---------- Helpers ----------

const STATUS_BADGE: Record<string, 'green' | 'yellow' | 'blue' | 'gray'> = {
  open: 'green',
  pending: 'yellow',
  closed: 'gray',
}

function statusBadgeVariant(status: string) {
  return STATUS_BADGE[status.toLowerCase()] ?? 'blue'
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id
}

// ---------- Component ----------

export default function Support() {
  // ----- List state -----
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // ----- Detail state -----
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  // ----- Reply state -----
  const [replyBody, setReplyBody] = useState('')
  const [replying, setReplying] = useState(false)

  // ----- Status update state -----
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // ---------- Fetch ticket list ----------

  const fetchTickets = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await apiGet<{ tickets: TicketSummary[] }>(
        `/api/v1/support/tickets?${params}`,
      )
      setTickets(res.tickets)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setListLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // ---------- Fetch ticket detail ----------

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await apiGet<{ ticket: TicketDetail }>(
        `/api/v1/support/tickets/${id}`,
      )
      setDetail(res.ticket)
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : 'Failed to load ticket',
      )
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const openTicket = useCallback(
    (row: TicketSummary) => {
      setSelectedId(row.id)
      setDetail(null)
      setReplyBody('')
      fetchDetail(row.id)
    },
    [fetchDetail],
  )

  const backToList = useCallback(() => {
    setSelectedId(null)
    setDetail(null)
    setDetailError(null)
    setReplyBody('')
    // Refresh the list in case status changed
    fetchTickets()
  }, [fetchTickets])

  // ---------- Reply ----------

  const sendReply = useCallback(async () => {
    if (!selectedId || !replyBody.trim() || replying) return
    setReplying(true)
    try {
      await apiPost(`/api/v1/support/tickets/${selectedId}/reply`, {
        reply_text: replyBody.trim(),
        user_id: 'admin',
      })
      toast.success('Reply sent')
      setReplyBody('')
      // Refresh detail to show new message
      fetchDetail(selectedId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setReplying(false)
    }
  }, [selectedId, replyBody, replying, fetchDetail])

  // ---------- Status update ----------

  const updateStatus = useCallback(
    async (newStatus: string) => {
      if (!selectedId || updatingStatus) return
      setUpdatingStatus(true)
      try {
        await apiPatch(`/api/v1/support/tickets/${selectedId}/status`, {
          status: newStatus,
        })
        toast.success(`Status updated to ${newStatus}`)
        // Update local detail
        setDetail((prev) => (prev ? { ...prev, status: newStatus } : prev))
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to update status',
        )
      } finally {
        setUpdatingStatus(false)
      }
    },
    [selectedId, updatingStatus],
  )

  // ---------- Table columns ----------

  const columns: Column<TicketSummary>[] = [
    {
      key: 'id',
      label: 'ID',
      className: 'w-24',
      render: (row) => (
        <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
          {shortId(row.id)}
        </span>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-sm">{row.subject}</span>
      ),
    },
    {
      key: 'from_email',
      label: 'From',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {row.from_email}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      className: 'w-28',
      render: (row) => (
        <Badge variant={statusBadgeVariant(row.status)} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      className: 'w-32',
      render: (row) => (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {formatRelative(row.created_at)}
        </span>
      ),
    },
  ]

  // =============================================
  // Detail View
  // =============================================

  if (selectedId) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={backToList}>
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>

        {detailError && (
          <div className="glass rounded-xl p-4 border-red-500/20 text-red-400 text-sm">
            {detailError}
          </div>
        )}

        {detailLoading && !detail && (
          <div className="glass rounded-xl p-12 flex items-center justify-center">
            <Loader2
              size={24}
              className="animate-spin text-[var(--color-muted-foreground)]"
            />
          </div>
        )}

        {detail && (
          <>
            {/* Ticket header card */}
            <div className="glass rounded-xl border border-[var(--color-glass-border)] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {detail.subject}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-[var(--color-muted-foreground)]">
                    <Mail size={14} />
                    <span>{detail.from_email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge
                    variant={statusBadgeVariant(detail.status)}
                    className="capitalize"
                  >
                    {detail.status}
                  </Badge>
                  <Select
                    value={detail.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    disabled={updatingStatus}
                    className="w-32 h-8 text-xs bg-white/5 border-white/10"
                  >
                    <SelectOption value="open">Open</SelectOption>
                    <SelectOption value="pending">Pending</SelectOption>
                    <SelectOption value="closed">Closed</SelectOption>
                  </Select>
                </div>
              </div>
            </div>

            {/* Message thread */}
            <div className="glass rounded-xl border border-[var(--color-glass-border)] flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[calc(100vh-420px)]">
                {detail.messages.length === 0 && (
                  <div className="text-center text-sm text-[var(--color-muted-foreground)] py-8">
                    No messages yet.
                  </div>
                )}
                {detail.messages.map((msg, i) => {
                  const isInbound = msg.direction === 'inbound'
                  return (
                    <div
                      key={i}
                      className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 text-sm leading-relaxed ${
                          isInbound
                            ? 'glass border border-[var(--color-glass-border)] rounded-2xl rounded-bl-md'
                            : 'bg-[var(--color-primary)]/80 text-white rounded-2xl rounded-br-md'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.body}</div>
                        <div
                          className={`text-[0.65rem] mt-1.5 ${
                            isInbound
                              ? 'text-[var(--color-muted-foreground)]/60'
                              : 'text-white/60'
                          }`}
                        >
                          {msg.from} -- {formatRelative(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Reply form */}
              <div className="border-t border-[var(--color-border)] p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    disabled={replying}
                    className="flex-1 bg-white/5 border-white/10 min-h-[60px] max-h-[120px] resize-y"
                    rows={2}
                  />
                  <Button
                    size="icon"
                    onClick={sendReply}
                    disabled={replying || !replyBody.trim()}
                    className="shrink-0 self-end"
                  >
                    {replying ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // =============================================
  // List View
  // =============================================

  return (
    <div className="space-y-6">
      {/* Error state */}
      {listError && (
        <div className="glass rounded-xl p-4 border-red-500/20 text-red-400 text-sm">
          {listError}
        </div>
      )}

      {/* Table */}
      <DataTable<TicketSummary>
        columns={columns}
        data={tickets}
        loading={listLoading}
        onRowClick={openTicket}
        rowKey={(r) => r.id}
        emptyText="No support tickets found"
        serverPagination
        toolbar={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <TicketCheck
              size={16}
              className="text-[var(--color-muted-foreground)] hidden sm:block"
            />
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
              className="w-32 h-8 text-xs bg-white/5 border-white/10"
            >
              <SelectOption value="all">All Statuses</SelectOption>
              <SelectOption value="open">Open</SelectOption>
              <SelectOption value="pending">Pending</SelectOption>
              <SelectOption value="closed">Closed</SelectOption>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTickets}
              disabled={listLoading}
              className="shrink-0"
            >
              <RefreshCw
                size={14}
                className={listLoading ? 'animate-spin' : ''}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />
    </div>
  )
}
