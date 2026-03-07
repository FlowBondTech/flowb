import { useState, useEffect, useRef } from 'react'
import type { KanbanTask, ColumnName, Priority, LabelColor } from '@/types/kanban'
import { COLUMNS, PRIORITY_CONFIG, LABEL_COLORS, USERS } from '@/types/kanban'
import { cn } from '@/lib/utils'
import {
  X, Trash2, Calendar,
  CheckSquare, Square, Plus, ChevronDown
} from 'lucide-react'

interface TaskModalProps {
  task: KanbanTask | null
  defaultColumn?: ColumnName
  onClose: () => void
  onUpdate?: (updates: Partial<KanbanTask>) => void
  onDelete?: () => void
  onCreate?: (task: Partial<KanbanTask> & { title: string; column_name: ColumnName }) => void
  currentUser: string
}

export function TaskModal({ task, defaultColumn = 'todo', onClose, onUpdate, onDelete, onCreate, currentUser: _currentUser }: TaskModalProps) {
  const isNew = !task
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [columnName, setColumnName] = useState<ColumnName>(task?.column_name ?? defaultColumn)
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [labels, setLabels] = useState<LabelColor[]>(task?.labels ?? [])
  const [subtasks, setSubtasks] = useState(task?.subtasks ?? [])
  const [newSubtask, setNewSubtask] = useState('')
  const [showDescription, setShowDescription] = useState(!!task?.description)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleClose() {
    dialogRef.current?.close()
    onClose()
  }

  function handleSave() {
    if (isNew && onCreate) {
      if (!title.trim()) return
      onCreate({ title: title.trim(), column_name: columnName, description, priority, assigned_to: assignedTo || null, due_date: dueDate || null, labels, subtasks })
    } else if (onUpdate) {
      onUpdate({ title: title.trim(), description, column_name: columnName, priority, assigned_to: assignedTo || null, due_date: dueDate || null, labels, subtasks })
    }
  }

  function toggleLabel(color: LabelColor) {
    setLabels(prev => prev.includes(color) ? prev.filter(l => l !== color) : [...prev, color])
  }

  function addSubtask() {
    if (!newSubtask.trim()) return
    setSubtasks(prev => [...prev, { id: crypto.randomUUID(), text: newSubtask.trim(), done: false }])
    setNewSubtask('')
  }

  function toggleSubtask(id: string) {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s))
  }

  function removeSubtask(id: string) {
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  const doneCount = subtasks.filter(s => s.done).length
  const subtaskProgress = subtasks.length > 0 ? (doneCount / subtasks.length) * 100 : 0

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

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
          <div className="space-y-5">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
              className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/50"
            />

            {/* Description */}
            {showDescription ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
                className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
              />
            ) : (
              <button
                onClick={() => setShowDescription(true)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                + Add description
              </button>
            )}

            {/* Row: Status + Priority + Assignee */}
            <div className="grid grid-cols-3 gap-3">
              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
                <div className="relative">
                  <select
                    value={columnName}
                    onChange={(e) => setColumnName(e.target.value as ColumnName)}
                    className="h-9 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    {COLUMNS.map(col => (
                      <option key={col.name} value={col.name}>{col.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Priority</label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="h-9 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Assignee</label>
                <div className="relative">
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Unassigned</option>
                    {USERS.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

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
                {(Object.keys(LABEL_COLORS) as LabelColor[]).map(color => (
                  <button
                    key={color}
                    onClick={() => toggleLabel(color)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-all',
                      LABEL_COLORS[color],
                      labels.includes(color) ? 'border-foreground scale-110' : 'border-transparent opacity-50 hover:opacity-80'
                    )}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                Subtasks
                {subtasks.length > 0 && (
                  <span className="text-xs">({doneCount}/{subtasks.length})</span>
                )}
              </label>
              {subtasks.length > 0 && (
                <>
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                  <div className="mb-2 space-y-1">
                    {subtasks.map(s => (
                      <div key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                        <button onClick={() => toggleSubtask(s.id)} className="shrink-0 text-muted-foreground">
                          {s.done ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </button>
                        <span className={cn('flex-1 text-sm', s.done && 'text-muted-foreground line-through')}>
                          {s.text}
                        </span>
                        <button
                          onClick={() => removeSubtask(s.id)}
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 [.group:hover_&]:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addSubtask() }}
                  placeholder="Add subtask..."
                  className="h-8 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={addSubtask}
                  disabled={!newSubtask.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
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
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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
    </dialog>
  )
}
