import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { DataTable, type Column } from '@/components/DataTable'
import { SlideOver } from '@/components/SlideOver'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Search,
  RefreshCw,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

// ---------- Types ----------

interface EventRow {
  id: string
  title: string
  start_time: string | null
  end_time: string | null
  city: string | null
  source: string | null
  featured: boolean
  hidden: boolean
  description: string | null
  image_url: string | null
  venue: string | null
  url: string | null
}

const PAGE_SIZE = 30

const SOURCE_BADGE_VARIANT: Record<string, 'blue' | 'purple' | 'green' | 'orange' | 'gray'> = {
  luma: 'purple',
  egator: 'blue',
  manual: 'green',
  cuflow: 'orange',
}

// ---------- Component ----------

export default function Events() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [city, setCity] = useState('')
  const [fromDate, setFromDate] = useState('')

  // Debounced search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  // SlideOver
  const [selected, setSelected] = useState<EventRow | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ---------- Fetch ----------

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(offset))
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (source !== 'all') params.set('source', source)
      if (fromDate) params.set('from', fromDate)
      if (city) params.set('city', city)

      const res = await apiGet<{ events: EventRow[]; total: number }>(
        `/api/v1/admin/events?${params}`,
      )
      setEvents(res.events)
      setTotal(res.total)
    } catch (err) {
      toast.error('Failed to load events')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [offset, debouncedSearch, source, fromDate, city])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0)
    setSelectedIds(new Set())
  }, [debouncedSearch, source, fromDate, city])

  // ---------- Actions ----------

  async function toggleFeatured(id: string, featured: boolean) {
    try {
      await apiPost(`/api/v1/admin/events/${id}/feature`, { featured })
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, featured } : e)),
      )
      toast.success(featured ? 'Event featured' : 'Event unfeatured')
    } catch {
      toast.error('Failed to update')
    }
  }

  async function toggleHidden(id: string, hidden: boolean) {
    try {
      await apiPost(`/api/v1/admin/events/${id}/hide`, { hidden })
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, hidden } : e)),
      )
      toast.success(hidden ? 'Event hidden' : 'Event visible')
    } catch {
      toast.error('Failed to update')
    }
  }

  async function bulkFeature(featured: boolean) {
    const ids = Array.from(selectedIds)
    let success = 0
    for (const id of ids) {
      try {
        await apiPost(`/api/v1/admin/events/${id}/feature`, { featured })
        success++
      } catch {
        // continue
      }
    }
    toast.success(`${featured ? 'Featured' : 'Unfeatured'} ${success} events`)
    setSelectedIds(new Set())
    fetchEvents()
  }

  async function bulkHide(hidden: boolean) {
    const ids = Array.from(selectedIds)
    let success = 0
    for (const id of ids) {
      try {
        await apiPost(`/api/v1/admin/events/${id}/hide`, { hidden })
        success++
      } catch {
        // continue
      }
    }
    toast.success(`${hidden ? 'Hidden' : 'Revealed'} ${success} events`)
    setSelectedIds(new Set())
    fetchEvents()
  }

  async function bulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} events? This cannot be undone.`)) return
    const ids = Array.from(selectedIds)
    let success = 0
    for (const id of ids) {
      try {
        await apiDelete(`/api/v1/admin/events/${id}`)
        success++
      } catch {
        // continue
      }
    }
    toast.success(`Deleted ${success} events`)
    setSelectedIds(new Set())
    fetchEvents()
  }

  // ---------- Pagination ----------

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // ---------- Columns ----------

  const columns: Column<EventRow>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        className: 'max-w-[280px]',
        render: (row) => (
          <span className="line-clamp-1 font-medium">{row.title}</span>
        ),
      },
      {
        key: 'start_time',
        label: 'Date',
        sortable: true,
        render: (row) => (
          <span className="text-[var(--color-muted-foreground)] whitespace-nowrap">
            {formatDateTime(row.start_time)}
          </span>
        ),
      },
      {
        key: 'city',
        label: 'City',
        sortable: true,
        render: (row) => row.city ?? '---',
      },
      {
        key: 'source',
        label: 'Source',
        render: (row) => {
          const src = row.source ?? 'unknown'
          return (
            <Badge variant={SOURCE_BADGE_VARIANT[src] ?? 'gray'}>{src}</Badge>
          )
        },
      },
      {
        key: 'featured',
        label: 'Featured',
        render: (row) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFeatured(row.id, !row.featured)
            }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title={row.featured ? 'Unfeature' : 'Feature'}
          >
            {row.featured ? (
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
            ) : (
              <StarOff size={16} className="text-[var(--color-muted-foreground)]" />
            )}
          </button>
        ),
      },
      {
        key: 'hidden',
        label: 'Hidden',
        render: (row) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleHidden(row.id, !row.hidden)
            }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title={row.hidden ? 'Show' : 'Hide'}
          >
            {row.hidden ? (
              <EyeOff size={16} className="text-red-400" />
            ) : (
              <Eye size={16} className="text-[var(--color-muted-foreground)]" />
            )}
          </button>
        ),
      },
    ],
    [],
  )

  // ---------- Toolbar ----------

  const toolbar = (
    <>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
        />
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 w-56"
        />
      </div>
      <select
        value={source}
        onChange={(e) => setSource(e.target.value)}
        className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="all">All sources</option>
        <option value="luma">Luma</option>
        <option value="egator">eGator</option>
        <option value="manual">Manual</option>
      </select>
      <Input
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="w-32"
      />
      <Input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="w-40"
      />
      <Button variant="ghost" size="icon" onClick={fetchEvents} title="Refresh">
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      </Button>
    </>
  )

  // ---------- Bulk actions ----------

  const bulkActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => bulkFeature(true)}>
        <Star size={12} /> Feature
      </Button>
      <Button variant="outline" size="sm" onClick={() => bulkFeature(false)}>
        <StarOff size={12} /> Unfeature
      </Button>
      <Button variant="outline" size="sm" onClick={() => bulkHide(true)}>
        <EyeOff size={12} /> Hide
      </Button>
      <Button variant="outline" size="sm" onClick={() => bulkHide(false)}>
        <Eye size={12} /> Show
      </Button>
      <Button variant="destructive" size="sm" onClick={bulkDelete}>
        <Trash2 size={12} /> Delete
      </Button>
    </>
  )

  // ---------- Render ----------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Events</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Manage events, toggle visibility and featured status.
        </p>
      </div>

      <DataTable<EventRow>
        columns={columns}
        data={events}
        loading={loading}
        serverPagination
        toolbar={toolbar}
        onRowClick={(row) => setSelected(row)}
        emptyText="No events found"
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        rowKey={(row) => row.id}
        bulkActions={bulkActions}
      />

      {/* Server-side pagination */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
        >
          <ChevronLeft size={14} />
          Prev
        </Button>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={offset + PAGE_SIZE >= total}
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
        >
          Next
          <ChevronRight size={14} />
        </Button>
      </div>

      {/* SlideOver detail */}
      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Event Details'}
        wide
      >
        {selected && (
          <div className="space-y-5">
            {selected.image_url && (
              <img
                src={selected.image_url}
                alt={selected.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}

            <div className="space-y-3">
              <DetailRow label="Title" value={selected.title} />
              <DetailRow label="Start" value={formatDateTime(selected.start_time)} />
              <DetailRow label="End" value={formatDateTime(selected.end_time)} />
              <DetailRow label="Venue" value={selected.venue} />
              <DetailRow label="City" value={selected.city} />
              <DetailRow
                label="Source"
                value={
                  <Badge
                    variant={
                      SOURCE_BADGE_VARIANT[selected.source ?? ''] ?? 'gray'
                    }
                  >
                    {selected.source ?? 'unknown'}
                  </Badge>
                }
              />
              <DetailRow
                label="Featured"
                value={selected.featured ? 'Yes' : 'No'}
              />
              <DetailRow
                label="Hidden"
                value={selected.hidden ? 'Yes' : 'No'}
              />
              {selected.url && (
                <DetailRow
                  label="URL"
                  value={
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                    >
                      Open <ExternalLink size={12} />
                    </a>
                  }
                />
              )}
            </div>

            {selected.description && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-1">
                  Description
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed whitespace-pre-wrap">
                  {selected.description}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toggleFeatured(selected.id, !selected.featured)
                  setSelected({ ...selected, featured: !selected.featured })
                }}
              >
                {selected.featured ? (
                  <><StarOff size={14} /> Unfeature</>
                ) : (
                  <><Star size={14} /> Feature</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toggleHidden(selected.id, !selected.hidden)
                  setSelected({ ...selected, hidden: !selected.hidden })
                }}
              >
                {selected.hidden ? (
                  <><Eye size={14} /> Show</>
                ) : (
                  <><EyeOff size={14} /> Hide</>
                )}
              </Button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  )
}

// ---------- Helper ----------

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] w-20 shrink-0 pt-0.5">
        {label}
      </div>
      <div className="text-sm">{value ?? '---'}</div>
    </div>
  )
}
