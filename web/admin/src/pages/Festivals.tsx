import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { SlideOver } from '@/components/SlideOver'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  StarOff,
  ToggleLeft,
  ToggleRight,
  Calendar,
  MapPin,
  Globe,
  ImageIcon,
  Loader2,
} from 'lucide-react'

// ---------- Types ----------

interface Festival {
  id: string
  name: string
  slug: string
  city: string | null
  starts_at: string | null
  ends_at: string | null
  timezone: string | null
  image_url: string | null
  url: string | null
  enabled: boolean
  featured: boolean
}

interface FestivalFormData {
  name: string
  slug: string
  city: string
  starts_at: string
  ends_at: string
  timezone: string
  image_url: string
  url: string
}

const EMPTY_FORM: FestivalFormData = {
  name: '',
  slug: '',
  city: '',
  starts_at: '',
  ends_at: '',
  timezone: '',
  image_url: '',
  url: '',
}

// ---------- Component ----------

export default function Festivals() {
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // SlideOver state
  const [slideOpen, setSlideOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FestivalFormData>(EMPTY_FORM)

  // ---------- Fetch ----------

  const fetchFestivals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ festivals: Festival[] }>(
        '/api/v1/admin/festivals',
      )
      setFestivals(res.festivals)
    } catch (err) {
      toast.error('Failed to load festivals')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFestivals()
  }, [fetchFestivals])

  // ---------- Form helpers ----------

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSlideOpen(true)
  }

  function openEdit(festival: Festival) {
    setEditingId(festival.id)
    setForm({
      name: festival.name,
      slug: festival.slug,
      city: festival.city ?? '',
      starts_at: festival.starts_at?.split('T')[0] ?? '',
      ends_at: festival.ends_at?.split('T')[0] ?? '',
      timezone: festival.timezone ?? '',
      image_url: festival.image_url ?? '',
      url: festival.url ?? '',
    })
    setSlideOpen(true)
  }

  function updateField(field: keyof FestivalFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Auto-generate slug from name
  function handleNameChange(value: string) {
    updateField('name', value)
    if (!editingId) {
      updateField(
        'slug',
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      )
    }
  }

  // ---------- Save ----------

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!form.slug.trim()) {
      toast.error('Slug is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        city: form.city.trim() || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        timezone: form.timezone.trim() || null,
        image_url: form.image_url.trim() || null,
        url: form.url.trim() || null,
      }

      if (editingId) {
        await apiPatch(`/api/v1/admin/festivals/${editingId}`, payload)
        toast.success('Festival updated')
      } else {
        await apiPost('/api/v1/admin/festivals', payload)
        toast.success('Festival created')
      }
      setSlideOpen(false)
      fetchFestivals()
    } catch (err) {
      toast.error(editingId ? 'Failed to update' : 'Failed to create')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ---------- Delete ----------

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete festival "${name}"? This cannot be undone.`))
      return
    try {
      await apiDelete(`/api/v1/admin/festivals/${id}`)
      toast.success('Festival deleted')
      setFestivals((prev) => prev.filter((f) => f.id !== id))
    } catch {
      toast.error('Failed to delete')
    }
  }

  // ---------- Toggles ----------

  async function toggleEnabled(id: string, enabled: boolean) {
    try {
      await apiPatch(`/api/v1/admin/festivals/${id}`, { enabled })
      setFestivals((prev) =>
        prev.map((f) => (f.id === id ? { ...f, enabled } : f)),
      )
      toast.success(enabled ? 'Festival enabled' : 'Festival disabled')
    } catch {
      toast.error('Failed to update')
    }
  }

  async function toggleFeatured(id: string, featured: boolean) {
    try {
      await apiPatch(`/api/v1/admin/festivals/${id}`, { featured })
      setFestivals((prev) =>
        prev.map((f) => (f.id === id ? { ...f, featured } : f)),
      )
      toast.success(featured ? 'Festival featured' : 'Festival unfeatured')
    } catch {
      toast.error('Failed to update')
    }
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Festivals</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage festivals and multi-day event collections.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} />
          Add Festival
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-xl h-64 animate-pulse"
            />
          ))}
        </div>
      ) : festivals.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Calendar
            size={40}
            className="mx-auto mb-3 text-[var(--color-muted-foreground)]"
          />
          <p className="text-[var(--color-muted-foreground)]">
            No festivals yet. Create your first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {festivals.map((festival) => (
            <FestivalCard
              key={festival.id}
              festival={festival}
              onEdit={() => openEdit(festival)}
              onDelete={() => handleDelete(festival.id, festival.name)}
              onToggleEnabled={(v) => toggleEnabled(festival.id, v)}
              onToggleFeatured={(v) => toggleFeatured(festival.id, v)}
            />
          ))}
        </div>
      )}

      {/* SlideOver form */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editingId ? 'Edit Festival' : 'New Festival'}
      >
        <div className="space-y-4">
          <FormField label="Name" required>
            <Input
              placeholder="ETHDenver 2026"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoFocus
            />
          </FormField>

          <FormField label="Slug" required>
            <Input
              placeholder="ethdenver-2026"
              value={form.slug}
              onChange={(e) => updateField('slug', e.target.value)}
            />
          </FormField>

          <FormField label="City">
            <Input
              placeholder="Denver"
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date">
              <Input
                type="date"
                value={form.starts_at}
                onChange={(e) => updateField('starts_at', e.target.value)}
              />
            </FormField>
            <FormField label="End Date">
              <Input
                type="date"
                value={form.ends_at}
                onChange={(e) => updateField('ends_at', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Timezone">
            <Input
              placeholder="America/Denver"
              value={form.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
            />
          </FormField>

          <FormField label="Image URL">
            <Input
              placeholder="https://..."
              value={form.image_url}
              onChange={(e) => updateField('image_url', e.target.value)}
            />
            {form.image_url && (
              <img
                src={form.image_url}
                alt="Preview"
                className="mt-2 w-full h-32 object-cover rounded-lg border border-[var(--color-border)]"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
          </FormField>

          <FormField label="Website URL">
            <Input
              placeholder="https://ethdenver.com"
              value={form.url}
              onChange={(e) => updateField('url', e.target.value)}
            />
          </FormField>

          <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingId ? 'Update Festival' : 'Create Festival'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSlideOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}

// ---------- Festival Card ----------

function FestivalCard({
  festival,
  onEdit,
  onDelete,
  onToggleEnabled,
  onToggleFeatured,
}: {
  festival: Festival
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled: (v: boolean) => void
  onToggleFeatured: (v: boolean) => void
}) {
  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col transition-shadow hover:shadow-card-hover">
      {/* Image / placeholder */}
      {festival.image_url ? (
        <img
          src={festival.image_url}
          alt={festival.name}
          className="w-full h-36 object-cover"
        />
      ) : (
        <div className="w-full h-36 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-purple)]/10 flex items-center justify-center">
          <ImageIcon
            size={32}
            className="text-[var(--color-muted-foreground)]/40"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-base line-clamp-1">{festival.name}</h3>
          {festival.city && (
            <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] mt-0.5">
              <MapPin size={11} />
              {festival.city}
            </div>
          )}
        </div>

        {/* Dates */}
        {(festival.starts_at || festival.ends_at) && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <Calendar size={11} />
            {formatDate(festival.starts_at)}
            {festival.ends_at && <> &mdash; {formatDate(festival.ends_at)}</>}
          </div>
        )}

        {/* Badges */}
        <div className="flex gap-1.5 flex-wrap">
          <Badge variant={festival.enabled ? 'green' : 'gray'}>
            {festival.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          {festival.featured && <Badge variant="purple">Featured</Badge>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-[var(--color-border)]">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil size={12} /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleEnabled(!festival.enabled)}
            title={festival.enabled ? 'Disable' : 'Enable'}
          >
            {festival.enabled ? (
              <ToggleRight size={14} className="text-green-400" />
            ) : (
              <ToggleLeft size={14} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFeatured(!festival.featured)}
            title={festival.featured ? 'Unfeature' : 'Feature'}
          >
            {festival.featured ? (
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
            ) : (
              <StarOff size={14} />
            )}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 size={12} className="text-red-400" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------- Form Field ----------

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}
