import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Trash2, ChevronDown, Calendar, Link2, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { LEAD_STAGES } from '@/lib/constants'
import type { Lead, LeadStage } from '@/types/kanban'

interface LeadActivity {
  id: string
  lead_id: string
  user_id: string
  activity_type: string
  description: string
  metadata?: Record<string, unknown>
  created_at: string
}

interface MeetingResult {
  meeting_id: string
  title: string
  share_code: string
  share_link: string
  auto_shared: boolean
}

interface LeadModalProps {
  lead: Lead | null
  defaultStage?: LeadStage
  onClose: () => void
  onUpdate?: (id: string, updates: Partial<Lead>) => void
  onDelete?: (id: string) => void
  onCreate?: (data: { name: string; stage: LeadStage; email?: string; phone?: string; company?: string; source?: string; value?: number; notes?: string; tags?: string[] }) => void
  onFetchTimeline?: (id: string) => Promise<LeadActivity[]>
  onScheduleMeeting?: (id: string) => Promise<MeetingResult | null>
}

type Tab = 'details' | 'timeline' | 'meeting'

export function LeadModal({
  lead,
  defaultStage = 'new',
  onClose,
  onUpdate,
  onDelete,
  onCreate,
  onFetchTimeline,
  onScheduleMeeting,
}: LeadModalProps) {
  const isNew = !lead
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Form state
  const [name, setName] = useState(lead?.name ?? '')
  const [email, setEmail] = useState(lead?.email ?? '')
  const [phone, setPhone] = useState(lead?.phone ?? '')
  const [company, setCompany] = useState(lead?.company ?? '')
  const [stage, setStage] = useState<LeadStage>(lead?.stage ?? defaultStage)
  const [source, setSource] = useState(lead?.source ?? '')
  const [value, setValue] = useState(lead?.value?.toString() ?? '')
  const [notes, setNotes] = useState(lead?.notes ?? '')
  const [tagsInput, setTagsInput] = useState(lead?.tags?.join(', ') ?? '')

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [timeline, setTimeline] = useState<LeadActivity[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [meetingResult, setMeetingResult] = useState<MeetingResult | null>(null)
  const [meetingLoading, setMeetingLoading] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Fetch timeline when tab switches
  useEffect(() => {
    if (activeTab === 'timeline' && lead && onFetchTimeline) {
      setTimelineLoading(true)
      onFetchTimeline(lead.id).then((activities) => {
        setTimeline(activities)
        setTimelineLoading(false)
      })
    }
  }, [activeTab, lead, onFetchTimeline])

  function handleClose() {
    dialogRef.current?.close()
    onClose()
  }

  function handleSave() {
    if (isNew && onCreate) {
      if (!name.trim()) return
      onCreate({
        name: name.trim(),
        stage,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        source: source || undefined,
        value: value ? Number(value) : undefined,
        notes: notes || undefined,
        tags: tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      })
    } else if (lead && onUpdate) {
      onUpdate(lead.id, {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        company: company || null,
        stage,
        source: source || null,
        value: value ? Number(value) : null,
        notes: notes || null,
        tags: tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })
    }
  }

  const handleScheduleMeeting = useCallback(async () => {
    if (!lead || !onScheduleMeeting) return
    setMeetingLoading(true)
    const result = await onScheduleMeeting(lead.id)
    setMeetingResult(result)
    setMeetingLoading(false)
  }, [lead, onScheduleMeeting])

  const tabs: { id: Tab; label: string }[] = isNew
    ? [{ id: 'details', label: 'Details' }]
    : [
        { id: 'details', label: 'Details' },
        { id: 'timeline', label: 'Timeline' },
        { id: 'meeting', label: 'Meeting' },
      ]

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(e) => { if (e.target === dialogRef.current) handleClose() }}
      className="fixed inset-0 z-50 m-0 h-dvh w-dvw max-h-dvh max-w-full bg-transparent p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm md:flex md:items-center md:justify-center"
    >
      <div className="flex h-full w-full flex-col bg-card md:mx-auto md:h-auto md:max-h-[85vh] md:w-full md:max-w-2xl md:rounded-xl md:shadow-[var(--shadow-dialog)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <h2 className="text-lg font-semibold">
            {isNew ? 'New Lead' : lead.name}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && onDelete && (
              <button
                onClick={() => { onDelete(lead.id); handleClose() }}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Delete lead"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="flex items-center gap-1 border-b px-4 md:px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
          {/* Details tab */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Name */}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lead name"
                autoFocus
                className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/50"
              />

              {/* Stage + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Stage</label>
                  <div className="relative">
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value as LeadStage)}
                      className="h-9 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                    >
                      {LEAD_STAGES.map((s) => (
                        <option key={s.name} value={s.name}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Value ($)</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Contact fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Company + Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company name"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Source</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. website, referral"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="vip, ethdenver, warm"
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Read-only metadata */}
              {!isNew && lead && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Created by {lead.created_by}</span>
                    <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                  {lead.platform && (
                    <div className="mt-1">Platform: {lead.platform}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === 'timeline' && (
            <div>
              {timelineLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                </div>
              ) : timeline.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeline.map((activity) => (
                    <div key={activity.id} className="flex gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        {activity.activity_type.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{activity.description}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {activity.user_id} &middot; {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="gray" className="h-5 shrink-0 text-[9px]">
                        {activity.activity_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Meeting tab */}
          {activeTab === 'meeting' && (
            <div className="space-y-4">
              {!meetingResult ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Calendar className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Schedule a meeting with this lead
                  </p>
                  <button
                    onClick={handleScheduleMeeting}
                    disabled={meetingLoading}
                    className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {meetingLoading ? 'Scheduling...' : 'Schedule Meeting'}
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold">{meetingResult.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={meetingResult.share_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {meetingResult.share_link}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={meetingResult.auto_shared ? 'green' : 'yellow'} className="text-[10px]">
                      {meetingResult.auto_shared ? 'Auto-shared with lead' : 'Not auto-shared (no contact info)'}
                    </Badge>
                  </div>

                  <button
                    onClick={() => navigator.clipboard.writeText(meetingResult.share_link)}
                    className="h-8 rounded-lg border border-input px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Copy share link
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-4 py-3 md:px-6">
          <button
            onClick={handleClose}
            className="h-9 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          {activeTab === 'details' && (
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isNew ? 'Create' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
