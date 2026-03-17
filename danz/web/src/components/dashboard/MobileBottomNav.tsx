'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FiCalendar,
  FiGrid,
  FiHeart,
  FiMoreHorizontal,
  FiUser,
} from 'react-icons/fi'

const tabs = [
  { name: 'Home', icon: FiGrid, href: '/dashboard' },
  { name: 'Events', icon: FiCalendar, href: '/dashboard/my-events' },
  { name: 'Feed', icon: FiHeart, href: '/dashboard/feed' },
  { name: 'Profile', icon: FiUser, href: '/dashboard/profile' },
]

interface MobileBottomNavProps {
  onMorePress: () => void
}

export default function MobileBottomNav({ onMorePress }: MobileBottomNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-primary/92 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex justify-around items-center h-14">
        {tabs.map(tab => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? 'text-neon-purple' : 'text-text-secondary'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-neon-purple rounded-b" />
              )}
              <tab.icon size={20} />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onMorePress}
          className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-text-secondary transition-colors"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <FiMoreHorizontal size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  )
}
