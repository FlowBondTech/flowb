import { useState, useEffect, useCallback, useRef } from 'react'
import { createId } from '@paralleldrive/cuid2'
import { supabase } from '@/lib/supabase'
import type {
  KanbanBoard,
  KanbanTask,
  BoardColumn,
  ColumnName,
  TaskActivity,
} from '@/types/kanban'
import { COLUMNS } from '@/types/kanban'

interface UseKanbanReturn {
  boards: KanbanBoard[]
  currentBoard: KanbanBoard | null
  tasks: KanbanTask[]
  columns: BoardColumn[]
  loading: boolean
  error: string | null
  setCurrentBoard: (boardOrSlug: string | KanbanBoard) => void
  createTask: (task: Partial<KanbanTask>) => Promise<KanbanTask | null>
  updateTask: (
    taskId: string,
    updates: Partial<KanbanTask>,
  ) => Promise<KanbanTask | null>
  moveTask: (
    taskId: string,
    toColumn: ColumnName,
    position: number,
  ) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  addComment: (taskId: string, text: string) => Promise<void>
}

function buildColumns(tasks: KanbanTask[]): BoardColumn[] {
  return COLUMNS.map((col) => ({
    name: col.name,
    label: col.label,
    wipLimit: 0,
    tasks: tasks
      .filter((t) => t.column_name === col.name)
      .sort((a, b) => a.position - b.position),
  }))
}

export function useKanban(userId: string): UseKanbanReturn {
  const [boards, setBoards] = useState<KanbanBoard[]>([])
  const [currentBoard, setCurrentBoardState] = useState<KanbanBoard | null>(
    null,
  )
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Fetch boards on mount
  useEffect(() => {
    let cancelled = false

    async function fetchBoards() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('kanban_boards')
        .select('*')
        .order('position')

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const boardList = (data ?? []) as KanbanBoard[]
      setBoards(boardList)

      // Auto-select first board if none selected
      if (boardList.length > 0 && !currentBoard) {
        setCurrentBoardState(boardList[0])
      }

      setLoading(false)
    }

    fetchBoards()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch tasks when current board changes
  useEffect(() => {
    if (!currentBoard) {
      setTasks([])
      return
    }

    let cancelled = false
    const boardId = currentBoard.id

    async function fetchTasks() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('kanban_tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('position')

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setTasks((data ?? []) as KanbanTask[])
      setLoading(false)
    }

    fetchTasks()
    return () => {
      cancelled = true
    }
  }, [currentBoard])

  // Realtime subscription for current board
  useEffect(() => {
    if (!currentBoard) return

    const boardId = currentBoard.id

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`kanban-tasks-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_tasks',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          if (eventType === 'INSERT') {
            const newTask = newRecord as KanbanTask
            setTasks((prev) => {
              // Avoid duplicates from optimistic updates
              if (prev.some((t) => t.id === newTask.id)) {
                return prev.map((t) => (t.id === newTask.id ? newTask : t))
              }
              return [...prev, newTask]
            })
          }

          if (eventType === 'UPDATE') {
            const updated = newRecord as KanbanTask
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t)),
            )
          }

          if (eventType === 'DELETE') {
            const deleted = oldRecord as { id: string }
            setTasks((prev) => prev.filter((t) => t.id !== deleted.id))
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [currentBoard])

  // Derived columns
  const columns = buildColumns(tasks)

  // Accept either a slug string or a KanbanBoard object
  const setCurrentBoard = useCallback(
    (boardOrSlug: string | KanbanBoard) => {
      if (typeof boardOrSlug === 'string') {
        const board = boards.find((b) => b.slug === boardOrSlug)
        if (board) {
          setCurrentBoardState(board)
        }
      } else {
        setCurrentBoardState(boardOrSlug)
      }
    },
    [boards],
  )

  const createTask = useCallback(
    async (taskData: Partial<KanbanTask>): Promise<KanbanTask | null> => {
      if (!currentBoard) {
        setError('No board selected')
        return null
      }

      const now = new Date().toISOString()
      const columnName = taskData.column_name ?? 'backlog'

      // Calculate next position in column
      const columnTasks = tasks.filter((t) => t.column_name === columnName)
      const maxPosition = columnTasks.reduce(
        (max, t) => Math.max(max, t.position),
        -1,
      )

      const newTask: KanbanTask = {
        id: createId(),
        board_id: currentBoard.id,
        title: taskData.title ?? 'Untitled Task',
        description: taskData.description ?? '',
        column_name: columnName,
        position: maxPosition + 1,
        priority: taskData.priority ?? 'medium',
        assigned_to: taskData.assigned_to ?? null,
        due_date: taskData.due_date ?? null,
        labels: taskData.labels ?? [],
        subtasks: taskData.subtasks ?? [],
        blocked_by: taskData.blocked_by ?? [],
        estimated_hours: taskData.estimated_hours ?? null,
        actual_hours: taskData.actual_hours ?? null,
        created_by: userId,
        source: taskData.source ?? 'human',
        metadata: taskData.metadata ?? {},
        tags: taskData.tags ?? [],
        column_entered_at: now,
        created_at: now,
        updated_at: now,
      }

      // Optimistic update
      setTasks((prev) => [...prev, newTask])
      setError(null)

      const { data, error: insertError } = await supabase
        .from('kanban_tasks')
        .insert({
          id: newTask.id,
          board_id: newTask.board_id,
          title: newTask.title,
          description: newTask.description,
          column_name: newTask.column_name,
          position: newTask.position,
          priority: newTask.priority,
          assigned_to: newTask.assigned_to,
          due_date: newTask.due_date,
          labels: newTask.labels,
          subtasks: newTask.subtasks,
          blocked_by: newTask.blocked_by,
          estimated_hours: newTask.estimated_hours,
          actual_hours: newTask.actual_hours,
          created_by: newTask.created_by,
          source: newTask.source,
          metadata: newTask.metadata,
          tags: newTask.tags,
          column_entered_at: newTask.column_entered_at,
        })
        .select()
        .single()

      if (insertError) {
        // Roll back optimistic update
        setTasks((prev) => prev.filter((t) => t.id !== newTask.id))
        setError(insertError.message)
        return null
      }

      // Reconcile with server response
      const serverTask = data as KanbanTask
      setTasks((prev) =>
        prev.map((t) => (t.id === newTask.id ? serverTask : t)),
      )
      return serverTask
    },
    [currentBoard, tasks, userId],
  )

  const updateTask = useCallback(
    async (
      taskId: string,
      updates: Partial<KanbanTask>,
    ): Promise<KanbanTask | null> => {
      const existing = tasks.find((t) => t.id === taskId)
      if (!existing) {
        setError('Task not found')
        return null
      }

      const now = new Date().toISOString()
      const updatedFields = { ...updates, updated_at: now }

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updatedFields } : t)),
      )
      setError(null)

      const { data, error: updateError } = await supabase
        .from('kanban_tasks')
        .update(updatedFields)
        .eq('id', taskId)
        .select()
        .single()

      if (updateError) {
        // Roll back
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? existing : t)),
        )
        setError(updateError.message)
        return null
      }

      const serverTask = data as KanbanTask
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? serverTask : t)),
      )
      return serverTask
    },
    [tasks],
  )

  const moveTask = useCallback(
    async (
      taskId: string,
      toColumn: ColumnName,
      position: number,
    ): Promise<void> => {
      const existing = tasks.find((t) => t.id === taskId)
      if (!existing) {
        setError('Task not found')
        return
      }

      const now = new Date().toISOString()
      const columnChanged = existing.column_name !== toColumn

      const moveUpdates: Partial<KanbanTask> = {
        column_name: toColumn,
        position,
        updated_at: now,
        ...(columnChanged ? { column_entered_at: now } : {}),
      }

      // Optimistic update -- also reorder other tasks in target column
      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id === taskId) {
            return { ...t, ...moveUpdates }
          }
          // Shift tasks in the target column at or after the new position
          if (
            t.column_name === toColumn &&
            t.id !== taskId &&
            t.position >= position
          ) {
            return { ...t, position: t.position + 1 }
          }
          return t
        })
        return updated
      })

      setError(null)

      const { error: moveError } = await supabase
        .from('kanban_tasks')
        .update({
          column_name: toColumn,
          position,
          updated_at: now,
          ...(columnChanged ? { column_entered_at: now } : {}),
        })
        .eq('id', taskId)
        .select()
        .single()

      if (moveError) {
        // Roll back
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? existing : t)),
        )
        setError(moveError.message)
      }
    },
    [tasks],
  )

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      const existing = tasks.find((t) => t.id === taskId)
      if (!existing) return

      // Optimistic delete
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setError(null)

      const { error: deleteError } = await supabase
        .from('kanban_tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) {
        // Roll back
        setTasks((prev) => [...prev, existing])
        setError(deleteError.message)
      }
    },
    [tasks],
  )

  const addComment = useCallback(
    async (taskId: string, text: string): Promise<void> => {
      if (!text.trim()) return

      const now = new Date().toISOString()
      const activity: TaskActivity = {
        id: createId(),
        task_id: taskId,
        user: userId,
        action: 'commented',
        data: { text },
        created_at: now,
      }

      // Insert activity record
      const { error: commentError } = await supabase
        .from('kanban_task_activity')
        .insert({
          id: activity.id,
          task_id: activity.task_id,
          user: activity.user,
          action: activity.action,
          data: activity.data,
          created_at: activity.created_at,
        })

      if (commentError) {
        setError(commentError.message)
        return
      }

      // Update task's updated_at timestamp
      await supabase
        .from('kanban_tasks')
        .update({ updated_at: now })
        .eq('id', taskId)
    },
    [userId],
  )

  return {
    boards,
    currentBoard,
    tasks,
    columns,
    loading,
    error,
    setCurrentBoard,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    addComment,
  }
}
