import { useState, useCallback, useRef } from 'react'
import { CheckSquare, Square, Plus, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Subtask } from '@/types/kanban'

interface ChecklistProps {
  subtasks: Subtask[]
  onChange: (subtasks: Subtask[]) => void
}

export function Checklist({ subtasks, onChange }: ChecklistProps) {
  const [newText, setNewText] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const doneCount = subtasks.filter((s) => s.done).length
  const progress = subtasks.length > 0 ? (doneCount / subtasks.length) * 100 : 0

  function addSubtask() {
    if (!newText.trim()) return
    onChange([...subtasks, { id: crypto.randomUUID(), text: newText.trim(), done: false }])
    setNewText('')
  }

  function toggleSubtask(id: string) {
    onChange(subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)))
  }

  function removeSubtask(id: string) {
    onChange(subtasks.filter((s) => s.id !== id))
  }

  // Drag-to-reorder via native HTML5 DnD
  const handleDragStart = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.dataTransfer.effectAllowed = 'move'
      setDragIdx(idx)
    },
    [],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setOverIdx(idx)
    },
    [],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, toIdx: number) => {
      e.preventDefault()
      if (dragIdx === null || dragIdx === toIdx) {
        setDragIdx(null)
        setOverIdx(null)
        return
      }
      const items = [...subtasks]
      const [moved] = items.splice(dragIdx, 1)
      items.splice(toIdx, 0, moved)
      onChange(items)
      setDragIdx(null)
      setOverIdx(null)
    },
    [dragIdx, subtasks, onChange],
  )

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setOverIdx(null)
  }, [])

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        Subtasks
        {subtasks.length > 0 && (
          <span className="text-xs">({doneCount}/{subtasks.length})</span>
        )}
      </label>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
      )}

      {/* Items */}
      {subtasks.length > 0 && (
        <div ref={listRef} className="mb-2 space-y-0.5">
          {subtasks.map((s, idx) => (
            <div
              key={s.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/50',
                dragIdx === idx && 'opacity-50',
                overIdx === idx && dragIdx !== idx && 'border-t-2 border-primary',
              )}
            >
              {/* Grip handle */}
              <span className="cursor-grab text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
                <GripVertical className="h-3.5 w-3.5" />
              </span>

              {/* Checkbox */}
              <button onClick={() => toggleSubtask(s.id)} className="shrink-0 text-muted-foreground">
                {s.done ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>

              {/* Text */}
              <span className={cn('flex-1 text-sm', s.done && 'text-muted-foreground line-through')}>
                {s.text}
              </span>

              {/* Remove */}
              <button
                onClick={() => removeSubtask(s.id)}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new subtask */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addSubtask() }}
          placeholder="Add subtask..."
          className="h-8 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={addSubtask}
          disabled={!newText.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
