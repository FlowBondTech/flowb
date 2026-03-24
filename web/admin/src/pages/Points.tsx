import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { formatNumber, platformBadge, truncate, formatRelative } from '@/lib/utils'
import { StatCard } from '@/components/StatCard'
import { DataTable, type Column } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Coins, Send, Loader2, Trophy, TrendingUp, Award } from 'lucide-react'

interface LeaderboardEntry {
  [key: string]: unknown
  user_id: string
  total_points: number
  current_streak: number
  milestone_level: number
}

interface AwardLog {
  user_id: string
  amount: number
  action: string
  awarded_at: string
}

export default function Points() {
  // Award form state
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [action, setAction] = useState('')
  const [awarding, setAwarding] = useState(false)

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingBoard, setLoadingBoard] = useState(true)
  const [boardError, setBoardError] = useState<string | null>(null)

  // Recent awards log (client-side, tracks awards made in this session)
  const [recentAwards, setRecentAwards] = useState<AwardLog[]>([])

  const fetchLeaderboard = useCallback(async () => {
    setLoadingBoard(true)
    setBoardError(null)
    try {
      const res = await apiGet<{ users: LeaderboardEntry[] } | { leaderboard: LeaderboardEntry[] }>(
        '/api/v1/admin/users?limit=10',
      )
      if ('leaderboard' in res) {
        setLeaderboard(res.leaderboard)
      } else if ('users' in res) {
        setLeaderboard(
          [...res.users]
            .sort((a, b) => b.total_points - a.total_points)
            .slice(0, 10),
        )
      }
    } catch (err) {
      setBoardError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      setLoadingBoard(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const handleAward = async (e: React.FormEvent) => {
    e.preventDefault()

    const uid = userId.trim()
    const amt = Number(amount)
    const act = action.trim()

    if (!uid) {
      toast.error('User ID is required')
      return
    }
    if (!amt || amt <= 0) {
      toast.error('Amount must be a positive number')
      return
    }
    if (!act) {
      toast.error('Action/reason is required')
      return
    }

    setAwarding(true)
    try {
      await apiPost('/api/v1/admin/points', {
        user_id: uid,
        amount: amt,
        action: act,
      })
      toast.success(`Awarded ${formatNumber(amt)} points to ${truncate(uid, 24)}`)

      // Track in session log
      setRecentAwards((prev) => [
        { user_id: uid, amount: amt, action: act, awarded_at: new Date().toISOString() },
        ...prev,
      ])

      // Reset form
      setUserId('')
      setAmount('')
      setAction('')

      // Refresh leaderboard to reflect changes
      fetchLeaderboard()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to award points')
    } finally {
      setAwarding(false)
    }
  }

  const totalAwarded = recentAwards.reduce((sum, a) => sum + a.amount, 0)
  const topUser = leaderboard[0]

  // Build rank lookup from the sorted leaderboard array.
  // The render callback only receives the row, so we close over
  // the leaderboard state to derive each row's rank position.
  const rankMap = new Map(leaderboard.map((entry, i) => [entry.user_id, i + 1]))

  const rankColors: Record<number, string> = {
    1: 'text-yellow-400',
    2: 'text-gray-300',
    3: 'text-orange-400',
  }

  const leaderboardColumns: Column<LeaderboardEntry>[] = [
    {
      key: '_rank',
      label: '#',
      className: 'w-10 text-center',
      render: (row) => {
        const rank = rankMap.get(row.user_id) ?? 0
        return (
          <span className={`font-bold text-xs ${rankColors[rank] ?? 'text-[var(--color-muted-foreground)]'}`}>
            {rank}
          </span>
        )
      },
    },
    {
      key: 'user_id',
      label: 'User',
      render: (row) => {
        const badge = platformBadge(row.user_id)
        return (
          <div className="flex items-center gap-2">
            <Badge variant={badge.color} className="text-[10px] px-1.5 py-0">
              {badge.label}
            </Badge>
            <span className="font-mono text-xs" title={row.user_id}>
              {truncate(row.user_id, 24)}
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
      key: 'milestone_level',
      label: 'Level',
      className: 'text-center',
      render: (row) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold">
          {row.milestone_level}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Session Awards"
          value={recentAwards.length}
          icon={<Award size={18} />}
          sub={recentAwards.length > 0 ? `${formatNumber(totalAwarded)} pts total` : 'No awards yet'}
        />
        <StatCard
          title="Top User"
          value={topUser ? formatNumber(topUser.total_points) : 0}
          icon={<Trophy size={18} />}
          color="text-yellow-400"
          sub={topUser ? truncate(topUser.user_id, 20) : '---'}
        />
        <StatCard
          title="Leaderboard Size"
          value={leaderboard.length}
          icon={<TrendingUp size={18} />}
          sub="top scorers loaded"
        />
      </div>

      {/* Award Points Form */}
      <Card className="glass border-[var(--color-glass-border)]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins size={18} className="text-[var(--color-primary)]" />
            Award Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAward} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  User ID
                </label>
                <Input
                  placeholder="telegram_12345"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Amount
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-white/5 border-white/10 tabular-nums"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Action / Reason
                </label>
                <Input
                  placeholder="manual_bonus"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={awarding || !userId.trim() || !amount || !action.trim()}
              size="sm"
            >
              {awarding ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {awarding ? 'Awarding...' : 'Award Points'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent awards (session-only log) */}
      {recentAwards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)]">
            Recent Awards (this session)
          </h3>
          <div className="glass rounded-xl divide-y divide-white/[0.04]">
            {recentAwards.map((award, i) => {
              const badge = platformBadge(award.user_id)
              return (
                <div key={`${award.user_id}-${award.awarded_at}-${i}`} className="flex items-center gap-3 px-4 py-3">
                  <Badge variant={badge.color} className="text-[10px] px-1.5 py-0">
                    {badge.label}
                  </Badge>
                  <span className="font-mono text-xs flex-1" title={award.user_id}>
                    {truncate(award.user_id, 24)}
                  </span>
                  <span className="text-sm font-semibold text-green-400">
                    +{formatNumber(award.amount)}
                  </span>
                  <span className="text-xs text-[var(--color-muted-foreground)] hidden sm:inline">
                    {award.action}
                  </span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {formatRelative(award.awarded_at)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)]">
          Leaderboard (Top 10)
        </h3>
        {boardError && (
          <div className="glass rounded-xl p-4 border-red-500/20 text-red-400 text-sm">
            {boardError}
          </div>
        )}
        <DataTable<LeaderboardEntry>
          columns={leaderboardColumns}
          data={leaderboard}
          loading={loadingBoard}
          rowKey={(r) => r.user_id}
          emptyText="No leaderboard data"
          serverPagination
        />
      </div>
    </div>
  )
}
