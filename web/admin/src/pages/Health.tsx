import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/lib/api'
import { formatRelative } from '@/lib/utils'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  RefreshCw,
  Server,
  Plug,
  Globe,
  Radar,
  Bell,
  Clock,
  MapPin,
  CalendarCheck,
  Wifi,
  WifiOff,
} from 'lucide-react'

// ---------- Types ----------

interface ServerHealth {
  status: string
  uptime?: number
  version?: string
  plugins?: Record<string, { enabled: boolean; status?: string }>
}

interface LumaHealth {
  discover: boolean
  official: boolean
  latency_ms: number
}

interface EGatorStats {
  total_events: number
  total_cities: number
  featured: number
  last_scan: string | null
}

interface NotificationStats {
  fc_tokens?: number
  push_tokens?: number
  tg_subscribers?: number
  total_sent?: number
  [key: string]: number | undefined
}

type DotColor = 'green' | 'yellow' | 'red' | 'gray'

// ---------- Helpers ----------

function StatusDot({ color }: { color: DotColor }) {
  const bg: Record<DotColor, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
  }
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${bg[color]}`}
    />
  )
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  return parts.join(' ')
}

function UnavailableNotice({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-yellow-400/80">
      <WifiOff size={14} />
      <span>{message ?? 'Unavailable'}</span>
    </div>
  )
}

// ---------- Component ----------

export default function Health() {
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null)
  const [serverError, setServerError] = useState(false)
  const [lumaHealth, setLumaHealth] = useState<LumaHealth | null>(null)
  const [lumaError, setLumaError] = useState(false)
  const [lumaNotConfigured, setLumaNotConfigured] = useState(false)
  const [egatorStats, setEGatorStats] = useState<EGatorStats | null>(null)
  const [egatorError, setEGatorError] = useState(false)
  const [notifStats, setNotifStats] = useState<NotificationStats | null>(null)
  const [notifError, setNotifError] = useState(false)

  const fetchAll = useCallback(async () => {
    setRefreshing(true)

    // Server health: try admin endpoint first, fallback to public /health
    try {
      const res = await apiGet<ServerHealth>('/api/v1/admin/health')
      setServerHealth(res)
      setServerError(false)
    } catch {
      try {
        const res = await apiGet<{ status: string; uptime: number }>('/health')
        setServerHealth({ status: res.status, uptime: res.uptime })
        setServerError(false)
      } catch {
        setServerHealth(null)
        setServerError(true)
      }
    }

    // Luma health
    try {
      const res = await apiGet<LumaHealth>('/api/v1/health/luma')
      setLumaHealth(res)
      setLumaError(false)
      setLumaNotConfigured(false)
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setLumaNotConfigured(true)
        setLumaError(false)
      } else {
        setLumaError(true)
        setLumaNotConfigured(false)
      }
      setLumaHealth(null)
    }

    // eGator stats
    try {
      const res = await apiGet<{ stats: EGatorStats }>('/api/v1/admin/egator/stats')
      setEGatorStats(res.stats)
      setEGatorError(false)
    } catch {
      setEGatorStats(null)
      setEGatorError(true)
    }

    // Notification stats
    try {
      const res = await apiGet<{ stats: NotificationStats }>('/api/v1/admin/notifications/stats')
      setNotifStats(res.stats)
      setNotifError(false)
    } catch {
      setNotifStats(null)
      setNotifError(true)
    }

    setLastRefresh(new Date())
    setRefreshing(false)
    setLoading(false)
  }, [])

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30_000)
    return () => clearInterval(interval)
  }, [fetchAll])

  // Derived plugin list
  const plugins = serverHealth?.plugins
    ? Object.entries(serverHealth.plugins)
    : null

  const serverStatusColor: DotColor = serverError
    ? 'red'
    : serverHealth?.status === 'ok'
      ? 'green'
      : serverHealth?.status === 'degraded'
        ? 'yellow'
        : 'gray'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">System Health</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Real-time monitoring across all services. Auto-refreshes every 30s.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-muted-foreground)]">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchAll}
            title="Refresh now"
          >
            <RefreshCw
              size={14}
              className={refreshing ? 'animate-spin' : ''}
            />
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-xl h-40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Server Status */}
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-[var(--color-muted-foreground)]" />
              <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Server Status
              </span>
            </div>
            {serverError ? (
              <UnavailableNotice message="Server unreachable" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StatusDot color={serverStatusColor} />
                  <span className="text-sm font-medium capitalize">
                    {serverHealth?.status ?? 'Unknown'}
                  </span>
                </div>
                {serverHealth?.uptime != null && (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                    <Clock size={13} />
                    <span>Uptime: {formatUptime(serverHealth.uptime)}</span>
                  </div>
                )}
                {serverHealth?.version && (
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    Version: {serverHealth.version}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plugins Status */}
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Plug size={16} className="text-[var(--color-muted-foreground)]" />
              <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Plugins
              </span>
            </div>
            {plugins && plugins.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {plugins.map(([name, info]) => {
                  const dotColor: DotColor = info.enabled
                    ? info.status === 'ok' || !info.status
                      ? 'green'
                      : info.status === 'degraded'
                        ? 'yellow'
                        : 'red'
                    : 'gray'
                  return (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2"
                    >
                      <StatusDot color={dotColor} />
                      <span className="text-xs font-medium truncate capitalize">
                        {name}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <UnavailableNotice message="No plugin data available" />
            )}
          </div>

          {/* Luma API Status */}
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-[var(--color-muted-foreground)]" />
              <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Luma API
              </span>
            </div>
            {lumaNotConfigured ? (
              <div className="flex items-center gap-2 text-sm text-yellow-400/80">
                <StatusDot color="yellow" />
                <span>Not configured</span>
              </div>
            ) : lumaError ? (
              <UnavailableNotice />
            ) : lumaHealth ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot color={lumaHealth.discover ? 'green' : 'red'} />
                    <span className="text-sm">Discover</span>
                  </div>
                  <Badge variant={lumaHealth.discover ? 'green' : 'red'}>
                    {lumaHealth.discover ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot color={lumaHealth.official ? 'green' : 'red'} />
                    <span className="text-sm">Official</span>
                  </div>
                  <Badge variant={lumaHealth.official ? 'green' : 'red'}>
                    {lumaHealth.official ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                  <Activity size={13} />
                  <span>Latency: {lumaHealth.latency_ms}ms</span>
                </div>
              </div>
            ) : (
              <UnavailableNotice />
            )}
          </div>

          {/* eGator Status */}
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Radar size={16} className="text-[var(--color-muted-foreground)]" />
              <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                eGator Scanner
              </span>
            </div>
            {egatorError ? (
              <UnavailableNotice />
            ) : egatorStats ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-center">
                    <div className="text-lg font-bold">
                      {egatorStats.total_events.toLocaleString()}
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Events
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-center">
                    <div className="text-lg font-bold">
                      {egatorStats.total_cities.toLocaleString()}
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Cities
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                  <div className="flex items-center gap-1.5">
                    <CalendarCheck size={13} />
                    <span>Featured: {egatorStats.featured}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  <Clock size={12} />
                  <span>
                    Last scan: {formatRelative(egatorStats.last_scan)}
                  </span>
                </div>
              </div>
            ) : (
              <UnavailableNotice />
            )}
          </div>

          {/* Notification Stats */}
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[var(--color-muted-foreground)]" />
              <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Notifications
              </span>
            </div>
            {notifError ? (
              <UnavailableNotice />
            ) : notifStats ? (
              <div className="space-y-2">
                {notifStats.fc_tokens != null && (
                  <NotifRow label="FC Tokens" value={notifStats.fc_tokens} />
                )}
                {notifStats.push_tokens != null && (
                  <NotifRow label="Push Tokens" value={notifStats.push_tokens} />
                )}
                {notifStats.tg_subscribers != null && (
                  <NotifRow label="TG Subscribers" value={notifStats.tg_subscribers} />
                )}
                {notifStats.total_sent != null && (
                  <NotifRow label="Total Sent" value={notifStats.total_sent} />
                )}
                {/* Render any extra keys not explicitly handled */}
                {Object.entries(notifStats)
                  .filter(
                    ([k]) =>
                      !['fc_tokens', 'push_tokens', 'tg_subscribers', 'total_sent'].includes(k),
                  )
                  .map(([key, value]) => (
                    <NotifRow
                      key={key}
                      label={key.replace(/_/g, ' ')}
                      value={value ?? 0}
                    />
                  ))}
              </div>
            ) : (
              <UnavailableNotice />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Sub-components ----------

function NotifRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
      <span className="text-xs capitalize text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <span className="text-sm font-semibold">
        {value.toLocaleString()}
      </span>
    </div>
  )
}
