import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Puzzle, RefreshCw } from 'lucide-react'

// ---------- Types ----------

interface Plugin {
  id: string
  name: string
  enabled: boolean
}

// ---------- Component ----------

export default function Plugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const fetchPlugins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<{ plugins: Plugin[] }>('/api/v1/admin/plugins')
      setPlugins(res.plugins)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlugins()
  }, [fetchPlugins])

  async function handleToggle(plugin: Plugin) {
    const newEnabled = !plugin.enabled
    setTogglingIds(prev => new Set(prev).add(plugin.id))

    // Optimistic update
    setPlugins(prev => prev.map(p => p.id === plugin.id ? { ...p, enabled: newEnabled } : p))

    try {
      await apiPost(`/api/v1/admin/plugins/${plugin.id}/toggle`, { enabled: newEnabled })
      toast.success(`${plugin.name} ${newEnabled ? 'enabled' : 'disabled'}`)
    } catch (err) {
      // Revert on failure
      setPlugins(prev => prev.map(p => p.id === plugin.id ? { ...p, enabled: !newEnabled } : p))
      toast.error(err instanceof Error ? err.message : 'Failed to toggle plugin')
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(plugin.id)
        return next
      })
    }
  }

  // ---------- Render ----------

  if (error) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPlugins}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Puzzle size={18} className="text-[var(--color-primary)]" />
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {loading ? '...' : `${plugins.length} plugin${plugins.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchPlugins} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Plugin list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : plugins.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-[var(--color-muted-foreground)] text-sm">
          No plugins found
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="glass rounded-xl px-5 py-4 flex items-center justify-between transition-colors hover:border-white/10"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    plugin.enabled ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
                <span className="font-medium text-sm">{plugin.name}</span>
                <Badge variant={plugin.enabled ? 'green' : 'gray'}>
                  {plugin.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <Switch
                checked={plugin.enabled}
                onCheckedChange={() => handleToggle(plugin)}
                disabled={togglingIds.has(plugin.id)}
                aria-label={`Toggle ${plugin.name}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
