'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useAuth } from '@/src/contexts/AuthContext'
import { useExperimental } from '@/src/contexts/ExperimentalContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FiAlertTriangle, FiArrowRight, FiBox, FiZap } from 'react-icons/fi'

const experimentalFeatures = [
  {
    id: 'depth-anything',
    name: 'Depth Anything',
    description:
      'AI-powered depth map generation from images. Create stunning 3D effects from 2D photos.',
    icon: '🔮',
    href: '/dashboard/experimental/depth-anything',
    status: 'beta',
    tags: ['AI', 'Computer Vision', 'Image Processing'],
  },
  {
    id: 'miniapps',
    name: 'Mini-Apps Ideas Lab',
    description:
      'Explore concepts for the DANZ mini-apps ecosystem. SDK preview and architecture diagrams.',
    icon: '🧩',
    href: '/dashboard/experimental/miniapps',
    status: 'concept',
    tags: ['SDK', 'Platform', 'Ecosystem'],
  },
]

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    beta: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Beta' },
    alpha: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Alpha' },
    concept: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Concept' },
    stable: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Stable' },
  }

  const { bg, text, label } = config[status] || config.concept

  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>
}

export default function ExperimentalPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { experimentalEnabled } = useExperimental()
  const router = useRouter()


  // Redirect if experimental features not enabled
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
            <FiZap className="text-yellow-500" />
            Experimental Features
          </h1>
          <p className="text-text-secondary mt-2">Try out features that are still in development</p>
        </div>

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-8">
          <FiAlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Heads up!</p>
            <p className="text-text-muted text-sm mt-1">
              These features are experimental and may be unstable, incomplete, or change without
              notice. Use at your own risk and provide feedback to help us improve.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-4">
          {experimentalFeatures.map(feature => (
            <Link
              key={feature.id}
              href={feature.href}
              className="group block bg-bg-secondary rounded-xl border border-white/5 p-6 hover:border-yellow-500/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-text-primary group-hover:text-yellow-400 transition-colors">
                      {feature.name}
                    </h3>
                    <StatusBadge status={feature.status} />
                  </div>
                  <p className="text-text-secondary text-sm mb-3">{feature.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-white/5 rounded text-xs text-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <FiArrowRight className="w-5 h-5 text-text-muted group-hover:text-yellow-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="mt-8 p-6 bg-bg-card/50 rounded-xl border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <FiBox className="w-5 h-5 text-text-muted" />
            <h3 className="text-lg font-bold text-text-primary">More Coming Soon</h3>
          </div>
          <p className="text-text-muted text-sm">
            We're always working on new experimental features. Check back regularly or follow our
            updates to see what's next.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
