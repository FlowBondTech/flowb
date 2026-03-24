import { Menu, Command } from 'lucide-react'

interface TopbarProps {
  title: string
  onMenuClick: () => void
  onCommandClick: () => void
}

export function Topbar({ title, onMenuClick, onCommandClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-6 py-3 bg-[var(--color-background)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/5 md:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onCommandClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] bg-white/[0.04] hover:bg-white/[0.06] border border-[var(--color-border)] transition-colors"
          title="Cmd+K"
        >
          <Command size={12} />
          <span>K</span>
        </button>
      </div>
    </header>
  )
}
