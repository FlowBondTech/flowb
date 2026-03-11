import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type DragEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { cn } from '@/lib/utils'
import type {
  KanbanTask,
  KanbanBoard as KanbanBoardType,
  ColumnName,
  Priority,
  KanbanNotification,
} from '@/types/kanban'
import { COLUMNS } from '@/types/kanban'
import { KanbanColumn } from './kanban-column'
import { BoardHeader } from './board-header'
import { TaskFilters, EMPTY_FILTERS, type FilterState, type DueDateFilter } from './task-filters'
import { isPast, isToday, isTomorrow, parseISO, addDays, isAfter, isBefore } from 'date-fns'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  tasks: KanbanTask[]
  boards: KanbanBoardType[]
  currentBoard: KanbanBoardType
  notifications?: KanbanNotification[]
  onMoveTask: (
    taskId: string,
    fromColumn: ColumnName,
    toColumn: ColumnName,
    newPosition: number
  ) => void
  onCreateTask: (data: {
    title: string
    column_name: ColumnName
    priority: Priority
    assigned_to: string | null
  }) => void
  onEditTask: (task: KanbanTask) => void
  onSelectBoard?: (board: KanbanBoardType) => void
  onNotificationsClick?: () => void
}

// ─── Swipe config ──────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 50
const MOBILE_BREAKPOINT = 768

// ─── Filter logic ──────────────────────────────────────────────────────────────

function matchesDueDateFilter(task: KanbanTask, dueDateFilters: DueDateFilter[]): boolean {
  if (dueDateFilters.length === 0) return true

  for (const filter of dueDateFilters) {
    if (filter === 'no-date' && !task.due_date) return true
    if (!task.due_date) continue

    const dueDate = parseISO(task.due_date)
    if (filter === 'overdue' && isPast(dueDate) && !isToday(dueDate)) return true
    if (filter === 'today' && (isToday(dueDate) || isTomorrow(dueDate))) return true
    if (filter === 'this-week') {
      const weekEnd = addDays(new Date(), 7)
      if ((isAfter(dueDate, new Date()) || isToday(dueDate)) && isBefore(dueDate, weekEnd)) return true
    }
  }
  return false
}

function filterTasks(tasks: KanbanTask[], filters: FilterState): KanbanTask[] {
  return tasks.filter((task) => {
    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (
        !task.title.toLowerCase().includes(q) &&
        !task.description.toLowerCase().includes(q)
      ) {
        return false
      }
    }

    // Assignees
    if (filters.assignees.length > 0) {
      if (!task.assigned_to || !filters.assignees.includes(task.assigned_to)) {
        return false
      }
    }

    // Priorities
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(task.priority)) {
        return false
      }
    }

    // Due dates
    if (!matchesDueDateFilter(task, filters.dueDates)) {
      return false
    }

    // Labels
    if (filters.labels.length > 0) {
      if (!filters.labels.some((l) => task.labels.includes(l))) {
        return false
      }
    }

    return true
  })
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function KanbanBoard({
  tasks,
  boards,
  currentBoard,
  notifications = [],
  onMoveTask,
  onCreateTask,
  onEditTask,
  onSelectBoard,
  onNotificationsClick,
}: KanbanBoardProps) {
  // Drag state
  const [draggingTask, setDraggingTask] = useState<{
    id: string
    fromColumn: ColumnName
  } | null>(null)

  // Mobile state
  const [isMobile, setIsMobile] = useState(false)
  const [activeColumnIndex, setActiveColumnIndex] = useState(0)
  const touchStartX = useRef(0)
  const touchDeltaX = useRef(0)
  const boardRef = useRef<HTMLDivElement>(null)

  // Filters
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)

  // Theme
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  // Search from header (feeds into filters)
  const handleHeaderSearch = useCallback(
    (query: string) => {
      setFilters((prev) => ({ ...prev, search: query }))
    },
    []
  )

  // Theme toggle
  const handleToggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }, [])

  // Responsive detection
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Filtered and sorted tasks per column
  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])

  const columnData = useMemo(() => {
    return COLUMNS.map((col) => {
      const columnTasks = filteredTasks
        .filter((t) => t.column_name === col.name)
        .sort((a, b) => a.position - b.position)
      const wipLimit = currentBoard.wip_limits[col.name] ?? 0
      return { ...col, tasks: columnTasks, wipLimit }
    })
  }, [filteredTasks, currentBoard.wip_limits])

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (_e: DragEvent<HTMLDivElement>, task: KanbanTask) => {
      setDraggingTask({ id: task.id, fromColumn: task.column_name })
    },
    []
  )

  const handleDragEnd = useCallback(() => {
    setDraggingTask(null)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, toColumn: ColumnName) => {
      e.preventDefault()
      if (!draggingTask) return

      const taskId = e.dataTransfer.getData('text/plain') || draggingTask.id
      const fromColumn = draggingTask.fromColumn

      if (fromColumn === toColumn) {
        setDraggingTask(null)
        return
      }

      // Place at the end of the target column
      const targetColumnTasks = filteredTasks.filter(
        (t) => t.column_name === toColumn
      )
      const newPosition = targetColumnTasks.length

      onMoveTask(taskId, fromColumn, toColumn, newPosition)
      setDraggingTask(null)
    },
    [draggingTask, filteredTasks, onMoveTask]
  )

  // ── Mobile swipe handlers ─────────────────────────────────────────────────

  const handleTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }, [])

  const handleTouchMove = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current
  }, [])

  const handleTouchEnd = useCallback(() => {
    const delta = touchDeltaX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      setActiveColumnIndex((prev) => {
        if (delta < 0) {
          // Swipe left → next column
          return Math.min(prev + 1, COLUMNS.length - 1)
        } else {
          // Swipe right → previous column
          return Math.max(prev - 1, 0)
        }
      })
    }
    touchDeltaX.current = 0
  }, [])

  const handleDotClick = useCallback((index: number) => {
    setActiveColumnIndex(index)
  }, [])

  // Board select
  const handleSelectBoard = useCallback(
    (board: KanbanBoardType) => {
      onSelectBoard?.(board)
    },
    [onSelectBoard]
  )

  // Notifications
  const handleNotificationsClick = useCallback(() => {
    onNotificationsClick?.()
  }, [onNotificationsClick])

  // Active column for mobile
  const activeColumn = columnData[activeColumnIndex]

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <BoardHeader
        boards={boards}
        currentBoard={currentBoard}
        tasks={tasks}
        notifications={notifications}
        onSelectBoard={handleSelectBoard}
        onSearch={handleHeaderSearch}
        onToggleTheme={handleToggleTheme}
        onNotificationsClick={handleNotificationsClick}
        isDarkMode={isDarkMode}
      />

      {/* Filter bar */}
      <div className="border-b px-4 py-2">
        <TaskFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Board area */}
      <div className="flex-1 overflow-hidden" ref={boardRef}>
        {/* Desktop: horizontal columns */}
        {!isMobile && (
          <div className="grid h-full grid-cols-4 gap-4 p-4">
            {columnData.map((col) => (
              <KanbanColumn
                key={col.name}
                name={col.name}
                label={col.label}
                tasks={col.tasks}
                wipLimit={col.wipLimit}
                onEditTask={onEditTask}
                onCreateTask={onCreateTask}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                draggingTaskId={draggingTask?.id ?? null}
              />
            ))}
          </div>
        )}

        {/* Mobile: single column with swipe */}
        {isMobile && activeColumn && (
          <div
            className="flex h-full flex-col"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Mobile column header */}
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <button
                onClick={() =>
                  setActiveColumnIndex((p) => Math.max(0, p - 1))
                }
                disabled={activeColumnIndex === 0}
                className={cn(
                  'rounded p-1 text-muted-foreground transition-colors',
                  activeColumnIndex === 0
                    ? 'opacity-30'
                    : 'hover:bg-accent'
                )}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <h2 className="text-sm font-semibold text-foreground">
                {activeColumn.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({activeColumn.tasks.length})
                </span>
              </h2>

              <button
                onClick={() =>
                  setActiveColumnIndex((p) =>
                    Math.min(p + 1, COLUMNS.length - 1)
                  )
                }
                disabled={activeColumnIndex === COLUMNS.length - 1}
                className={cn(
                  'rounded p-1 text-muted-foreground transition-colors',
                  activeColumnIndex === COLUMNS.length - 1
                    ? 'opacity-30'
                    : 'hover:bg-accent'
                )}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Mobile column content */}
            <div className="flex-1 overflow-y-auto p-4">
              <KanbanColumn
                name={activeColumn.name}
                label={activeColumn.label}
                tasks={activeColumn.tasks}
                wipLimit={activeColumn.wipLimit}
                onEditTask={onEditTask}
                onCreateTask={onCreateTask}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                draggingTaskId={draggingTask?.id ?? null}
              />
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-2 pb-4 pt-2">
              {COLUMNS.map((col, i) => (
                <button
                  key={col.name}
                  onClick={() => handleDotClick(i)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === activeColumnIndex
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                  aria-label={`Switch to ${col.label}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
