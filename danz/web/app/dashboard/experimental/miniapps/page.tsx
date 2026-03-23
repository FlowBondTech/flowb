'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useAuth } from '@/src/contexts/AuthContext'
import { useExperimental } from '@/src/contexts/ExperimentalContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  FiActivity,
  FiArrowLeft,
  FiAward,
  FiBox,
  FiCalendar,
  FiCode,
  FiGift,
  FiGlobe,
  FiHeart,
  FiMap,
  FiMessageCircle,
  FiMusic,
  FiRadio,
  FiShield,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiVideo,
  FiZap,
} from 'react-icons/fi'

const miniAppIdeas = [
  {
    category: 'Dance & Movement',
    icon: FiActivity,
    apps: [
      {
        name: 'Battle Arena',
        description: 'Real-time dance battles with live voting',
        icon: FiZap,
        status: 'concept',
      },
      {
        name: 'Rhythm Trainer',
        description: 'AI-powered rhythm analysis and training',
        icon: FiMusic,
        status: 'concept',
      },
      {
        name: 'Style Lab',
        description: 'Learn different dance styles with tutorials',
        icon: FiVideo,
        status: 'concept',
      },
      {
        name: 'Freestyle Mode',
        description: 'Free dance sessions with movement tracking',
        icon: FiRadio,
        status: 'partial',
      },
    ],
  },
  {
    category: 'Social & Community',
    icon: FiUsers,
    apps: [
      {
        name: 'Crew Finder',
        description: 'Match with dancers to form crews',
        icon: FiTarget,
        status: 'concept',
      },
      {
        name: 'Dance Map',
        description: 'Discover dancers and events near you',
        icon: FiMap,
        status: 'concept',
      },
      {
        name: 'Mentorship Hub',
        description: 'Connect beginners with experienced dancers',
        icon: FiHeart,
        status: 'concept',
      },
      {
        name: 'Vibe Check',
        description: 'Daily mood check-ins and wellness tracking',
        icon: FiMessageCircle,
        status: 'concept',
      },
    ],
  },
  {
    category: 'Events & Competitions',
    icon: FiCalendar,
    apps: [
      {
        name: 'Cipher Circle',
        description: 'Organize spontaneous street ciphers',
        icon: FiGlobe,
        status: 'concept',
      },
      {
        name: 'Workshop Wizard',
        description: 'Host and discover dance workshops',
        icon: FiAward,
        status: 'partial',
      },
      {
        name: 'Competition Central',
        description: 'Full competition management system',
        icon: FiTrendingUp,
        status: 'concept',
      },
      {
        name: 'Pop-Up Parties',
        description: 'Secret location reveals for exclusive events',
        icon: FiStar,
        status: 'concept',
      },
    ],
  },
  {
    category: 'Fitness & Health',
    icon: FiHeart,
    apps: [
      {
        name: 'Dance Fit',
        description: 'Track calories and fitness through dance',
        icon: FiActivity,
        status: 'partial',
      },
      {
        name: 'Recovery Room',
        description: 'Stretching routines and recovery tracking',
        icon: FiShield,
        status: 'concept',
      },
      {
        name: 'Move Streak',
        description: 'Daily movement challenges with rewards',
        icon: FiZap,
        status: 'partial',
      },
    ],
  },
  {
    category: 'Creator & Economy',
    icon: FiGift,
    apps: [
      {
        name: 'Tip Jar',
        description: 'Support dancers with tips and subscriptions',
        icon: FiGift,
        status: 'concept',
      },
      {
        name: 'Merch Drop',
        description: 'Create and sell crew merchandise',
        icon: FiBox,
        status: 'concept',
      },
    ],
  },
]

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    ready: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'API Ready' },
    partial: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' },
    concept: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Concept' },
  }
  const { bg, text, label } = config[status] || config.concept
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>
  )
}

export default function MiniAppsPage() {
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
            <span className="text-3xl">🧩</span>
            <h1 className="text-3xl font-bold text-text-primary">Mini-Apps Ideas Lab</h1>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
              Concept
            </span>
          </div>
          <p className="text-text-secondary">
            Explore the possibilities of building on the DANZ platform ecosystem.
          </p>
        </div>

        {/* SDK Preview */}
        <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FiCode className="w-5 h-5 text-neon-purple" />
            <h2 className="text-lg font-bold text-text-primary">Developer SDK Preview</h2>
          </div>
          <div className="bg-bg-card rounded-lg border border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-text-muted">mini-app.ts</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-text-secondary">{`import { DanzSDK } from '@danz/sdk'

const danz = new DanzSDK({
  appId: 'your-mini-app-id',
  permissions: ['user.profile', 'events.read', 'points.earn']
})

// Get current user
const user = await danz.user.getMe()

// Award points for activity
await danz.points.award({
  action: 'completed_challenge',
  amount: 50
})`}</code>
            </pre>
          </div>
        </div>

        {/* Mini-App Ideas */}
        <div className="space-y-8">
          {miniAppIdeas.map((category, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-neon-purple to-neon-pink rounded-lg flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">{category.category}</h2>
                <span className="text-text-muted text-sm">({category.apps.length} ideas)</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {category.apps.map((app, appIdx) => (
                  <div
                    key={appIdx}
                    className="bg-bg-card border border-white/5 rounded-xl p-4 hover:border-neon-purple/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-neon-purple/10 rounded-lg flex items-center justify-center">
                        <app.icon className="w-5 h-5 text-neon-purple" />
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                    <h3 className="font-bold text-text-primary mb-1">{app.name}</h3>
                    <p className="text-text-muted text-sm">{app.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 p-8 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 rounded-2xl border border-neon-purple/30 text-center">
          <FiCode className="w-12 h-12 text-neon-purple mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">Want to Build a Mini-App?</h2>
          <p className="text-text-secondary mb-6 max-w-lg mx-auto">
            Our SDK and APIs are being built with developers in mind. Join our community to get
            early access.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://discord.gg/danz"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Join Discord
            </a>
            <Link href="/register" className="btn btn-secondary">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
