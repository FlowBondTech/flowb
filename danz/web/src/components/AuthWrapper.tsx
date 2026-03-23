'use client'

import { useAuth } from '@/src/contexts/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthWrapperProps {
  children: React.ReactNode
}

const PUBLIC_PATHS = [
  '/',
  '/danz',
  '/register',
  '/login',
  '/research-box',
  '/depth-anything',
  '/miniapps',
  '/link',
  '/mapp',
]

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/i/') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/ethdenver')
  )
}

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-neon-purple/20 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-neon-purple rounded-full animate-spin" />
        </div>
        <p className="text-text-secondary animate-pulse">Loading...</p>
      </div>
    </div>
  )
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublic = isPublicPath(pathname)

  // Handle redirects for protected routes
  useEffect(() => {
    if (isPublic || isLoading) return

    if (!isAuthenticated) {
      const redirectTo = encodeURIComponent(pathname)
      router.push(`/login?redirectTo=${redirectTo}`)
      return
    }
  }, [isAuthenticated, isLoading, router, pathname, isPublic])

  // Public pages render immediately, no auth gate
  if (isPublic) {
    return <>{children}</>
  }

  // Protected pages: block rendering until auth state is fully resolved
  if (isLoading) {
    return <AuthLoadingScreen />
  }

  // Redirect in progress -- show loading instead of page flash
  if (!isAuthenticated) {
    return <AuthLoadingScreen />
  }

  // Authenticated -- render the page (onboarding banner shown in dashboard if needed)
  return <>{children}</>
}
