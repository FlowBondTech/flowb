import { useState, useCallback, type DragEvent } from 'react'
import { cn } from '@/lib/utils'
import type { KanbanTask, ColumnName, Priority } from '@/types/kanban'
import { TaskCard } from './task-card'
import { QuickAddForm } from './quick-add-form'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  name: ColumnName
  label: string
  tasks: KanbanTask[]
  wipLimit: number
  onEditTask: (task: KanbanTask) => void
  onContextMenu?: (task: KanbanTask, position: { x: number; y: number }) => void
  onCreateTask: (data: {
    title: string
    column_name: ColumnName
    priority: Priority
    assigned_to: string | null
  }) => void
  onDragStart: (e: DragEvent<HTMLDivElement>, task: KanbanTask) => void
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>, columnName: ColumnName) => void
  draggingTaskId: string | null
}

// ─── Column color accent by name ───────────────────────────────────────────────

const COLUMN_ACCENTS: Record<ColumnName, string> = {
  backlog: 'border-t-gray-400 dark:border-t-gray-500',
  todo: 'border-t-blue-400 dark:border-t-blue-500',
  'in-progress': 'border-t-yellow-400 dark:border-t-yellow-500',
  done: 'border-t-emerald-400 dark:border-t-emerald-500',
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function KanbanColumn({
  name,
  label,
  tasks,
  wipLimit,
  onEditTask,
  onContextMenu,
  onCreateTask,
  onDragStart,
  onDragEnd,
  onDrop,
  draggingTaskId,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const taskCount = tasks.length
  const isOverWip = wipLimit > 0 && taskCount > wipLimit
  const isAtWip = wipLimit > 0 && taskCount === wipLimit

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only set false if we're leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      onDrop(e, name)
    },
    [onDrop, name]
  )

  return (
    <div
      data-column={name}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex h-full w-72 flex-shrink-0 flex-col rounded-xl border-t-2 bg-muted/30',
        'md:w-full md:min-w-0',
        COLUMN_ACCENTS[name],
        isDragOver && 'bg-accent/40 ring-2 ring-ring/30',
        'transition-colors duration-150'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          <span
            className={cn(
              'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium',
              isOverWip
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {taskCount}
          </span>
        </div>

        {/* WIP limit indicator */}
        {wipLimit > 0 && (
          <span
            className={cn(
              'text-[10px] font-medium',
              isOverWip
                ? 'text-red-500'
                : isAtWip
                  ? 'text-yellow-500'
                  : 'text-muted-foreground'
            )}
            title={`WIP limit: ${wipLimit}`}
          >
            /{wipLimit}
          </span>
        )}
      </div>

      {/* Scrollable task list */}
      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {tasks.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">No tasks</p>
          </div>
        )}

        {/* Drop zone visual when empty and dragging over */}
        {tasks.length === 0 && isDragOver && (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-ring/40 py-8">
            <p className="text-xs text-muted-foreground">Drop here</p>
          </div>
        )}

        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onContextMenu={onContextMenu}
            isDragging={draggingTaskId === task.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>

      {/* Quick-add form at bottom */}
      <div className="border-t px-2 py-2">
        <QuickAddForm columnName={name} onCreateTask={onCreateTask} />
      </div>
    </div>
  )
}
