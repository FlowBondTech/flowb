import { useState, useCallback, useMemo } from 'react'
import { Filter, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Priority, LabelColor } from '@/types/kanban'
import { PRIORITY_CONFIG, LABEL_COLORS, USERS } from '@/types/kanban'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DueDateFilter = 'overdue' | 'today' | 'this-week' | 'no-date'

export interface FilterState {
  search: string
  assignees: string[]
  priorities: Priority[]
  dueDates: DueDateFilter[]
  labels: LabelColor[]
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  assignees: [],
  priorities: [],
  dueDates: [],
  labels: [],
}

interface TaskFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string }[] = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'no-date', label: 'No Date' },
]

function toggleInArray<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function TaskFilters({ filters, onChange }: TaskFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    count += filters.assignees.length
    count += filters.priorities.length
    count += filters.dueDates.length
    count += filters.labels.length
    return count
  }, [filters])

  const handleClearAll = useCallback(() => {
    onChange(EMPTY_FILTERS)
  }, [onChange])

  const handleSearchChange = useCallback(
    (search: string) => {
      onChange({ ...filters, search })
    },
    [filters, onChange]
  )

  const handleToggleAssignee = useCallback(
    (id: string) => {
      onChange({ ...filters, assignees: toggleInArray(filters.assignees, id) })
    },
    [filters, onChange]
  )

  const handleTogglePriority = useCallback(
    (p: Priority) => {
      onChange({ ...filters, priorities: toggleInArray(filters.priorities, p) })
    },
    [filters, onChange]
  )

  const handleToggleDueDate = useCallback(
    (d: DueDateFilter) => {
      onChange({ ...filters, dueDates: toggleInArray(filters.dueDates, d) })
    },
    [filters, onChange]
  )

  const handleToggleLabel = useCallback(
    (l: LabelColor) => {
      onChange({ ...filters, labels: toggleInArray(filters.labels, l) })
    },
    [filters, onChange]
  )

  return (
    <div className="space-y-2">
      {/* Compact bar: filter toggle + search */}
      <div className="flex items-center gap-2">
        {/* Filter toggle button */}
        <Button
          variant={isExpanded ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative h-8 gap-1.5 text-xs"
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Search input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tasks..."
            className={cn(
              'h-8 w-full rounded-md border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground',
              'outline-none focus:ring-2 focus:ring-ring'
            )}
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-8 gap-1 text-xs text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded filter options */}
      {isExpanded && (
        <div className="rounded-lg border bg-card p-3 space-y-3">
          {/* Assignee filter */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assignee
            </p>
            <div className="flex flex-wrap gap-1.5">
              {USERS.map((user) => {
                const isActive = filters.assignees.includes(user.id)
                return (
                  <button
                    key={user.id}
                    onClick={() => handleToggleAssignee(user.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    {user.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority filter */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Priority
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                const config = PRIORITY_CONFIG[p]
                const isActive = filters.priorities.includes(p)
                return (
                  <button
                    key={p}
                    onClick={() => handleTogglePriority(p)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <span
                      className={cn('h-2 w-2 rounded-full', config.dotColor)}
                    />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Due date filter */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Due Date
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DUE_DATE_OPTIONS.map((opt) => {
                const isActive = filters.dueDates.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleToggleDueDate(opt.value)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Label filter */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Labels
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LABEL_COLORS) as LabelColor[]).map((label) => {
                const isActive = filters.labels.includes(label)
                return (
                  <button
                    key={label}
                    onClick={() => handleToggleLabel(label)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        LABEL_COLORS[label],
                        isActive && 'ring-1 ring-white'
                      )}
                    />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
