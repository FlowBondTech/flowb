import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { formatDate, platformBadge, truncate } from '@/lib/utils'
import { DataTable, type Column } from '@/components/DataTable'
import { SlideOver } from '@/components/SlideOver'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShieldCheck, Plus, Trash2, Loader2 } from 'lucide-react'

interface Admin {
  [key: string]: unknown
  user_id: string
  label: string
  permissions: Record<string, boolean>
  created_at: string
}

interface AdminsResponse {
  admins: Admin[]
}

export default function Admins() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // SlideOver state
  const [slideOpen, setSlideOpen] = useState(false)
  const [formUserId, setFormUserId] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<AdminsResponse>('/api/v1/admin/admins')
      setAdmins(res.admins)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admins')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  const handleAdd = async () => {
    const userId = formUserId.trim()
    const label = formLabel.trim()

    if (!userId) {
      toast.error('User ID is required')
      return
    }

    setSaving(true)
    try {
      await apiPost('/api/v1/admin/admins', {
        user_id: userId,
        label: label || userId,
        permissions: { '*': true },
      })
      toast.success(`Admin "${label || userId}" added`)
      setSlideOpen(false)
      setFormUserId('')
      setFormLabel('')
      await fetchAdmins()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add admin')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (admin: Admin) => {
    const confirmed = window.confirm(
      `Remove admin "${admin.label || admin.user_id}"?\n\nThis cannot be undone.`,
    )
    if (!confirmed) return

    try {
      await apiDelete(`/api/v1/admin/admins/${encodeURIComponent(admin.user_id)}`)
      toast.success(`Admin "${admin.label || admin.user_id}" removed`)
      await fetchAdmins()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove admin')
    }
  }

  const columns: Column<Admin>[] = [
    {
      key: 'user_id',
      label: 'User ID',
      sortable: true,
      render: (row) => {
        const badge = platformBadge(row.user_id)
        return (
          <div className="flex items-center gap-2">
            <Badge variant={badge.color} className="text-[10px] px-1.5 py-0">
              {badge.label}
            </Badge>
            <span className="font-mono text-xs" title={row.user_id}>
              {truncate(row.user_id, 28)}
            </span>
          </div>
        )
      },
    },
    {
      key: 'label',
      label: 'Label',
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.label || '---'}</span>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (row) => {
        const perms = row.permissions as Record<string, boolean> | null
        const keys = Object.keys(perms ?? {})
        if (keys.length === 0) {
          return <span className="text-[var(--color-muted-foreground)]">None</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {keys.map((key) => (
              <Badge
                key={key}
                variant={key === '*' ? 'purple' : 'gray'}
                className="text-[10px] px-1.5 py-0"
              >
                {key === '*' ? 'Full Access' : key}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'created_at',
      label: 'Added',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)] text-xs">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: '_actions',
      label: '',
      className: 'w-12 text-right',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            handleRemove(row)
          }}
          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title="Remove admin"
        >
          <Trash2 size={14} />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} className="text-[var(--color-primary)]" />
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {admins.length} admin{admins.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button size="sm" onClick={() => setSlideOpen(true)}>
          <Plus size={14} />
          Add Admin
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="glass rounded-xl p-4 border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <DataTable<Admin>
        columns={columns}
        data={admins}
        loading={loading}
        rowKey={(r) => r.user_id}
        emptyText="No admins configured"
        serverPagination
      />

      {/* Add Admin SlideOver */}
      <SlideOver
        open={slideOpen}
        onClose={() => {
          setSlideOpen(false)
          setFormUserId('')
          setFormLabel('')
        }}
        title="Add Admin"
      >
        <div className="space-y-5">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Grant full admin access to a user. The user ID should match the
            platform format (e.g. telegram_12345, farcaster_67890, or a web user ID).
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
              User ID
            </label>
            <Input
              placeholder="telegram_12345"
              value={formUserId}
              onChange={(e) => setFormUserId(e.target.value)}
              className="bg-white/5 border-white/10"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
              Label
            </label>
            <Input
              placeholder="Admin name or description"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="glass rounded-lg p-3 text-xs text-[var(--color-muted-foreground)]">
            This will grant <Badge variant="purple" className="text-[10px] px-1.5 py-0 mx-0.5">Full Access</Badge> permissions
            (<code className="text-[var(--color-primary)]">*: true</code>).
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAdd}
              disabled={saving || !formUserId.trim()}
              className="flex-1"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {saving ? 'Adding...' : 'Add Admin'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSlideOpen(false)
                setFormUserId('')
                setFormLabel('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}
