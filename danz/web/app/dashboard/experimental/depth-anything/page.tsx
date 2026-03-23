'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import DepthAnythingDashboard from '@/src/components/dashboard/DepthAnythingDashboard'
import { useAuth } from '@/src/contexts/AuthContext'
import { useExperimental } from '@/src/contexts/ExperimentalContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FiArrowLeft, FiZap } from 'react-icons/fi'

export default function DepthAnythingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { experimentalEnabled } = useExperimental()
  const router = useRouter()


  useEffect(() => {
    if (!isLoading && !experimentalEnabled) {
      router.push('/dashboard/settings')
    }
  }, [isLoading, experimentalEnabled, router])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!experimentalEnabled) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard/experimental"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Experimental
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔮</span>
            <h1 className="text-3xl font-bold text-text-primary">Depth Anything</h1>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
              Beta
            </span>
          </div>
          <p className="text-text-secondary">
            AI-powered depth map generation. Upload images or video to create stunning 3D effects.
          </p>
        </div>

        {/* Experimental Warning */}
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 mb-6">
          <FiZap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <p className="text-yellow-400 text-sm">
            This feature requires a running Depth Anything server. Some features may not work
            without proper backend setup.
          </p>
        </div>

        {/* Dashboard Component */}
        <DepthAnythingDashboard />
      </div>
    </DashboardLayout>
  )
}
