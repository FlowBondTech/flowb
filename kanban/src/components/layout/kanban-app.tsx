import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/contexts/auth-context'
import { useKanban } from '@/hooks/use-kanban'
import { useNotifications } from '@/hooks/use-notifications'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { TaskModal } from '@/components/kanban/task-modal'
import { CommandPalette } from '@/components/kanban/command-palette'
import { LeadPipeline } from '@/components/leads/lead-pipeline'
import type { KanbanTask, ColumnName, Priority } from '@/types/kanban'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type AppView = 'tasks' | 'leads'

function getInitialView(): AppView {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'leads') return 'leads'
  } catch { /* ignore */ }
  return 'tasks'
}

export function KanbanApp() {
  const { user } = useAuthContext()
  const userId = user!.id

  const [view, setView] = useState<AppView>(getInitialView)

  const {
    boards,
    currentBoard,
    tasks,
    loading,
    setCurrentBoard,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
  } = useKanban(userId)
  const { notifications } = useNotifications(userId)

  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createColumn, setCreateColumn] = useState<ColumnName>('todo')
  const [commandOpen, setCommandOpen] = useState(false)

  // Update URL when view changes
  useEffect(() => {
    const url = new URL(window.location.href)
    if (view === 'leads') {
      url.searchParams.set('view', 'leads')
    } else {
      url.searchParams.delete('view')
    }
    window.history.replaceState({}, '', url.toString())
  }, [view])

  // Global keyboard shortcuts (Cmd+K, N for new task)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
        return
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'n' && view === 'tasks') {
        e.preventDefault()
        setCreateColumn('todo')
        setIsCreating(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view])

  const handleMoveTask = useCallback(
    async (taskId: string, _fromColumn: ColumnName, toColumn: ColumnName, position: number) => {
      try {
        await moveTask(taskId, toColumn, position)
      } catch {
        toast.error('Failed to move task')
      }
    },
    [moveTask]
  )

  const handleCreateTask = useCallback(
    async (data: { title: string; column_name: ColumnName; priority: Priority; assigned_to: string | null }) => {
      if (!currentBoard) return
      try {
        await createTask({
          board_id: currentBoard.id,
          title: data.title,
          column_name: data.column_name,
          created_by: userId,
          source: 'human',
          priority: data.priority,
          assigned_to: data.assigned_to,
          labels: [],
          subtasks: [],
          blocked_by: [],
          tags: [],
          description: '',
          metadata: {},
        })
        toast.success('Task created')
      } catch {
        toast.error('Failed to create task')
      }
    },
    [currentBoard, createTask, userId]
  )

  const handleUpdateTask = useCallback(
    async (taskId: string, updates: Partial<KanbanTask>) => {
      try {
        await updateTask(taskId, updates)
        toast.success('Task updated')
      } catch {
        toast.error('Failed to update task')
      }
    },
    [updateTask]
  )

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteTask(taskId)
        setEditingTask(null)
        toast.success('Task deleted')
      } catch {
        toast.error('Failed to delete task')
      }
    },
    [deleteTask]
  )

  // Show loading only for tasks view (leads has its own loading state)
  if (view === 'tasks' && (loading || !currentBoard)) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* View switcher still visible during loading */}
        <ViewSwitcher view={view} onViewChange={setView} />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading boards...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* View switcher */}
      <ViewSwitcher view={view} onViewChange={setView} />

      {/* Tasks view */}
      {view === 'tasks' && currentBoard && (
        <>
          <KanbanBoard
            tasks={tasks}
            boards={boards}
            currentBoard={currentBoard}
            notifications={notifications}
            onMoveTask={handleMoveTask}
            onEditTask={setEditingTask}
            onCreateTask={handleCreateTask}
            onSelectBoard={(board) => setCurrentBoard(board)}
          />

          {editingTask && (
            <TaskModal
              task={editingTask}
              onClose={() => setEditingTask(null)}
              onUpdate={(updates) => handleUpdateTask(editingTask.id, updates)}
              onDelete={() => handleDeleteTask(editingTask.id)}
              currentUser={userId}
            />
          )}

          {isCreating && (
            <TaskModal
              task={null}
              defaultColumn={createColumn}
              onClose={() => setIsCreating(false)}
              onCreate={(task) => {
                handleCreateTask({
                  title: task.title,
                  column_name: task.column_name,
                  priority: task.priority ?? 'medium',
                  assigned_to: task.assigned_to ?? null,
                })
                setIsCreating(false)
              }}
              currentUser={userId}
            />
          )}

          <CommandPalette
            open={commandOpen}
            onClose={() => setCommandOpen(false)}
            tasks={tasks}
            boards={boards}
            onSelectTask={setEditingTask}
            onSelectBoard={(slug) => setCurrentBoard(slug)}
            onCreateTask={() => { setCreateColumn('todo'); setIsCreating(true); setCommandOpen(false) }}
          />
        </>
      )}

      {/* Leads view */}
      {view === 'leads' && (
        <div className="flex-1 overflow-hidden">
          <LeadPipeline />
        </div>
      )}
    </div>
  )
}

// ─── View Switcher ──────────────────────────────────────────────────────────

function ViewSwitcher({
  view,
  onViewChange,
}: {
  view: AppView
  onViewChange: (view: AppView) => void
}) {
  return (
    <div className="flex items-center gap-1 border-b bg-card px-4 py-1.5">
      <button
        onClick={() => onViewChange('tasks')}
        className={cn(
          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
          view === 'tasks'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        Tasks
      </button>
      <button
        onClick={() => onViewChange('leads')}
        className={cn(
          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
          view === 'leads'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        Leads
      </button>
    </div>
  )
}
