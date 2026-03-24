import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/lib/api'
import { formatDate, platformBadge, truncate, formatNumber } from '@/lib/utils'
import { StatCard } from '@/components/StatCard'
import { DataTable, type Column } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users as UsersIcon, RefreshCw, Search, Trophy, Flame } from 'lucide-react'

interface User {
  [key: string]: unknown
  user_id: string
  total_points: number
  current_streak: number
  milestone_level: number
  created_at: string
}

interface UsersResponse {
  users: User[]
  total: number
}

export default function Users() {
  const [data, setData] = useState<UsersResponse | null>(null)
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

  const fetchUsers = useCallback(async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (query) params.set('search', query)
      const res = await apiGet<UsersResponse>(`/api/v1/admin/users?${params}`)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount and when debounced search changes
  useEffect(() => {
    fetchUsers(debouncedSearch)
  }, [debouncedSearch, fetchUsers])

  const columns: Column<User>[] = [
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
      key: 'total_points',
      label: 'Points',
      sortable: true,
      className: 'text-right tabular-nums',
      render: (row) => (
        <span className="font-semibold">{formatNumber(row.total_points)}</span>
      ),
    },
    {
      key: 'current_streak',
      label: 'Streak',
      sortable: true,
      className: 'text-right tabular-nums',
      render: (row) => (
        <span className={row.current_streak > 0 ? 'text-orange-400' : ''}>
          {row.current_streak > 0 ? `${row.current_streak}d` : '0'}
        </span>
      ),
    },
    {
      key: 'milestone_level',
      label: 'Level',
      sortable: true,
      className: 'text-center',
      render: (row) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold">
          {row.milestone_level}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)] text-xs">
          {formatDate(row.created_at)}
        </span>
      ),
    },
  ]

  const users = data?.users ?? []

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Users"
          value={data?.total ?? 0}
          icon={<UsersIcon size={18} />}
        />
        <StatCard
          title="Avg Points"
          value={
            users.length > 0
              ? Math.round(users.reduce((s, u) => s + u.total_points, 0) / users.length)
              : 0
          }
          icon={<Trophy size={18} />}
          color="text-yellow-400"
        />
        <StatCard
          title="Active Streaks"
          value={users.filter((u) => u.current_streak > 0).length}
          icon={<Flame size={18} />}
          color="text-orange-400"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="glass rounded-xl p-4 border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <DataTable<User>
        columns={columns}
        data={users}
        loading={loading}
        rowKey={(r) => r.user_id}
        emptyText="No users found"
        serverPagination
        toolbar={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 bg-white/5 border-white/10 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers(debouncedSearch)}
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
