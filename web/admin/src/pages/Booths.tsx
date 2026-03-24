import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { truncate } from '@/lib/utils'
import { DataTable, type Column } from '@/components/DataTable'
import { SlideOver } from '@/components/SlideOver'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectOption } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus,
  RefreshCw,
  Store,
  Star,
  StarOff,
  Gift,
  Monitor,
  Briefcase,
  ExternalLink,
} from 'lucide-react'

// ---------- Types ----------

type SponsorTier = 'diamond' | 'gold' | 'silver' | 'bronze' | 'community'

interface Booth {
  id: string
  name: string
  slug: string
  description: string | null
  boothNumber: string | null
  sponsorTier: SponsorTier | null
  companyUrl: string | null
  logoUrl: string | null
  bannerUrl: string | null
  twitterUrl: string | null
  farcasterUrl: string | null
  discordUrl: string | null
  telegramUrl: string | null
  floor: string | null
  hasSwag: boolean
  hasDemo: boolean
  hasHiring: boolean
  tags: string[]
  featured: boolean
}

interface BoothForm {
  name: string
  description: string
  booth_number: string
  sponsor_tier: string
  company_url: string
  logo_url: string
  floor: string
  has_swag: boolean
  has_demo: boolean
  has_hiring: boolean
  featured: boolean
}

const EMPTY_FORM: BoothForm = {
  name: '',
  description: '',
  booth_number: '',
  sponsor_tier: 'community',
  company_url: '',
  logo_url: '',
  floor: '',
  has_swag: false,
  has_demo: false,
  has_hiring: false,
  featured: false,
}

const TIER_BADGE: Record<string, 'blue' | 'purple' | 'yellow' | 'orange' | 'gray'> = {
  diamond: 'blue',
  gold: 'yellow',
  silver: 'gray',
  bronze: 'orange',
  community: 'purple',
}

const TIERS: SponsorTier[] = ['diamond', 'gold', 'silver', 'bronze', 'community']

// ---------- Component ----------

export default function Booths() {
  const [booths, setBooths] = useState<Booth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slideOpen, setSlideOpen] = useState(false)
  const [editing, setEditing] = useState<Booth | null>(null)
  const [form, setForm] = useState<BoothForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchBooths = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<{ booths: Booth[] }>('/api/v1/admin/booths')
      setBooths(res.booths)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booths')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBooths()
  }, [fetchBooths])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSlideOpen(true)
  }

  function openEdit(booth: Booth) {
    setEditing(booth)
    setForm({
      name: booth.name,
      description: booth.description ?? '',
      booth_number: booth.boothNumber ?? '',
      sponsor_tier: booth.sponsorTier ?? 'community',
      company_url: booth.companyUrl ?? '',
      logo_url: booth.logoUrl ?? '',
      floor: booth.floor ?? '',
      has_swag: booth.hasSwag,
      has_demo: booth.hasDemo,
      has_hiring: booth.hasHiring,
      featured: booth.featured,
    })
    setSlideOpen(true)
  }

  function closeSlide() {
    setSlideOpen(false)
    setEditing(null)
  }

  function updateField<K extends keyof BoothForm>(key: K, value: BoothForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Booth name is required')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await apiPatch(`/api/v1/admin/booths/${editing.id}`, form)
        toast.success('Booth updated')
      } else {
        await apiPost('/api/v1/admin/booths', form)
        toast.success('Booth created')
      }
      closeSlide()
      fetchBooths()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save booth')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Booth>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      className: 'max-w-[220px]',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.logoUrl && (
            <img src={row.logoUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
          )}
          <span className="font-medium line-clamp-1">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'boothNumber' as any,
      label: 'Booth #',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)] text-xs font-mono">
          {row.boothNumber || '\u2014'}
        </span>
      ),
    },
    {
      key: 'sponsorTier' as any,
      label: 'Tier',
      sortable: true,
      render: (row) => {
        const tier = row.sponsorTier ?? 'community'
        return (
          <Badge variant={TIER_BADGE[tier] ?? 'gray'} className="capitalize">
            {tier}
          </Badge>
        )
      },
    },
    {
      key: 'featured' as any,
      label: 'Featured',
      render: (row) => (
        row.featured ? (
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
        ) : (
          <StarOff size={14} className="text-[var(--color-muted-foreground)]" />
        )
      ),
    },
    {
      key: 'tags' as any,
      label: 'Highlights',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.hasSwag && <span title="Has Swag"><Gift size={13} className="text-pink-400" /></span>}
          {row.hasDemo && <span title="Has Demo"><Monitor size={13} className="text-blue-400" /></span>}
          {row.hasHiring && <span title="Hiring"><Briefcase size={13} className="text-green-400" /></span>}
          {!row.hasSwag && !row.hasDemo && !row.hasHiring && (
            <span className="text-[var(--color-muted-foreground)] text-xs">\u2014</span>
          )}
        </div>
      ),
    },
    {
      key: 'description' as any,
      label: 'Description',
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)] text-xs">
          {row.description ? truncate(row.description, 50) : '\u2014'}
        </span>
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

      <DataTable<Booth>
        columns={columns}
        data={booths}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={openEdit}
        emptyText="No booths found"
        toolbar={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
              <Store size={15} />
              <span className="text-xs font-medium">
                {booths.length} booth{booths.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchBooths()}
                disabled={loading}
                className="shrink-0"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} />
                Add Booth
              </Button>
            </div>
          </div>
        }
      />

      <SlideOver
        open={slideOpen}
        onClose={closeSlide}
        title={editing ? 'Edit Booth' : 'Add Booth'}
        wide
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Booth Name *
            </label>
            <Input
              placeholder="Chainlink"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Booth Number
              </label>
              <Input
                placeholder="A-42"
                value={form.booth_number}
                onChange={(e) => updateField('booth_number', e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Floor
              </label>
              <Input
                placeholder="Level 1"
                value={form.floor}
                onChange={(e) => updateField('floor', e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Sponsor Tier
            </label>
            <Select
              value={form.sponsor_tier}
              onChange={(e) => updateField('sponsor_tier', e.target.value)}
              className="bg-white/5 border-white/10"
            >
              {TIERS.map((t) => (
                <SelectOption key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectOption>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Company URL
              </label>
              <Input
                placeholder="https://example.com"
                value={form.company_url}
                onChange={(e) => updateField('company_url', e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Logo URL
              </label>
              <Input
                placeholder="https://example.com/logo.png"
                value={form.logo_url}
                onChange={(e) => updateField('logo_url', e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Description
            </label>
            <Textarea
              placeholder="Describe this booth..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Highlights
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_swag}
                  onChange={(e) => updateField('has_swag', e.target.checked)}
                  className="rounded border-white/20"
                />
                <Gift size={14} className="text-pink-400" /> Swag
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_demo}
                  onChange={(e) => updateField('has_demo', e.target.checked)}
                  className="rounded border-white/20"
                />
                <Monitor size={14} className="text-blue-400" /> Demo
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_hiring}
                  onChange={(e) => updateField('has_hiring', e.target.checked)}
                  className="rounded border-white/20"
                />
                <Briefcase size={14} className="text-green-400" /> Hiring
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => updateField('featured', e.target.checked)}
                  className="rounded border-white/20"
                />
                <Star size={14} className="text-yellow-400" /> Featured
              </label>
            </div>
          </div>

          {editing?.companyUrl && (
            <a
              href={editing.companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 text-sm"
            >
              Visit website <ExternalLink size={12} />
            </a>
          )}

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
              {saving ? 'Saving...' : editing ? 'Update Booth' : 'Create Booth'}
            </Button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}
