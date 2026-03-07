import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/contexts/auth-context'
import { useKanban } from '@/hooks/use-kanban'
import { useNotifications } from '@/hooks/use-notifications'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { TaskModal } from '@/components/kanban/task-modal'
import { CommandPalette } from '@/components/kanban/command-palette'
import type { KanbanTask, ColumnName, Priority } from '@/types/kanban'
import { toast } from 'sonner'

export function KanbanApp() {
  const { user } = useAuthContext()
  const userId = user!.id
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

  // Global keyboard shortcuts (Cmd+K, N for new task)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
        return
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'n') {
        e.preventDefault()
        setCreateColumn('todo')
        setIsCreating(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  if (loading || !currentBoard) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading boards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
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
    </div>
  )
}
