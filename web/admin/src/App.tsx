import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { LoginCard } from '@/components/LoginCard'
import { Sidebar, ALL_NAV_ITEMS } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { CommandPalette } from '@/components/layout/CommandPalette'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Events = lazy(() => import('@/pages/Events'))
const Festivals = lazy(() => import('@/pages/Festivals'))
const Booths = lazy(() => import('@/pages/Booths'))
const Venues = lazy(() => import('@/pages/Venues'))
const Users = lazy(() => import('@/pages/Users'))
const Admins = lazy(() => import('@/pages/Admins'))
const Crews = lazy(() => import('@/pages/Crews'))
const Points = lazy(() => import('@/pages/Points'))
const Health = lazy(() => import('@/pages/Health'))
const Agents = lazy(() => import('@/pages/Agents'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const EGator = lazy(() => import('@/pages/EGator'))
const Plugins = lazy(() => import('@/pages/Plugins'))
const Chat = lazy(() => import('@/pages/Chat'))
const Support = lazy(() => import('@/pages/Support'))

const PAGES: Record<string, React.LazyExoticComponent<() => React.ReactElement>> = {
  dashboard: Dashboard, events: Events, festivals: Festivals,
  booths: Booths, venues: Venues,
  users: Users, admins: Admins, crews: Crews, points: Points,
  health: Health, agents: Agents,
  notifications: Notifications, egator: EGator, plugins: Plugins,
  chat: Chat, support: Support,
}

function PageFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-white/5 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white/5 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-white/5 rounded-xl" />
    </div>
  )
}

export function App() {
  const auth = useAuth()
  const [section, setSection] = useState(() => {
    const hash = location.hash.replace('#', '')
    return hash && hash in PAGES ? hash : 'dashboard'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  const navigate = useCallback((id: string) => {
    if (id in PAGES) {
      setSection(id)
      location.hash = id
      setSidebarOpen(false)
    }
  }, [])

  // Hash change listener
  useEffect(() => {
    const handler = () => {
      const hash = location.hash.replace('#', '')
      if (hash && hash in PAGES) setSection(hash)
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    let gPressed = false
    let gTimer: ReturnType<typeof setTimeout>

    const handler = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(v => !v)
        return
      }
      // Escape
      if (e.key === 'Escape') {
        setCmdOpen(false)
        return
      }
      // Don't handle shortcuts if typing in input
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'g') {
        gPressed = true
        clearTimeout(gTimer)
        gTimer = setTimeout(() => { gPressed = false }, 500)
        return
      }
      if (gPressed) {
        gPressed = false
        const map: Record<string, string> = {
          d: 'dashboard', e: 'events', f: 'festivals', u: 'users',
          a: 'admins', c: 'crews', p: 'points', n: 'notifications',
          i: 'chat', s: 'support', h: 'health',
        }
        if (map[e.key]) navigate(map[e.key])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  if (auth.status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (auth.status === 'unauthenticated') {
    return <LoginCard onSendOtp={auth.sendOtp} onLogin={auth.verifyOtp} />
  }

  const currentItem = ALL_NAV_ITEMS.find(i => i.id === section)
  const Page = PAGES[section] || Dashboard

  return (
    <div className="flex min-h-screen">
      <Sidebar
        current={section}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        adminLabel={auth.admin.label}
        onLogout={auth.logout}
      />
      <div className="flex-1 md:ml-60 min-w-0">
        <Topbar
          title={currentItem?.label || 'Dashboard'}
          onMenuClick={() => setSidebarOpen(true)}
          onCommandClick={() => setCmdOpen(true)}
        />
        <main className="p-6 max-w-[1400px]">
          <Suspense fallback={<PageFallback />}>
            <Page />
          </Suspense>
        </main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={navigate} />
    </div>
  )
}
