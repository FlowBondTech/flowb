import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import {
  Users,
  UsersRound,
  CalendarCheck,
  MapPin,
  Trophy,
  Radar,
  Bell,
  Award,
  Activity,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ---------- Types ----------

interface AdminStats {
  totalUsers: number
  totalCrews: number
  totalRsvps: number
  totalCheckins: number
  topPoints: number
}

interface HealthStatus {
  server?: 'ok' | 'degraded' | 'down'
  plugins?: 'ok' | 'degraded' | 'down'
  luma?: 'ok' | 'degraded' | 'down'
}

// ---------- Mock sparkline data ----------

function generateMockTrend(days: number, base: number, variance: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.max(0, Math.round(base + (Math.random() - 0.4) * variance)),
    }
  })
}

const eventsPerDay = generateMockTrend(14, 8, 12)
const usersPerWeek = generateMockTrend(8, 35, 30)

// ---------- Helpers ----------

const STATUS_COLOR: Record<string, string> = {
  ok: 'bg-green-500',
  degraded: 'bg-yellow-500',
  down: 'bg-red-500',
  unknown: 'bg-gray-500',
}

function HealthDot({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLOR[status] ?? STATUS_COLOR.unknown}`}
      />
      <span className="text-xs text-[var(--color-muted-foreground)] capitalize">
        {label}
      </span>
    </div>
  )
}

// ---------- Chart tooltip ----------

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <div className="text-[var(--color-muted-foreground)]">{label}</div>
      <div className="font-bold">{payload[0].value}</div>
    </div>
  )
}

// ---------- Component ----------

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await apiGet<{ stats: AdminStats }>('/api/v1/admin/stats')
        if (!cancelled) setStats(res.stats)
      } catch {
        // keep stats null on error
      }

      try {
        const res = await apiGet<HealthStatus>('/api/v1/admin/health')
        if (!cancelled) setHealth(res)
      } catch {
        // health endpoint may 404 -- handle gracefully
        if (!cancelled) setHealth({ server: 'unknown' as 'ok' })
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-xl h-28 animate-pulse"
            />
          ))
        ) : (
          <>
            <StatCard
              title="Total Users"
              value={stats?.totalUsers ?? 0}
              icon={<Users size={18} />}
              sub={`${formatNumber(stats?.totalUsers ?? 0)} registered`}
            />
            <StatCard
              title="Total Crews"
              value={stats?.totalCrews ?? 0}
              icon={<UsersRound size={18} />}
            />
            <StatCard
              title="RSVPs"
              value={stats?.totalRsvps ?? 0}
              icon={<CalendarCheck size={18} />}
            />
            <StatCard
              title="Check-ins"
              value={stats?.totalCheckins ?? 0}
              icon={<MapPin size={18} />}
            />
            <StatCard
              title="Top Points"
              value={stats?.topPoints ?? 0}
              icon={<Trophy size={18} />}
              color="text-yellow-400"
            />
          </>
        )}
      </div>

      {/* Health status row */}
      <div className="glass rounded-xl px-5 py-3 flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          <Activity size={14} />
          Health
        </div>
        <HealthDot label="Server" status={health?.server ?? 'unknown'} />
        <HealthDot label="Plugins" status={health?.plugins ?? 'unknown'} />
        <HealthDot label="Luma" status={health?.luma ?? 'unknown'} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            location.hash = 'events'
          }}
        >
          <Radar size={14} />
          Scan Events
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            location.hash = 'notifications'
          }}
        >
          <Bell size={14} />
          Send Notification
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            location.hash = 'points'
          }}
        >
          <Award size={14} />
          Award Points
        </Button>
      </div>

      {/* Sparkline charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Events per day */}
        <div className="glass rounded-xl p-5">
          <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">
            Events per Day (14d)
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eventsPerDay}>
                <defs>
                  <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#8888a0' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#8888a0' }}
                  width={30}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#eventsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Users per week */}
        <div className="glass rounded-xl p-5">
          <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">
            New Users per Week (8w)
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usersPerWeek}>
                <defs>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#8888a0' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#8888a0' }}
                  width={30}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#usersGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
