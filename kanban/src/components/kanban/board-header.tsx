import { useState, useCallback, useMemo } from 'react'
import {
  LayoutGrid,
  List,
  Calendar,
  Sun,
  Moon,
  Bell,
  Search,
  X,
  LogOut,
} from 'lucide-react'
import { isPast, isToday, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthContext } from '@/contexts/auth-context'
import type { KanbanBoard, KanbanTask, KanbanNotification } from '@/types/kanban'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface BoardHeaderProps {
  boards: KanbanBoard[]
  currentBoard: KanbanBoard
  tasks: KanbanTask[]
  notifications: KanbanNotification[]
  onSelectBoard: (board: KanbanBoard) => void
  onSearch: (query: string) => void
  onToggleTheme: () => void
  onNotificationsClick: () => void
  isDarkMode: boolean
}

// ─── View type (board active, others are placeholders) ─────────────────────────

type ViewMode = 'board' | 'list' | 'calendar'

// ─── Component ─────────────────────────────────────────────────────────────────

export function BoardHeader({
  boards,
  currentBoard,
  tasks,
  notifications,
  onSelectBoard,
  onSearch,
  onToggleTheme,
  onNotificationsClick,
  isDarkMode,
}: BoardHeaderProps) {
  const { user, logout } = useAuthContext()
  const [activeView] = useState<ViewMode>('board')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.column_name === 'done').length
    const overdue = tasks.filter(
      (t) =>
        t.due_date &&
        isPast(parseISO(t.due_date)) &&
        !isToday(parseISO(t.due_date)) &&
        t.column_name !== 'done'
    ).length
    return { total, done, overdue }
  }, [tasks])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      onSearch(value)
    },
    [onSearch]
  )

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    onSearch('')
  }, [onSearch])

  return (
    <header className="border-b bg-card">
      {/* Top row: board name + actions */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: board icon + name */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl" role="img" aria-label="Board icon">
            {currentBoard.icon}
          </span>
          <h1 className="text-lg font-bold text-foreground truncate">
            {currentBoard.name}
          </h1>

          {/* Stats badges — hidden on small screens */}
          <div className="hidden sm:flex items-center gap-2 ml-2">
            <Badge variant="gray" className="text-[10px]">
              {stats.total} tasks
            </Badge>
            <Badge variant="green" className="text-[10px]">
              {stats.done} done
            </Badge>
            {stats.overdue > 0 && (
              <Badge variant="red" className="text-[10px]">
                {stats.overdue} overdue
              </Badge>
            )}
          </div>
        </div>

        {/* Right: view switcher + search + theme + notifications */}
        <div className="flex items-center gap-1">
          {/* View switcher */}
          <div className="hidden sm:flex items-center gap-0.5 rounded-md border bg-muted p-0.5">
            {([
              { mode: 'board' as ViewMode, icon: LayoutGrid, label: 'Board' },
              { mode: 'list' as ViewMode, icon: List, label: 'List' },
              { mode: 'calendar' as ViewMode, icon: Calendar, label: 'Calendar' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                disabled={mode !== 'board'}
                title={mode === 'board' ? label : `${label} (coming soon)`}
                className={cn(
                  'rounded p-1.5 transition-colors',
                  activeView === mode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground',
                  mode !== 'board' && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* Search toggle (mobile) / inline (desktop) */}
          {searchOpen ? (
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search..."
                className={cn(
                  'h-8 w-40 rounded-md border bg-background pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground',
                  'outline-none focus:ring-2 focus:ring-ring',
                  'sm:w-56'
                )}
              />
              <button
                onClick={handleCloseSearch}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="h-8 w-8"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className="h-8 w-8"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationsClick}
            className="relative h-8 w-8"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* User avatar + logout */}
          {user && (
            <div className="ml-1 flex items-center gap-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-7 w-7"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Board tabs — horizontal scroll for multiple boards */}
      {boards.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto px-4 pb-2 scrollbar-none">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => onSelectBoard(board)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                board.id === currentBoard.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span className="text-sm">{board.icon}</span>
              {board.name}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
