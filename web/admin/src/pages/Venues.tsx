import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { DataTable, type Column } from '@/components/DataTable'
import { SlideOver } from '@/components/SlideOver'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, RefreshCw, MapPin, Crown, ExternalLink } from 'lucide-react'

// ---------- Types (match raw DB rows from GET /api/v1/admin/venues) ----------

const VENUE_TYPES = ['conference', 'bar', 'restaurant', 'coworking', 'outdoor', 'hotel', 'other'] as const
type VenueType = (typeof VENUE_TYPES)[number]

interface Venue {
  id: string
  name: string
  slug: string
  short_name: string | null
  address: string | null
  city: string | null
  state: string | null
  venue_type: VenueType | null
  capacity: number | null
  website_url: string | null
  image_url: string | null
  is_main_venue: boolean
  active: boolean
}

interface VenueForm {
  name: string
  venue_type: VenueType
  capacity: number | ''
  city: string
  state: string
  address: string
  website_url: string
  is_main_venue: boolean
}

const EMPTY_FORM: VenueForm = {
  name: '',
  venue_type: 'conference',
  capacity: '',
  city: '',
  state: '',
  address: '',
  website_url: '',
  is_main_venue: false,
}

const TYPE_BADGE: Record<VenueType, 'blue' | 'purple' | 'orange' | 'pink' | 'green' | 'yellow' | 'gray'> = {
  conference: 'blue',
  bar: 'pink',
  restaurant: 'orange',
  coworking: 'purple',
  outdoor: 'green',
  hotel: 'yellow',
  other: 'gray',
}

// ---------- Component ----------

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slideOpen, setSlideOpen] = useState(false)
  const [selected, setSelected] = useState<Venue | null>(null)
  const [form, setForm] = useState<VenueForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchVenues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<{ venues: Venue[] }>('/api/v1/admin/venues')
      setVenues(res.venues)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venues')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  function openCreate() {
    setSelected(null)
    setForm(EMPTY_FORM)
    setSlideOpen(true)
  }

  function openDetail(venue: Venue) {
    setSelected(venue)
    setSlideOpen(true)
  }

  function closeSlide() {
    setSlideOpen(false)
    setSelected(null)
  }

  function updateField<K extends keyof VenueForm>(key: K, value: VenueForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Venue name is required')
      return
    }
    if (!form.city.trim()) {
      toast.error('City is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        capacity: form.capacity === '' ? 0 : Number(form.capacity),
      }
      await apiPost('/api/v1/admin/venues', payload)
      toast.success('Venue created')
      closeSlide()
      fetchVenues()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create venue')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Venue>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.name}</span>
          {row.is_main_venue && (
            <span title="Main Venue"><Crown size={13} className="text-yellow-400" /></span>
          )}
        </div>
      ),
    },
    {
      key: 'venue_type' as any,
      label: 'Type',
      sortable: true,
      render: (row) => {
        const t = row.venue_type ?? 'other'
        return (
          <Badge variant={TYPE_BADGE[t] ?? 'gray'} className="capitalize">
            {t}
          </Badge>
        )
      },
    },
    {
      key: 'capacity' as any,
      label: 'Capacity',
      sortable: true,
      className: 'text-right tabular-nums',
      render: (row) => (
        <span className="font-semibold">
          {row.capacity && row.capacity > 0 ? row.capacity.toLocaleString() : '\u2014'}
        </span>
      ),
    },
    {
      key: 'city' as any,
      label: 'City',
      sortable: true,
      render: (row) => (
        <span>
          {row.city || '\u2014'}
          {row.state ? `, ${row.state}` : ''}
        </span>
      ),
    },
    {
      key: 'active' as any,
      label: 'Status',
      render: (row) => (
        <Badge variant={row.active ? 'green' : 'gray'}>
          {row.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error && (
        <div className="glass rounded-xl p-4 border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <DataTable<Venue>
        columns={columns}
        data={venues}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={openDetail}
        emptyText="No venues found"
        toolbar={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
              <MapPin size={15} />
              <span className="text-xs font-medium">
                {venues.length} venue{venues.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchVenues()}
                disabled={loading}
                className="shrink-0"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} />
                Add Venue
              </Button>
            </div>
          </div>
        }
      />

      <SlideOver
        open={slideOpen}
        onClose={closeSlide}
        title={selected ? selected.name : 'Add Venue'}
        wide
      >
        {selected ? (
          /* Detail view */
          <div className="space-y-5">
            {selected.image_url && (
              <img
                src={selected.image_url}
                alt={selected.name}
                className="w-full h-40 object-cover rounded-lg"
              />
            )}
            <div className="space-y-3">
              <DetailRow label="Name" value={selected.name} />
              {selected.short_name && (
                <DetailRow label="Short" value={selected.short_name} />
              )}
              <DetailRow
                label="Type"
                value={
                  <Badge variant={TYPE_BADGE[selected.venue_type ?? 'other'] ?? 'gray'} className="capitalize">
                    {selected.venue_type ?? 'other'}
                  </Badge>
                }
              />
              <DetailRow
                label="Capacity"
                value={selected.capacity ? selected.capacity.toLocaleString() : '\u2014'}
              />
              <DetailRow
                label="Location"
                value={[selected.address, selected.city, selected.state].filter(Boolean).join(', ') || '\u2014'}
              />
              <DetailRow
                label="Main"
                value={selected.is_main_venue ? 'Yes' : 'No'}
              />
              <DetailRow
                label="Active"
                value={
                  <Badge variant={selected.active ? 'green' : 'gray'}>
                    {selected.active ? 'Active' : 'Inactive'}
                  </Badge>
                }
              />
              {selected.website_url && (
                <DetailRow
                  label="Website"
                  value={
                    <a
                      href={selected.website_url}
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
          </div>
        ) : (
          /* Create form */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Venue Name *
              </label>
              <Input
                placeholder="National Western Complex"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Venue Type
              </label>
              <Select
                value={form.venue_type}
                onChange={(e) => updateField('venue_type', e.target.value as VenueType)}
                className="bg-white/5 border-white/10"
              >
                {VENUE_TYPES.map((t) => (
                  <SelectOption key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectOption>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Capacity
              </label>
              <Input
                type="number"
                placeholder="500"
                min={0}
                value={form.capacity}
                onChange={(e) =>
                  updateField(
                    'capacity',
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  City *
                </label>
                <Input
                  placeholder="Denver"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  State
                </label>
                <Input
                  placeholder="CO"
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Address
              </label>
              <Input
                placeholder="4655 Humboldt St, Denver, CO 80216"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Website URL
              </label>
              <Input
                placeholder="https://example.com"
                value={form.website_url}
                onChange={(e) => updateField('website_url', e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_main_venue}
                onChange={(e) => updateField('is_main_venue', e.target.checked)}
                className="rounded border-white/20"
              />
              <Crown size={14} className="text-yellow-400" /> Main venue
            </label>

            <div className="flex items-center gap-2 pt-4 border-t border-[var(--color-border)]">
              <Button
                variant="outline"
                size="sm"
                onClick={closeSlide}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Create Venue'}
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
      <div className="text-sm">{value ?? '\u2014'}</div>
    </div>
  )
}
