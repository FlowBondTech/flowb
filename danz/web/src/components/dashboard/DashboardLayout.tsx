'use client'

import {
  NotificationBell,
  NotificationBellCompact,
  NotificationPanel,
} from '@/src/components/notifications'
import InstallBanner from '@/src/components/ui/InstallBanner'
import { useAuth } from '@/src/contexts/AuthContext'
import { useExperimental } from '@/src/contexts/ExperimentalContext'
import { useInstallPrompt } from '@/src/hooks/useInstallPrompt'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  FiAward,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCode,
  FiCreditCard,
  FiGrid,
  FiHeart,
  FiLogOut,
  FiSettings,
  FiShield,
  FiSmartphone,
  FiUser,
  FiUserPlus,
  FiX,
  FiZap,
} from 'react-icons/fi'
import { useGetMyProfileQuery } from '../../generated/graphql'
import MobileBottomNav from './MobileBottomNav'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user, email, isAuthenticated, isLoading, onboardingSkipped } = useAuth()
  const { experimentalEnabled } = useExperimental()
  const { isInstallable, isInstalled, isIOS, promptInstall, isMobile } = useInstallPrompt()

  const { data: profileData, loading: profileLoading } = useGetMyProfileQuery({
    skip: !isAuthenticated || isLoading,
  })

  useEffect(() => {
    if (!isLoading && isAuthenticated && !profileLoading && !profileData?.me?.username && !onboardingSkipped) {
      router.push('/register')
    }
  }, [isLoading, isAuthenticated, profileData, profileLoading, router, onboardingSkipped])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const baseMenuItems = [
    { name: 'Overview', icon: FiGrid, href: '/dashboard' },
    { name: 'Feed', icon: FiHeart, href: '/dashboard/feed' },
    { name: 'Profile', icon: FiUser, href: '/dashboard/profile' },
    { name: 'Events', icon: FiCalendar, href: '/dashboard/my-events' },
    { name: 'Sponsor', icon: FiAward, href: '/dashboard/sponsor' },
    { name: 'Wallet', icon: FiShield, href: '/dashboard/wallet' },
    { name: 'Referrals', icon: FiUserPlus, href: '/dashboard/referrals' },
    { name: 'Subscription', icon: FiCreditCard, href: '/dashboard/subscription' },
    { name: 'Settings', icon: FiSettings, href: '/dashboard/settings' },
  ]

  const devMenuItems = [{ name: 'Dev', icon: FiCode, href: '/dashboard/admin/dev' }]
  const adminMenuItems = [{ name: 'Admin', icon: FiSettings, href: '/dashboard/admin' }]
  const experimentalMenuItems = [{ name: 'Experimental', icon: FiZap, href: '/dashboard/experimental' }]

  const userRole = profileData?.me?.role as string | undefined
  const isDevOrAdmin = userRole === 'dev' || userRole === 'admin'
  const isAdmin = profileData?.me?.is_admin || userRole === 'admin'

  const menuItems = [
    ...baseMenuItems,
    ...(experimentalEnabled ? experimentalMenuItems : []),
    ...(isDevOrAdmin ? devMenuItems : []),
    ...(isAdmin ? adminMenuItems : []),
  ]

  // "More" menu items — everything not in bottom tabs
  const moreMenuItems = menuItems.filter(
    item =>
      !['/dashboard', '/dashboard/my-events', '/dashboard/feed', '/dashboard/profile'].includes(
        item.href,
      ),
  )

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const displayName =
    profileData?.me?.display_name ||
    profileData?.me?.username ||
    email?.split('@')[0] ||
    'User'

  const avatarInitial =
    profileData?.me?.username?.charAt(0).toUpperCase() ||
    email?.charAt(0).toUpperCase() ||
    'U'

  return (
    <div className="h-screen bg-bg-primary flex overflow-hidden">
      <NotificationPanel />

      {/* ═══ Desktop Sidebar ═══ */}
      <div
        className={`hidden lg:flex flex-col bg-bg-secondary border-r border-neon-purple/20 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } h-full`}
      >
        <div className={`shrink-0 border-b border-white/10 ${sidebarOpen ? 'p-6' : 'p-4 py-3'}`}>
          <div className="flex items-center justify-between">
            <Link href="/" className={`flex items-center ${!sidebarOpen && 'justify-center'}`}>
              {sidebarOpen ? (
                <span className="font-display text-2xl font-bold text-text-primary">
                  DANZ<span className="text-neon-purple text-3xl">.</span>NOW
                </span>
              ) : (
                <span className="font-display text-2xl font-bold text-neon-purple">D</span>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              {sidebarOpen ? <FiChevronLeft size={20} /> : <FiChevronRight size={20} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map(item => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'bg-neon-purple/20 text-neon-purple'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  }`}
                >
                  <item.icon size={20} />
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-white/10">
            <NotificationBell collapsed={!sidebarOpen} />
          </div>
        </nav>

        <div className={`shrink-0 mt-auto p-4 border-t border-white/10 ${!sidebarOpen && 'pt-6'}`}>
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            {profileData?.me?.avatar_url ? (
              <img
                src={profileData.me.avatar_url}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-neon-purple/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold shadow-lg">
                {avatarInitial}
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-text-primary text-sm font-medium truncate">{displayName}</p>
                <p className="text-text-secondary text-xs truncate">
                  @{profileData?.me?.username || email || 'user'}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-2 text-text-secondary hover:text-red-400 transition-colors ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <FiLogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* ═══ Mobile Header (compact, app-style) ═══ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-bg-primary/92 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="font-display text-lg font-bold text-text-primary">
            DANZ<span className="text-neon-purple text-xl">.</span>NOW
          </Link>
          <NotificationBellCompact />
        </div>
      </div>

      {/* ═══ Mobile "More" Menu (bottom sheet style) ═══ */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
          onKeyDown={e => e.key === 'Escape' && setMobileMenuOpen(false)}
          role="presentation"
          tabIndex={-1}
          aria-hidden="true"
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-bg-secondary rounded-t-2xl max-h-[80vh] overflow-y-auto animate-slide-up pb-[env(safe-area-inset-bottom,0px)]"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role="presentation"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
              {profileData?.me?.avatar_url ? (
                <img
                  src={profileData.me.avatar_url}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-neon-purple/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold">
                  {avatarInitial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium truncate">{displayName}</p>
                <p className="text-text-secondary text-xs truncate">
                  @{profileData?.me?.username || 'user'}
                </p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-text-secondary hover:text-text-primary"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Menu items */}
            <nav className="px-3 py-2">
              <ul className="space-y-0.5">
                {moreMenuItems.map(item => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        pathname === item.href
                          ? 'bg-neon-purple/15 text-neon-purple'
                          : 'text-text-secondary active:bg-white/5'
                      }`}
                    >
                      <item.icon size={20} />
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Bottom actions */}
            <div className="px-3 py-3 border-t border-white/10 space-y-1">
              {isMobile && isInstallable && !isInstalled && (
                <button
                  onClick={() => {
                    if (isIOS) {
                      alert('To install: Tap the Share button, then "Add to Home Screen"')
                    } else {
                      promptInstall()
                    }
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-neon-purple active:bg-neon-purple/10 transition-colors"
                >
                  <FiSmartphone size={20} />
                  <span className="text-sm font-medium">Add to Home Screen</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 active:bg-red-500/10 transition-colors"
              >
                <FiLogOut size={20} />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main className="flex-1 px-4 pb-20 sm:px-6 lg:px-8 lg:pb-8 pt-14 lg:pt-8 overflow-auto">
          {children}
        </main>
      </div>

      {/* ═══ Mobile Bottom Nav ═══ */}
      <MobileBottomNav onMorePress={() => setMobileMenuOpen(true)} />

      <InstallBanner />
    </div>
  )
}
