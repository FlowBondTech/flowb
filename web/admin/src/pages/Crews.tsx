import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'
import { StatCard } from '@/components/StatCard'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { UsersRound, Search, RefreshCw, Copy, Hash } from 'lucide-react'

interface Crew {
  [key: string]: unknown
  emoji: string
  name: string
  member_count: number
  join_code: string
  created_at: string
}

interface CrewsResponse {
  crews: Crew[]
}

export default function Crews() {
  const [crews, setCrews] = useState<Crew[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchCrews = useCallback(async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (query) params.set('search', query)
      const res = await apiGet<CrewsResponse>(`/api/v1/admin/crews?${params}`)
      setCrews(res.crews)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load crews')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCrews(debouncedSearch)
  }, [debouncedSearch, fetchCrews])

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success(`Copied: ${code}`),
      () => toast.error('Failed to copy'),
    )
  }

  const totalMembers = crews.reduce((sum, c) => sum + c.member_count, 0)

  const columns: Column<Crew>[] = [
    {
      key: 'name',
      label: 'Crew',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none" role="img" aria-label={row.name}>
            {row.emoji || '---'}
          </span>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'member_count',
      label: 'Members',
      sortable: true,
      className: 'text-right tabular-nums',
      render: (row) => (
        <span className="font-semibold">{formatNumber(row.member_count)}</span>
      ),
    },
    {
      key: 'join_code',
      label: 'Join Code',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            copyJoinCode(row.join_code)
          }}
          className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
          title="Click to copy"
        >
          <code className="text-xs font-mono text-[var(--color-primary)]">
            {row.join_code}
          </code>
          <Copy
            size={12}
            className="text-[var(--color-muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)] text-xs">
          {formatDate(row.created_at)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Crews"
          value={crews.length}
          icon={<UsersRound size={18} />}
        />
        <StatCard
          title="Total Members"
          value={totalMembers}
          icon={<Hash size={18} />}
          sub={
            crews.length > 0
              ? `avg ${Math.round(totalMembers / crews.length)} per crew`
              : undefined
          }
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="glass rounded-xl p-4 border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <DataTable<Crew>
        columns={columns}
        data={crews}
        loading={loading}
        rowKey={(r) => r.join_code}
        emptyText="No crews found"
        serverPagination
        toolbar={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              />
              <Input
                placeholder="Search crews..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 bg-white/5 border-white/10 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCrews(debouncedSearch)}
              disabled={loading}
              className="shrink-0"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />
    </div>
  )
}
