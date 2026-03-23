'use client'

import { memo } from 'react'

type Tab = 'home' | 'dance' | 'party' | 'wallet' | 'profile'

interface NavigationProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

// Memoized navigation for performance
export const Navigation = memo(function Navigation({
  activeTab,
  onTabChange,
}: NavigationProps) {
  const tabs: { id: Tab; icon: string; label: string; emoji?: string }[] = [
    { id: 'home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home' },
    { id: 'dance', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', label: 'Dance' },
    { id: 'party', icon: '', label: 'Party', emoji: '🎊' },
    { id: 'wallet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Wallet' },
    { id: 'profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Profile' },
  ]

  return (
    <nav className="flex items-center justify-around py-2 px-4 bg-bg-secondary/95 backdrop-blur-md border-t border-white/10 safe-area-inset-bottom">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
            activeTab === tab.id
              ? 'text-neon-pink bg-neon-pink/10'
              : 'text-text-muted hover:text-white'
          }`}
        >
          {tab.emoji ? (
            <span className="text-xl">{tab.emoji}</span>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={tab.icon}
              />
            </svg>
          )}
          <span className="text-xs mt-1">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
})
