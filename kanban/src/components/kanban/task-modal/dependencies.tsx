import { useState } from 'react'
import { X, Search, Link2 } from 'lucide-react'
import type { KanbanTask } from '@/types/kanban'

interface DependenciesProps {
  blockedBy: string[]
  allTasks: KanbanTask[]
  currentTaskId?: string
  onChange: (blockedBy: string[]) => void
}

export function Dependencies({ blockedBy, allTasks, currentTaskId, onChange }: DependenciesProps) {
  const [search, setSearch] = useState('')
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const blockerTasks = blockedBy
    .map((id) => allTasks.find((t) => t.id === id))
    .filter(Boolean) as KanbanTask[]

  const availableTasks = allTasks.filter(
    (t) =>
      t.id !== currentTaskId &&
      !blockedBy.includes(t.id) &&
      (search === '' || t.title.toLowerCase().includes(search.toLowerCase())),
  )

  function addBlocker(taskId: string) {
    onChange([...blockedBy, taskId])
    setSearch('')
    setIsPickerOpen(false)
  }

  function removeBlocker(taskId: string) {
    onChange(blockedBy.filter((id) => id !== taskId))
  }

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" />
        Blocked by
      </label>

      {/* Current blockers */}
      {blockerTasks.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {blockerTasks.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            >
              {t.title.length > 30 ? t.title.slice(0, 30) + '...' : t.title}
              <button
                onClick={() => removeBlocker(t.id)}
                className="ml-0.5 rounded hover:bg-red-200 dark:hover:bg-red-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {blockerTasks.length === 0 && !isPickerOpen && (
        <p className="mb-2 text-xs text-muted-foreground/60">No blockers</p>
      )}

      {/* Add blocker */}
      {isPickerOpen ? (
        <div className="rounded-lg border border-input bg-background">
          <div className="flex items-center gap-2 border-b px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              autoFocus
              className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            <button
              onClick={() => { setIsPickerOpen(false); setSearch('') }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto scrollbar-thin">
            {availableTasks.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No matching tasks</p>
            ) : (
              availableTasks.slice(0, 10).map((t) => (
                <button
                  key={t.id}
                  onClick={() => addBlocker(t.id)}
                  className="w-full px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted"
                >
                  <span className="line-clamp-1">{t.title}</span>
                  <span className="text-[10px] text-muted-foreground">{t.column_name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsPickerOpen(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          + Add blocker
        </button>
      )}
    </div>
  )
}
