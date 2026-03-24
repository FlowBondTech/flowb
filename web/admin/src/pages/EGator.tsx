import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { formatDate, formatRelative } from '@/lib/utils'
import { StatCard } from '@/components/StatCard'
import { DataTable, type Column } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Radar,
  Trash2,
  MapPin,
  CalendarCheck,
  Star,
  Clock,
  Plus,
  X,
  Search,
  Loader2,
  EyeOff,
  Sparkles,
} from 'lucide-react'

// ---------- Types ----------

interface EGatorStats {
  totals: {
    active: number
    stale: number
    featured: number
    free: number
    total: number
  }
  bySource: Record<string, { count: number; avgQuality: number }>
  byCity: Record<string, number>
  quality: {
    avgScore: number
    pctImage: number
    pctDescription: number
    pctVenue: number
  }
  freshness: {
    staleCount: number
    lastScanTime: string | null
    createdToday: number
    createdThisWeek: number
  }
}

interface City {
  city: string
  enabled: boolean
}

interface EGatorEvent {
  id: string
  title: string
  city: string
  date: string
  featured: boolean
  hidden: boolean
  [key: string]: unknown
}

type EventFilter = 'all' | 'featured' | 'hidden'

// ---------- Component ----------

export default function EGator() {
  // Stats
  const [stats, setStats] = useState<EGatorStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Actions
  const [scanning, setScanning] = useState(false)
  const [purging, setPurging] = useState(false)

  // Cities
  const [cities, setCities] = useState<City[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [newCity, setNewCity] = useState('')
  const [addingCity, setAddingCity] = useState(false)

  // Events
  const [events, setEvents] = useState<EGatorEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<EventFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Error
  const [error, setError] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // ---------- Fetchers ----------

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await apiGet<EGatorStats>('/api/v1/admin/egator/stats')
      setStats(res)
    } catch {
      // Non-critical, keep null
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchCities = useCallback(async () => {
    setCitiesLoading(true)
    try {
      const res = await apiGet<{ cities: City[] }>('/api/v1/admin/egator/cities')
      setCities(res.cities)
    } catch {
      setCities([])
    } finally {
      setCitiesLoading(false)
    }
  }, [])

  const fetchEvents = useCallback(async (q: string, f: EventFilter) => {
    setEventsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '30' })
      if (q) params.set('q', q)
      if (f !== 'all') params.set('filter', f)
      const res = await apiGet<{ events: EGatorEvent[] }>(`/api/v1/admin/egator/events?${params}`)
      setEvents(res.events)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchStats()
    fetchCities()
  }, [fetchStats, fetchCities])

  // Refetch events on filter/search change
  useEffect(() => {
    fetchEvents(debouncedSearch, filter)
  }, [debouncedSearch, filter, fetchEvents])

  // ---------- Action handlers ----------

  async function handleScan() {
    setScanning(true)
    try {
      const res = await apiPost<{ newEvents: number }>('/api/v1/admin/egator/scan')
      toast.success(`Scan complete: ${res.newEvents} new event${res.newEvents === 1 ? '' : 's'} found`)
      fetchStats()
      fetchEvents(debouncedSearch, filter)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  async function handlePurge() {
    if (!window.confirm('Are you sure you want to purge stale events? This cannot be undone.')) return
    setPurging(true)
    try {
      const res = await apiDelete<{ deleted: number }>('/api/v1/admin/egator/events/stale')
      toast.success(`Purged ${res.deleted} stale event${res.deleted === 1 ? '' : 's'}`)
      fetchStats()
      fetchEvents(debouncedSearch, filter)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Purge failed')
    } finally {
      setPurging(false)
    }
  }

  // ---------- City handlers ----------

  async function handleAddCity(e: React.FormEvent) {
    e.preventDefault()
    const city = newCity.trim()
    if (!city) return
    setAddingCity(true)
    try {
      await apiPost('/api/v1/admin/egator/cities', { city })
      toast.success(`Added ${city}`)
      setNewCity('')
      fetchCities()
      fetchStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add city')
    } finally {
      setAddingCity(false)
    }
  }

  async function handleToggleCity(city: string) {
    try {
      await apiPost(`/api/v1/admin/egator/cities/${encodeURIComponent(city)}/toggle`)
      setCities(prev => prev.map(c => c.city === city ? { ...c, enabled: !c.enabled } : c))
      toast.success(`Toggled ${city}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle city')
    }
  }

  async function handleRemoveCity(city: string) {
    if (!window.confirm(`Remove ${city} from tracked cities?`)) return
    try {
      await apiDelete(`/api/v1/admin/egator/cities/${encodeURIComponent(city)}`)
      setCities(prev => prev.filter(c => c.city !== city))
      toast.success(`Removed ${city}`)
      fetchStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove city')
    }
  }

  // ---------- Event handlers ----------

  async function handleToggleFeature(event: EGatorEvent) {
    const newVal = !event.featured
    try {
      await apiPost(`/api/v1/admin/egator/events/${event.id}/feature`, { featured: newVal })
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, featured: newVal } : e))
      toast.success(newVal ? 'Event featured' : 'Event unfeatured')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  async function handleToggleHide(event: EGatorEvent) {
    const newVal = !event.hidden
    try {
      await apiPost(`/api/v1/admin/egator/events/${event.id}/hide`, { hidden: newVal })
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, hidden: newVal } : e))
      toast.success(newVal ? 'Event hidden' : 'Event visible')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  // ---------- Bulk actions ----------

  async function handleBulkAction(action: 'feature' | 'hide' | 'delete') {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)

    if (action === 'delete') {
      if (!window.confirm(`Delete ${ids.length} event${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return
    }

    try {
      await apiPost('/api/v1/admin/egator/events/bulk', { action, ids })
      toast.success(`Bulk ${action}: ${ids.length} event${ids.length === 1 ? '' : 's'}`)
      setSelectedIds(new Set())
      fetchEvents(debouncedSearch, filter)
      fetchStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Bulk ${action} failed`)
    }
  }

  // ---------- Table columns ----------

  const columns: Column<EGatorEvent>[] = useMemo(() => [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (row) => (
        <span className="font-medium line-clamp-1" title={row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: 'city',
      label: 'City',
      sortable: true,
      render: (row) => (
        <span className="flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
          <MapPin size={13} />
          {row.city}
        </span>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)] text-xs">
          {formatDate(row.date)}
        </span>
      ),
    },
    {
      key: 'featured',
      label: 'Featured',
      className: 'w-24',
      render: (row) => (
        <div onClick={e => e.stopPropagation()}>
          <Switch
            checked={row.featured}
            onCheckedChange={() => handleToggleFeature(row)}
            aria-label={`Feature ${row.title}`}
          />
        </div>
      ),
    },
    {
      key: 'hidden',
      label: 'Hidden',
      className: 'w-24',
      render: (row) => (
        <div onClick={e => e.stopPropagation()}>
          <Switch
            checked={row.hidden}
            onCheckedChange={() => handleToggleHide(row)}
            aria-label={`Hide ${row.title}`}
          />
        </div>
      ),
    },
  ], [])

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-xl h-28 animate-pulse" />
          ))
        ) : (
          <>
            <StatCard
              title="Total Events"
              value={stats?.totals?.total ?? 0}
              icon={<CalendarCheck size={18} />}
              sub={`${stats?.totals?.active ?? 0} active, ${stats?.totals?.stale ?? 0} stale`}
            />
            <StatCard
              title="Cities"
              value={stats?.byCity ? Object.keys(stats.byCity).length : 0}
              icon={<MapPin size={18} />}
              color="text-blue-400"
            />
            <StatCard
              title="Featured"
              value={stats?.totals?.featured ?? 0}
              icon={<Star size={18} />}
              color="text-yellow-400"
              sub={`${stats?.totals?.free ?? 0} free events`}
            />
            <StatCard
              title="Last Scan"
              value={stats?.freshness?.lastScanTime ? formatRelative(stats.freshness.lastScanTime) : 'Never'}
              icon={<Clock size={18} />}
              color="text-[var(--color-muted-foreground)]"
              sub={`${stats?.freshness?.createdToday ?? 0} today, ${stats?.freshness?.createdThisWeek ?? 0} this week`}
            />
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleScan} disabled={scanning}>
          {scanning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Radar size={14} />
              Trigger Scan
            </>
          )}
        </Button>
        <Button variant="destructive" onClick={handlePurge} disabled={purging}>
          {purging ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Purging...
            </>
          ) : (
            <>
              <Trash2 size={14} />
              Purge Stale
            </>
          )}
        </Button>
      </div>

      {/* Cities management */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Tracked Cities
          </h2>
        </div>

        {citiesLoading ? (
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-md bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {cities.map((c) => (
                <div
                  key={c.city}
                  className="group flex items-center gap-1.5 glass rounded-lg px-3 py-1.5 text-sm transition-colors"
                >
                  <button
                    onClick={() => handleToggleCity(c.city)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      c.enabled ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                    title={c.enabled ? 'Disable' : 'Enable'}
                    aria-label={`Toggle ${c.city}`}
                  />
                  <span className={c.enabled ? '' : 'text-[var(--color-muted-foreground)] line-through'}>
                    {c.city}
                  </span>
                  <button
                    onClick={() => handleRemoveCity(c.city)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-muted-foreground)] hover:text-red-400 transition-all ml-0.5"
                    title={`Remove ${c.city}`}
                    aria-label={`Remove ${c.city}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              {cities.length === 0 && (
                <span className="text-sm text-[var(--color-muted-foreground)]">No cities tracked yet</span>
              )}
            </div>

            <form onSubmit={handleAddCity} className="flex items-center gap-2 max-w-xs">
              <Input
                placeholder="Add city..."
                value={newCity}
                onChange={e => setNewCity(e.target.value)}
                disabled={addingCity}
              />
              <Button type="submit" size="sm" disabled={addingCity || !newCity.trim()}>
                {addingCity ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Events table */}
      <div>
        {error && (
          <div className="glass rounded-xl p-4 text-center text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        <DataTable<EGatorEvent>
          columns={columns}
          data={events}
          loading={eventsLoading}
          emptyText="No events found"
          rowKey={(row) => row.id}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          toolbar={
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <Input
                  placeholder="Search events..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-[var(--color-glass-border)] p-0.5">
                {(['all', 'featured', 'hidden'] as EventFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                      filter === f
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/5'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          }
          bulkActions={
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('feature')}
              >
                <Sparkles size={13} />
                Feature
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('hide')}
              >
                <EyeOff size={13} />
                Hide
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction('delete')}
              >
                <Trash2 size={13} />
                Delete
              </Button>
            </>
          }
        />
      </div>
    </div>
  )
}
