import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { formatRelative } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, type Column } from '@/components/DataTable'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Bot,
  Zap,
  Timer,
  TrendingUp,
  ArrowUpRight,
  Send,
  Award,
  RefreshCw,
  WifiOff,
  Gavel,
  CircleDollarSign,
  Hash,
} from 'lucide-react'

// ---------- Types ----------

interface Agent {
  id: string
  user_id: string
  skills: string[]
  status: string
  claimed_at: string | null
}

interface Boost {
  event_id: string
  event_title: string
  boost_amount: number
  expires_at: string
}

interface BoostAuctionStatus {
  cycle: number
  min_bid: number
  ends_at: string
  current_bids: number
}

interface AgentTransaction {
  id: string
  type: string
  amount: number
  user_id: string
  created_at: string
}

type SectionStatus = 'loading' | 'available' | 'unavailable'

// ---------- Helpers ----------

function UnavailableCard({ title, message }: { title: string; message?: string }) {
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {title}
      </div>
      <div className="flex items-center gap-2 text-sm text-yellow-400/80">
        <WifiOff size={14} />
        <span>{message ?? 'Not available -- endpoint not configured yet'}</span>
      </div>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="glass rounded-xl h-36 animate-pulse" />
  )
}

function formatCountdown(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  return `${h}h ${m}m ${s}s`
}

const TX_TYPE_VARIANT: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'gray'> = {
  boost: 'orange',
  reward: 'green',
  claim: 'blue',
  bid: 'purple',
  refund: 'gray',
}

// ---------- Component ----------

export default function Agents() {
  const [refreshing, setRefreshing] = useState(false)

  // Agent slots
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentStatus, setAgentStatus] = useState<SectionStatus>('loading')

  // Active boosts
  const [boosts, setBoosts] = useState<Boost[]>([])
  const [boostStatus, setBoostStatus] = useState<SectionStatus>('loading')

  // Auction status
  const [auction, setAuction] = useState<BoostAuctionStatus | null>(null)
  const [auctionStatus, setAuctionStatus] = useState<SectionStatus>('loading')
  const [countdown, setCountdown] = useState('')

  // Transactions
  const [transactions, setTransactions] = useState<AgentTransaction[]>([])
  const [txStatus, setTxStatus] = useState<SectionStatus>('loading')

  // Admin actions
  const [blastMessage, setBlastMessage] = useState('')
  const [sendingBlast, setSendingBlast] = useState(false)
  const [awardingTop, setAwardingTop] = useState(false)

  // ---------- Data fetching ----------

  const fetchAll = useCallback(async () => {
    setRefreshing(true)

    // Agents
    try {
      const res = await apiGet<{ agents: Agent[] }>('/api/v1/agents')
      setAgents(res.agents ?? [])
      setAgentStatus('available')
    } catch {
      setAgents([])
      setAgentStatus('unavailable')
    }

    // Boosts
    try {
      const res = await apiGet<{ boosts: Boost[] }>('/api/v1/agents/boosts')
      setBoosts(res.boosts ?? [])
      setBoostStatus('available')
    } catch {
      setBoosts([])
      setBoostStatus('unavailable')
    }

    // Auction
    try {
      const res = await apiGet<BoostAuctionStatus>('/api/v1/boost/status')
      setAuction(res)
      setAuctionStatus('available')
    } catch {
      setAuction(null)
      setAuctionStatus('unavailable')
    }

    // Transactions
    try {
      const res = await apiGet<{ transactions: AgentTransaction[] }>(
        '/api/v1/agents/transactions',
      )
      setTransactions(res.transactions ?? [])
      setTxStatus('available')
    } catch {
      setTransactions([])
      setTxStatus('unavailable')
    }

    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Countdown timer for auction
  const countdownRef = useRef<ReturnType<typeof setInterval>>(undefined)
  useEffect(() => {
    if (auctionStatus !== 'available' || !auction?.ends_at) {
      setCountdown('')
      return
    }
    function tick() {
      setCountdown(formatCountdown(auction!.ends_at))
    }
    tick()
    countdownRef.current = setInterval(tick, 1_000)
    return () => clearInterval(countdownRef.current)
  }, [auction, auctionStatus])

  // ---------- Admin actions ----------

  async function handleAwardTop() {
    setAwardingTop(true)
    try {
      await apiPost('/api/v1/admin/points', {
        user_id: 'top',
        amount: 100,
        action: 'top_scorer_award',
      })
      toast.success('Top scorer awarded 100 points')
    } catch {
      toast.error('Failed to award points')
    } finally {
      setAwardingTop(false)
    }
  }

  async function handleBlastNotification() {
    if (!blastMessage.trim()) {
      toast.error('Message cannot be empty')
      return
    }
    setSendingBlast(true)
    try {
      await apiPost('/api/v1/admin/notifications/test', {
        message: blastMessage.trim(),
      })
      toast.success('Notification sent')
      setBlastMessage('')
    } catch {
      toast.error('Failed to send notification')
    } finally {
      setSendingBlast(false)
    }
  }

  // ---------- Transaction table columns ----------

  const txColumns: Column<AgentTransaction>[] = [
    {
      key: 'type',
      label: 'Type',
      render: (row) => (
        <Badge variant={TX_TYPE_VARIANT[row.type] ?? 'gray'}>
          {row.type}
        </Badge>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (row) => (
        <span className="font-semibold tabular-nums">
          {row.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'user_id',
      label: 'User',
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)] text-xs font-mono truncate max-w-[180px] inline-block">
          {row.user_id}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Time',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)] whitespace-nowrap">
          {formatRelative(row.created_at)}
        </span>
      ),
    },
  ]

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Agents & Boosts</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage agent slots, active boosts, and the boost auction system.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchAll}
          title="Refresh"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Agent Slots */}
      {agentStatus === 'loading' ? (
        <SectionSkeleton />
      ) : agentStatus === 'unavailable' ? (
        <UnavailableCard
          title="Agent Slots"
          message="Agent system not yet configured"
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-[var(--color-muted-foreground)]" />
            <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Agent Slots ({agents.length})
            </span>
          </div>
          {agents.length === 0 ? (
            <div className="glass rounded-xl p-5 text-sm text-[var(--color-muted-foreground)]">
              No agents registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => {
                const statusColor =
                  agent.status === 'active'
                    ? 'green'
                    : agent.status === 'idle'
                      ? 'yellow'
                      : 'gray'
                return (
                  <div
                    key={agent.id}
                    className="glass rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[var(--color-muted-foreground)]">
                        {agent.id}
                      </span>
                      <Badge variant={statusColor as 'green' | 'yellow' | 'gray'}>
                        {agent.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.skills.map((skill) => (
                        <Badge key={skill} variant="blue" className="text-[0.65rem]">
                          {skill}
                        </Badge>
                      ))}
                      {agent.skills.length === 0 && (
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          No skills
                        </span>
                      )}
                    </div>
                    {agent.claimed_at && (
                      <div className="text-xs text-[var(--color-muted-foreground)]">
                        Claimed {formatRelative(agent.claimed_at)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Active Boosts + Auction side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Boosts */}
        {boostStatus === 'loading' ? (
          <SectionSkeleton />
        ) : boostStatus === 'unavailable' ? (
          <UnavailableCard
            title="Active Boosts"
            message="Boost system not yet configured"
          />
        ) : (
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Active Boosts ({boosts.length})
              </span>
            </div>
            {boosts.length === 0 ? (
              <div className="text-sm text-[var(--color-muted-foreground)]">
                No events are currently boosted.
              </div>
            ) : (
              <div className="space-y-2">
                {boosts.map((boost) => (
                  <div
                    key={boost.event_id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {boost.event_title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                        <ArrowUpRight size={11} />
                        <span>+{boost.boost_amount}</span>
                        <span>|</span>
                        <Timer size={11} />
                        <span>{formatCountdown(boost.expires_at)}</span>
                      </div>
                    </div>
                    <Badge variant="orange">Boosted</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Boost Auction Status */}
        {auctionStatus === 'loading' ? (
          <SectionSkeleton />
        ) : auctionStatus === 'unavailable' ? (
          <UnavailableCard
            title="Boost Auction"
            message="Auction system not yet configured"
          />
        ) : auction ? (
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Gavel size={16} className="text-[var(--color-primary)]" />
              <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Boost Auction
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[var(--color-muted-foreground)] mb-1">
                  <Hash size={12} />
                  <span className="text-[0.65rem] uppercase tracking-wider">
                    Cycle
                  </span>
                </div>
                <div className="text-xl font-bold">{auction.cycle}</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[var(--color-muted-foreground)] mb-1">
                  <CircleDollarSign size={12} />
                  <span className="text-[0.65rem] uppercase tracking-wider">
                    Min Bid
                  </span>
                </div>
                <div className="text-xl font-bold">{auction.min_bid}</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[var(--color-muted-foreground)] mb-1">
                  <Timer size={12} />
                  <span className="text-[0.65rem] uppercase tracking-wider">
                    Ends In
                  </span>
                </div>
                <div className="text-lg font-bold font-mono">
                  {countdown || '--'}
                </div>
              </div>
              <div className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[var(--color-muted-foreground)] mb-1">
                  <TrendingUp size={12} />
                  <span className="text-[0.65rem] uppercase tracking-wider">
                    Bids
                  </span>
                </div>
                <div className="text-xl font-bold">{auction.current_bids}</div>
              </div>
            </div>
          </div>
        ) : (
          <UnavailableCard title="Boost Auction" />
        )}
      </div>

      {/* Agent Transactions */}
      {txStatus === 'loading' ? (
        <SectionSkeleton />
      ) : txStatus === 'unavailable' ? (
        <UnavailableCard
          title="Agent Transactions"
          message="Transaction history not yet configured"
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--color-muted-foreground)]" />
            <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Agent Transactions
            </span>
          </div>
          <DataTable<AgentTransaction & Record<string, unknown>>
            columns={txColumns as Column<AgentTransaction & Record<string, unknown>>[]}
            data={transactions as (AgentTransaction & Record<string, unknown>)[]}
            pageSize={10}
            emptyText="No transactions recorded"
            rowKey={(row) => row.id as string}
          />
        </div>
      )}

      <Separator />

      {/* Admin Actions */}
      <div className="glass rounded-xl p-5 space-y-5">
        <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Admin Actions
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Award Top Scorer */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Award Top Scorer</div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Awards 100 points to the current top scorer as a bonus.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAwardTop}
              disabled={awardingTop}
            >
              {awardingTop ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Award size={14} />
              )}
              {awardingTop ? 'Awarding...' : 'Award 100 pts'}
            </Button>
          </div>

          {/* Blast Notification */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Blast Notification</div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Send a test notification to all connected channels.
            </p>
            <Textarea
              placeholder="Type your notification message..."
              value={blastMessage}
              onChange={(e) => setBlastMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleBlastNotification}
              disabled={sendingBlast || !blastMessage.trim()}
            >
              {sendingBlast ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {sendingBlast ? 'Sending...' : 'Send Blast'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
