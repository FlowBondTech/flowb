import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ColumnName, Priority } from '@/types/kanban'
import { PRIORITY_CONFIG, USERS } from '@/types/kanban'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface QuickAddFormProps {
  columnName: ColumnName
  onCreateTask: (data: {
    title: string
    column_name: ColumnName
    priority: Priority
    assigned_to: string | null
  }) => void
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function QuickAddForm({ columnName, onCreateTask }: QuickAddFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [assignee, setAssignee] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const resetForm = useCallback(() => {
    setTitle('')
    setPriority('medium')
    setAssignee(null)
    setShowOptions(false)
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return

    onCreateTask({
      title: trimmed,
      column_name: columnName,
      priority,
      assigned_to: assignee,
    })

    resetForm()
    // Keep form open for rapid entry
    inputRef.current?.focus()
  }, [title, columnName, priority, assignee, onCreateTask, resetForm])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        resetForm()
      }
    },
    [handleSubmit, resetForm]
  )

  const handleClose = useCallback(() => {
    setIsOpen(false)
    resetForm()
  }, [resetForm])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground',
          'transition-colors hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-2 shadow-sm">
      {/* Title input */}
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task title..."
        className={cn(
          'w-full rounded-md border-0 bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground',
          'outline-none ring-0 focus:ring-0'
        )}
      />

      {/* Action row */}
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Toggle options */}
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={cn(
              'rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-accent',
              showOptions && 'bg-accent text-accent-foreground'
            )}
            title="More options"
          >
            ...
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-7 px-2 text-xs"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="h-7 px-3 text-xs"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Optional: Priority & Assignee quick-set */}
      {showOptions && (
        <div className="mt-2 flex flex-col gap-2 border-t pt-2">
          {/* Priority selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground w-14">
              Priority
            </span>
            <div className="flex gap-1">
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                    priority === p
                      ? 'bg-accent text-accent-foreground ring-1 ring-ring'
                      : 'text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      PRIORITY_CONFIG[p].dotColor
                    )}
                  />
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground w-14">
              Assign
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setAssignee(null)}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                  assignee === null
                    ? 'bg-accent text-accent-foreground ring-1 ring-ring'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                None
              </button>
              {USERS.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setAssignee(user.id)}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                    assignee === user.id
                      ? 'bg-accent text-accent-foreground ring-1 ring-ring'
                      : 'text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  {user.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
