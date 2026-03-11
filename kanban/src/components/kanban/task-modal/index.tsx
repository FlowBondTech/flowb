import { useState, useEffect, useRef } from 'react'
import type { KanbanTask, ColumnName, Priority, LabelColor, Crew, Attachment } from '@/types/kanban'
import { COLUMNS, PRIORITY_CONFIG, LABEL_COLORS, USERS } from '@/types/kanban'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAutoSave } from '@/hooks/use-auto-save'
import { useTaskActivity } from '@/hooks/use-task-activity'
import { DescriptionEditor } from './description-editor'
import { ActivityTimeline } from './activity-timeline'
import { TimeTracking } from './time-tracking'
import { Dependencies } from './dependencies'
import { Checklist } from './checklist'
import { Attachments } from './attachments'
import { Toaster } from 'sonner'
import {
  X, Trash2, Calendar, ChevronDown, AlertTriangle,
} from 'lucide-react'

interface TaskModalProps {
  task: KanbanTask | null
  defaultColumn?: ColumnName
  crews?: Crew[]
  currentCrewId?: string | null
  allTasks?: KanbanTask[]
  onClose: () => void
  onUpdate?: (updates: Partial<KanbanTask>) => void
  onDelete?: () => void
  onCreate?: (task: Partial<KanbanTask> & { title: string; column_name: ColumnName }) => void
  currentUser: string
}

export function TaskModal({
  task,
  defaultColumn = 'todo',
  crews = [],
  currentCrewId,
  allTasks = [],
  onClose,
  onUpdate,
  onDelete,
  onCreate,
  currentUser,
}: TaskModalProps) {
  const isNew = !task
  const dialogRef = useRef<HTMLDialogElement>(null)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [columnName, setColumnName] = useState<ColumnName>(task?.column_name ?? defaultColumn)
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [labels, setLabels] = useState<LabelColor[]>(task?.labels ?? [])
  const [subtasks, setSubtasks] = useState(task?.subtasks ?? [])
  const [blockedBy, setBlockedBy] = useState<string[]>(task?.blocked_by ?? [])
  const [estimatedHours, setEstimatedHours] = useState<number | null>(task?.estimated_hours ?? null)
  const [actualHours, setActualHours] = useState<number | null>(task?.actual_hours ?? null)
  const [crewId, setCrewId] = useState(task?.crew_id ?? currentCrewId ?? '')
  const [leadId, setLeadId] = useState(task?.lead_id ?? '')
  const [attachments, setAttachments] = useState<Attachment[]>(
    (task?.metadata?.attachments as Attachment[]) ?? [],
  )

  // ── Draft persistence ───────────────────────────────────────────────────────
  const { savedValue: draftDescription, hasDraft, save: saveDraft, clearDraft } = useAutoSave(
    task?.id ?? null,
    'description',
    task?.description ?? '',
  )
  const [draftRestored, setDraftRestored] = useState(false)

  function restoreDraft() {
    if (draftDescription) {
      setDescription(draftDescription)
      setDraftRestored(true)
    }
  }

  function discardDraft() {
    clearDraft()
    setDraftRestored(false)
  }

  // Auto-save description changes
  useEffect(() => {
    if (!isNew && task?.id) {
      saveDraft(description)
    }
  }, [description, isNew, task?.id, saveDraft])

  // ── Activity/comments ───────────────────────────────────────────────────────
  const { activities, loading: activityLoading, addComment: activityAddComment } = useTaskActivity(
    task?.id ?? null,
  )

  // ── Lead options ────────────────────────────────────────────────────────────
  const [leadOptions, setLeadOptions] = useState<{ id: string; name: string; company: string | null }[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLeadsLoading(true)
    supabase
      .from('flowb_leads')
      .select('id, name, company')
      .order('name')
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('Failed to fetch leads:', error.message)
        else setLeadOptions((data ?? []) as { id: string; name: string; company: string | null }[])
        setLeadsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleClose() {
    dialogRef.current?.close()
    onClose()
  }

  function handleSave() {
    if (isNew && onCreate) {
      if (!title.trim()) return
      onCreate({
        title: title.trim(),
        column_name: columnName,
        description,
        priority,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        labels,
        subtasks,
        blocked_by: blockedBy,
        estimated_hours: estimatedHours,
        actual_hours: actualHours,
        crew_id: crewId || undefined,
        lead_id: leadId || undefined,
        metadata: attachments.length > 0 ? { attachments } : {},
      })
    } else if (onUpdate) {
      onUpdate({
        title: title.trim(),
        description,
        column_name: columnName,
        priority,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        labels,
        subtasks,
        blocked_by: blockedBy,
        estimated_hours: estimatedHours,
        actual_hours: actualHours,
        crew_id: crewId || undefined,
        lead_id: leadId || undefined,
        metadata: { ...(task?.metadata ?? {}), attachments },
      })
      clearDraft()
    }
  }

  function toggleLabel(color: LabelColor) {
    setLabels((prev) => prev.includes(color) ? prev.filter((l) => l !== color) : [...prev, color])
  }

  const linkedLead = leadId ? leadOptions.find((l) => l.id === leadId) : null

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(e) => { if (e.target === dialogRef.current) handleClose() }}
      className="fixed inset-0 z-50 m-0 h-dvh w-dvw max-h-dvh max-w-full bg-transparent p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm md:flex md:items-center md:justify-center"
    >
      <div className="flex h-full w-full flex-col bg-card md:mx-auto md:h-auto md:max-h-[85vh] md:w-full md:max-w-2xl md:rounded-xl md:shadow-[var(--shadow-dialog)]">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <h2 className="text-lg font-semibold">
            {isNew ? 'New Task' : 'Edit Task'}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && onDelete && (
              <button
                onClick={onDelete}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Delete task"
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

        {/* ── Draft recovery banner ──────────────────────────────────────── */}
        {hasDraft && !draftRestored && !isNew && (
          <div className="flex items-center gap-2 border-b bg-yellow-50 px-4 py-2 dark:bg-yellow-900/10">
            <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <span className="flex-1 text-xs text-yellow-700 dark:text-yellow-400">
              Unsaved draft found
            </span>
            <button
              onClick={restoreDraft}
              className="rounded px-2 py-0.5 text-xs font-medium text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
            >
              Restore
            </button>
            <button
              onClick={discardDraft}
              className="rounded px-2 py-0.5 text-xs text-yellow-600 hover:bg-yellow-100 dark:text-yellow-500 dark:hover:bg-yellow-900/30"
            >
              Discard
            </button>
          </div>
        )}

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
            className="mb-4 w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/50"
          />

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <Tabs defaultValue="details">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              {!isNew && <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>}
              {!isNew && <TabsTrigger value="tracking" className="flex-1">Tracking</TabsTrigger>}
            </TabsList>

            {/* ═══════════════════ DETAILS TAB ═══════════════════════════ */}
            <TabsContent value="details">
              <div className="space-y-5">
                {/* Description */}
                <DescriptionEditor
                  value={description}
                  onChange={setDescription}
                  hasUnsavedDraft={hasDraft && !draftRestored}
                />

                {/* Status + Priority + Assignee */}
                <div className="grid grid-cols-3 gap-3">
                  <SelectField label="Status" value={columnName} onChange={(v) => setColumnName(v as ColumnName)} options={COLUMNS.map((c) => ({ value: c.name, label: c.label }))} />
                  <SelectField label="Priority" value={priority} onChange={(v) => setPriority(v as Priority)} options={Object.entries(PRIORITY_CONFIG).map(([k, c]) => ({ value: k, label: c.label }))} />
                  <SelectField label="Assignee" value={assignedTo} onChange={setAssignedTo} options={[{ value: '', label: 'Unassigned' }, ...USERS.map((u) => ({ value: u.id, label: u.name }))]} />
                </div>

                {/* Crew */}
                {crews.length > 0 && (
                  <SelectField
                    label="Crew"
                    value={crewId}
                    onChange={setCrewId}
                    options={[{ value: '', label: 'No Crew' }, ...crews.map((c) => ({ value: c.id, label: `${c.emoji} ${c.name}` }))]}
                  />
                )}

                {/* Due Date */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Labels</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(LABEL_COLORS) as LabelColor[]).map((color) => (
                      <button
                        key={color}
                        onClick={() => toggleLabel(color)}
                        className={cn(
                          'h-7 w-7 rounded-full border-2 transition-all',
                          LABEL_COLORS[color],
                          labels.includes(color) ? 'border-foreground scale-110' : 'border-transparent opacity-50 hover:opacity-80',
                        )}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Dependencies */}
                <Dependencies
                  blockedBy={blockedBy}
                  allTasks={allTasks}
                  currentTaskId={task?.id}
                  onChange={setBlockedBy}
                />

                {/* Checklist */}
                <Checklist subtasks={subtasks} onChange={setSubtasks} />

                {/* Attachments */}
                <Attachments attachments={attachments} onChange={setAttachments} />

                {/* Linked Lead */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Linked Lead</label>
                  {leadsLoading ? (
                    <p className="text-xs text-muted-foreground">Loading leads...</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          value={leadId}
                          onChange={(e) => setLeadId(e.target.value)}
                          className="h-9 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                        >
                          <option value="">No linked lead</option>
                          {leadOptions.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}{l.company ? ` (${l.company})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      {leadId && (
                        <button
                          onClick={() => setLeadId('')}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted"
                          title="Clear linked lead"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                  {linkedLead && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Linked to: {linkedLead.name}{linkedLead.company ? ` at ${linkedLead.company}` : ''}
                    </p>
                  )}
                </div>

                {/* Metadata (read-only, edit mode only) */}
                {!isNew && task && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Created by {task.created_by}</span>
                      <span>{new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                    {task.source !== 'human' && (
                      <div className="mt-1">Source: {task.source}</div>
                    )}
                    {task.todo_id && (
                      <div className="mt-1">Synced to Todo: {task.todo_id.slice(0, 8)}...</div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══════════════════ ACTIVITY TAB ══════════════════════════ */}
            {!isNew && (
              <TabsContent value="activity" className="min-h-[300px]">
                <ActivityTimeline
                  activities={activities}
                  loading={activityLoading}
                  currentUser={currentUser}
                  onAddComment={(text) => activityAddComment(currentUser, text)}
                />
              </TabsContent>
            )}

            {/* ═══════════════════ TRACKING TAB ═════════════════════════ */}
            {!isNew && (
              <TabsContent value="tracking">
                <TimeTracking
                  estimatedHours={estimatedHours}
                  actualHours={actualHours}
                  onEstimatedChange={setEstimatedHours}
                  onActualChange={setActualHours}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 border-t px-4 py-3 md:px-6">
          <button
            onClick={handleClose}
            className="h-9 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
      {/* Toaster inside dialog so toasts render above the native backdrop */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'bg-card text-card-foreground border-border',
          duration: 3000,
        }}
      />
    </dialog>
  )
}

// ─── Reusable select field ──────────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}
