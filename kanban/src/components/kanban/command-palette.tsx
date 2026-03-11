import { useState, useEffect, useRef, useMemo } from 'react'
import type { KanbanTask, KanbanBoard } from '@/types/kanban'
import { cn } from '@/lib/utils'
import { Search, Layout, Plus, FileText } from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  tasks: KanbanTask[]
  boards: KanbanBoard[]
  onSelectTask: (task: KanbanTask) => void
  onSelectBoard: (slug: string) => void
  onCreateTask: () => void
}

export function CommandPalette({ open, onClose, tasks, boards, onSelectTask, onSelectBoard, onCreateTask }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo(() => {
    const items: { type: 'action' | 'board' | 'task'; label: string; sublabel?: string; data: unknown }[] = []
    const q = query.toLowerCase().trim()

    // Actions always show
    if (!q || 'create new task'.includes(q)) {
      items.push({ type: 'action', label: 'Create new task', sublabel: 'N', data: 'create' })
    }

    // Boards
    boards.forEach(b => {
      if (!q || b.name.toLowerCase().includes(q) || b.slug.includes(q)) {
        items.push({ type: 'board', label: b.name, sublabel: b.slug, data: b })
      }
    })

    // Tasks (only when searching)
    if (q.length >= 2) {
      tasks
        .filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
        .slice(0, 10)
        .forEach(t => {
          items.push({ type: 'task', label: t.title, sublabel: t.column_name, data: t })
        })
    }

    return items
  }, [query, tasks, boards])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      selectItem(results[selectedIndex])
    }
  }

  function selectItem(item: typeof results[number]) {
    if (item.type === 'action') {
      onCreateTask()
    } else if (item.type === 'board') {
      onSelectBoard((item.data as KanbanBoard).slug)
      onClose()
    } else if (item.type === 'task') {
      onSelectTask(item.data as KanbanTask)
      onClose()
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  return (
    <div
      className="command-overlay fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg animate-[scale-in_0.15s_ease-out] overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-dialog)]">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, boards, actions..."
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto scrollbar-thin p-1.5">
          {results.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}
          {results.map((item, i) => (
            <button
              key={`${item.type}-${item.label}-${i}`}
              onClick={() => selectItem(item)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted'
              )}
            >
              {item.type === 'action' && <Plus className="h-4 w-4 shrink-0 text-primary" />}
              {item.type === 'board' && <Layout className="h-4 w-4 shrink-0 text-muted-foreground" />}
              {item.type === 'task' && <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="flex-1 truncate">{item.label}</span>
              {item.sublabel && (
                <span className="shrink-0 text-xs text-muted-foreground">{item.sublabel}</span>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="hidden border-t px-4 py-2 text-[10px] text-muted-foreground md:flex md:gap-4">
          <span><kbd className="rounded border px-1">Enter</kbd> select</span>
          <span><kbd className="rounded border px-1">&uarr;&darr;</kbd> navigate</span>
          <span><kbd className="rounded border px-1">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
