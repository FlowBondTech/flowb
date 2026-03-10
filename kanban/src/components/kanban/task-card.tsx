import { useCallback, useRef, type DragEvent, type TouchEvent } from 'react'
import {
  Paperclip,
  Lock,
} from 'lucide-react'
import { TimeTrackingMiniArc } from './task-modal/time-tracking'
import { formatDistanceToNow, isPast, isToday, isTomorrow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { KanbanTask, LabelColor, Crew } from '@/types/kanban'
import { PRIORITY_CONFIG, LABEL_COLORS, USERS } from '@/types/kanban'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: KanbanTask
  crews?: Crew[]
  onEdit: (task: KanbanTask) => void
  onContextMenu?: (task: KanbanTask, position: { x: number; y: number }) => void
  isDragging?: boolean
  onDragStart?: (e: DragEvent<HTMLDivElement>, task: KanbanTask) => void
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getDueDateDisplay(dueDateStr: string): {
  text: string
  className: string
} {
  const dueDate = parseISO(dueDateStr)

  if (isPast(dueDate) && !isToday(dueDate)) {
    const dist = formatDistanceToNow(dueDate, { addSuffix: false })
    return {
      text: `${dist} overdue`,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
  }

  if (isToday(dueDate)) {
    return {
      text: 'Today',
      className:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    }
  }

  if (isTomorrow(dueDate)) {
    return {
      text: 'Tomorrow',
      className:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    }
  }

  return {
    text: formatDistanceToNow(dueDate, { addSuffix: true }),
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
}

function getAssigneeColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getAssigneeName(userId: string): string {
  const user = USERS.find((u) => u.id === userId)
  return user?.name ?? userId
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function TaskCard({
  task,
  crews = [],
  onEdit,
  onContextMenu,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)

  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const isBlocked = task.blocked_by.length > 0
  const doneSubtasks = task.subtasks.filter((s) => s.done).length
  const totalSubtasks = task.subtasks.length
  const subtaskPercent =
    totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0
  const attachmentCount = (task.metadata?.attachments as { id: string }[])
    ?.length ?? 0
  const isNonHumanSource = task.source !== 'human'

  // Find crew for this task
  const taskCrew = task.crew_id ? crews.find((c) => c.id === task.crew_id) : null

  // Labels: show max 4 dots, +N for rest
  const visibleLabels = task.labels.slice(0, 4)
  const extraLabelCount = Math.max(0, task.labels.length - 4)

  const handleClick = useCallback(() => {
    onEdit(task)
  }, [onEdit, task])

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('text/plain', task.id)
      e.dataTransfer.effectAllowed = 'move'
      onDragStart?.(e, task)
    },
    [onDragStart, task]
  )

  const handleDragEnd = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      onDragEnd?.(e)
    },
    [onDragEnd]
  )

  // Touch handlers for long-press context menu
  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0]
      touchStartPos.current = { x: touch.clientX, y: touch.clientY }
      longPressTimer.current = setTimeout(() => {
        onContextMenu?.(task, {
          x: touch.clientX,
          y: touch.clientY,
        })
      }, 500)
    },
    [onContextMenu, task]
  )

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  return (
    <div
      data-task-id={task.id}
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'group relative cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        'active:shadow-sm active:translate-y-0',
        isDragging && 'opacity-50 rotate-2 shadow-lg scale-105',
        isBlocked && 'border-l-2 border-l-red-400 dark:border-l-red-500'
      )}
    >
      {/* Priority dot -- top right */}
      <div
        className={cn(
          'absolute top-2.5 right-2.5 h-2 w-2 rounded-full',
          priorityConfig.dotColor
        )}
        title={priorityConfig.label}
      />

      {/* Title */}
      <h3 className="pr-5 text-sm font-semibold leading-snug text-foreground line-clamp-2">
        {task.title}
      </h3>

      {/* Description snippet */}
      {task.description && (
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-1">
          {stripMarkdown(task.description).slice(0, 80)}
        </p>
      )}

      {/* Labels row */}
      {task.labels.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1">
          {visibleLabels.map((label: LabelColor) => (
            <span
              key={label}
              className={cn('h-2 w-6 rounded-full', LABEL_COLORS[label])}
              title={label}
            />
          ))}
          {extraLabelCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              +{extraLabelCount}
            </span>
          )}
        </div>
      )}

      {/* Metadata row */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {/* Due date */}
        {task.due_date && (
          <span
            className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium',
              getDueDateDisplay(task.due_date).className
            )}
          >
            {getDueDateDisplay(task.due_date).text}
          </span>
        )}

        {/* Subtask progress */}
        {totalSubtasks > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-1 w-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  subtaskPercent === 100
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
                )}
                style={{ width: `${subtaskPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {doneSubtasks}/{totalSubtasks}
            </span>
          </div>
        )}

        {/* Attachment count */}
        {attachmentCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            {attachmentCount}
          </span>
        )}

        {/* Time tracking mini arc */}
        {task.estimated_hours != null && task.estimated_hours > 0 && (
          <TimeTrackingMiniArc
            estimated={task.estimated_hours}
            actual={task.actual_hours ?? 0}
          />
        )}

        {/* Blocked indicator */}
        {isBlocked && (
          <span className="inline-flex items-center gap-0.5 text-red-400" title="Blocked">
            <Lock className="h-3 w-3" />
            {task.blocked_by.length > 1 && (
              <span className="text-[9px] font-medium">{task.blocked_by.length}</span>
            )}
          </span>
        )}

        {/* Source badge (non-human only) */}
        {isNonHumanSource && (
          <Badge
            variant="gray"
            className="h-4 px-1 py-0 text-[9px] leading-none"
          >
            {task.source}
          </Badge>
        )}
      </div>

      {/* Crew badge -- bottom left */}
      {taskCrew && (
        <span
          className="absolute bottom-2.5 left-2.5 text-xs"
          title={taskCrew.name}
        >
          {taskCrew.emoji}
        </span>
      )}

      {/* Assignee avatar -- bottom right */}
      {task.assigned_to && (
        <div
          className={cn(
            'absolute bottom-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white',
            getAssigneeColor(task.assigned_to)
          )}
          title={getAssigneeName(task.assigned_to)}
        >
          {getAssigneeName(task.assigned_to).charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}
