import {
  LayoutDashboard, CalendarDays, Tent, Users, Shield, UsersRound,
  Star, Bell, Croissant, Plug, Bot, TicketCheck, Activity, Zap,
  Store, MapPin, ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
  icon: ReactNode
  shortcut?: string
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, shortcut: 'g d' },
    ],
  },
  {
    title: 'Content',
    items: [
      { id: 'events', label: 'Events', icon: <CalendarDays size={18} />, shortcut: 'g e' },
      { id: 'festivals', label: 'Festivals', icon: <Tent size={18} />, shortcut: 'g f' },
      { id: 'booths', label: 'Booths', icon: <Store size={18} /> },
      { id: 'venues', label: 'Venues', icon: <MapPin size={18} /> },
    ],
  },
  {
    title: 'People',
    items: [
      { id: 'users', label: 'Users', icon: <Users size={18} />, shortcut: 'g u' },
      { id: 'admins', label: 'Admins', icon: <Shield size={18} />, shortcut: 'g a' },
      { id: 'crews', label: 'Crews', icon: <UsersRound size={18} />, shortcut: 'g c' },
      { id: 'points', label: 'Points', icon: <Star size={18} />, shortcut: 'g p' },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'health', label: 'Health', icon: <Activity size={18} />, shortcut: 'g h' },
      { id: 'agents', label: 'Agents', icon: <Zap size={18} /> },
      { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, shortcut: 'g n' },
      { id: 'egator', label: 'eGator', icon: <Croissant size={18} /> },
      { id: 'plugins', label: 'Plugins', icon: <Plug size={18} /> },
    ],
  },
  {
    title: 'Tools',
    items: [
      { id: 'chat', label: 'AI Chat', icon: <Bot size={18} />, shortcut: 'g i' },
      { id: 'support', label: 'Support', icon: <TicketCheck size={18} />, shortcut: 'g s' },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items)

interface SidebarProps {
  current: string
  onNavigate: (id: string) => void
  open: boolean
  onClose: () => void
  adminLabel?: string
  onLogout: () => void
}

export function Sidebar({ current, onNavigate, open, onClose, adminLabel, onLogout }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 w-60 z-50 flex flex-col',
          'glass border-r border-[var(--color-glass-border)]',
          'transition-transform duration-200',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
          <span className="text-lg font-extrabold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-purple)] bg-clip-text text-transparent">
            FlowB
          </span>
          <span className="text-[0.6rem] font-bold bg-[var(--color-primary)]/15 text-[var(--color-primary)] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Admin
          </span>
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/5 md:hidden"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]/60 px-3 pt-4 pb-1.5">
                {section.title}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); onClose() }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/[0.04]',
                    current === item.id && 'text-[var(--color-foreground)] bg-[var(--color-primary)]/15 [&_svg]:text-[var(--color-primary)]',
                  )}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[0.65rem] text-[var(--color-muted-foreground)]/50 font-mono">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-[var(--color-border)]">
          {adminLabel && (
            <div className="text-xs text-[var(--color-muted-foreground)] mb-2 truncate">
              {adminLabel}
            </div>
          )}
          <div className="text-[0.7rem] text-[var(--color-muted-foreground)]/50 mb-2">
            Cmd+K for quick nav
          </div>
          <button
            onClick={onLogout}
            className="w-full text-left text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
