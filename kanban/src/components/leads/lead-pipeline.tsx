import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type DragEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { cn } from '@/lib/utils'
import { LEAD_STAGES } from '@/lib/constants'
import { useLeads } from '@/hooks/use-leads'
import type { Lead, LeadStage } from '@/types/kanban'
import { LeadColumn } from './lead-column'
import { LeadModal } from './lead-modal'
import { toast } from 'sonner'

const SWIPE_THRESHOLD = 50
const MOBILE_BREAKPOINT = 768

export function LeadPipeline() {
  const {
    leads,
    loading,
    error,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    fetchTimeline,
    scheduleMeeting,
  } = useLeads()

  // Drag state
  const [draggingLead, setDraggingLead] = useState<{
    id: string
    fromStage: LeadStage
  } | null>(null)

  // Modal state
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createStage] = useState<LeadStage>('new')

  // Mobile state
  const [isMobile, setIsMobile] = useState(false)
  const [activeColumnIndex, setActiveColumnIndex] = useState(0)
  const touchStartX = useRef(0)
  const touchDeltaX = useRef(0)

  // Search
  const [search, setSearch] = useState('')

  // Responsive detection
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Filtered leads per stage
  const stageData = useMemo(() => {
    let filtered = leads
    if (search) {
      const q = search.toLowerCase()
      filtered = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
      )
    }

    return LEAD_STAGES.map((stage) => ({
      ...stage,
      leads: filtered
        .filter((l) => l.stage === stage.name)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    }))
  }, [leads, search])

  // Pipeline totals
  const totalValue = useMemo(
    () => leads.reduce((sum, l) => sum + (l.value || 0), 0),
    [leads]
  )

  // ── Drag handlers ──────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (_e: DragEvent<HTMLDivElement>, lead: Lead) => {
      setDraggingLead({ id: lead.id, fromStage: lead.stage })
    },
    []
  )

  const handleDragEnd = useCallback(() => {
    setDraggingLead(null)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, toStage: LeadStage) => {
      e.preventDefault()
      if (!draggingLead) return

      const leadId = e.dataTransfer.getData('text/plain') || draggingLead.id
      const fromStage = draggingLead.fromStage

      if (fromStage === toStage) {
        setDraggingLead(null)
        return
      }

      moveLead(leadId, toStage).catch(() => toast.error('Failed to move lead'))
      setDraggingLead(null)
    },
    [draggingLead, moveLead]
  )

  // ── CRUD handlers ──────────────────────────────────────────────────

  const handleCreateLead = useCallback(
    async (data: { name: string; stage: LeadStage }) => {
      const lead = await createLead({ name: data.name, stage: data.stage } as Lead & { name: string })
      if (lead) {
        toast.success('Lead created')
      } else {
        toast.error('Failed to create lead')
      }
    },
    [createLead]
  )

  const handleUpdateLead = useCallback(
    async (id: string, updates: Partial<Lead>) => {
      const result = await updateLead(id, updates)
      if (result) {
        toast.success('Lead updated')
        setEditingLead(null)
      } else {
        toast.error('Failed to update lead')
      }
    },
    [updateLead]
  )

  const handleDeleteLead = useCallback(
    async (id: string) => {
      await deleteLead(id)
      setEditingLead(null)
      toast.success('Lead deleted')
    },
    [deleteLead]
  )

  // ── Mobile swipe handlers ──────────────────────────────────────────

  const handleTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }, [])

  const handleTouchMove = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current
  }, [])

  const handleTouchEnd = useCallback(() => {
    const delta = touchDeltaX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      setActiveColumnIndex((prev) => {
        if (delta < 0) return Math.min(prev + 1, LEAD_STAGES.length - 1)
        return Math.max(prev - 1, 0)
      })
    }
    touchDeltaX.current = 0
  }, [])

  const activeColumn = stageData[activeColumnIndex]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Pipeline header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {leads.length} leads
          </span>
          {totalValue > 0 && (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              ${totalValue.toLocaleString()} pipeline
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="h-8 w-40 rounded-md border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring sm:w-56"
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Board area */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop: horizontal columns */}
        {!isMobile && (
          <div className="grid h-full gap-4 p-4" style={{ gridTemplateColumns: `repeat(${LEAD_STAGES.length}, minmax(0, 1fr))` }}>
            {stageData.map((col) => (
              <LeadColumn
                key={col.name}
                stage={col.name}
                label={col.label}
                borderColor={col.borderColor}
                leads={col.leads}
                onEditLead={setEditingLead}
                onCreateLead={handleCreateLead}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                draggingLeadId={draggingLead?.id ?? null}
              />
            ))}
          </div>
        )}

        {/* Mobile: single column with swipe */}
        {isMobile && activeColumn && (
          <div
            className="flex h-full flex-col"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Mobile column header */}
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <button
                onClick={() => setActiveColumnIndex((p) => Math.max(0, p - 1))}
                disabled={activeColumnIndex === 0}
                className={cn(
                  'rounded p-1 text-muted-foreground transition-colors',
                  activeColumnIndex === 0 ? 'opacity-30' : 'hover:bg-accent'
                )}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-sm font-semibold text-foreground">
                {activeColumn.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({activeColumn.leads.length})
                </span>
              </h2>

              <button
                onClick={() => setActiveColumnIndex((p) => Math.min(p + 1, LEAD_STAGES.length - 1))}
                disabled={activeColumnIndex === LEAD_STAGES.length - 1}
                className={cn(
                  'rounded p-1 text-muted-foreground transition-colors',
                  activeColumnIndex === LEAD_STAGES.length - 1 ? 'opacity-30' : 'hover:bg-accent'
                )}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Mobile column content */}
            <div className="flex-1 overflow-y-auto p-4">
              <LeadColumn
                stage={activeColumn.name}
                label={activeColumn.label}
                borderColor={activeColumn.borderColor}
                leads={activeColumn.leads}
                onEditLead={setEditingLead}
                onCreateLead={handleCreateLead}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                draggingLeadId={draggingLead?.id ?? null}
              />
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-2 pb-4 pt-2">
              {LEAD_STAGES.map((stage, i) => (
                <button
                  key={stage.name}
                  onClick={() => setActiveColumnIndex(i)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === activeColumnIndex
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                  aria-label={`Switch to ${stage.label}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lead detail modal */}
      {editingLead && (
        <LeadModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onUpdate={handleUpdateLead}
          onDelete={handleDeleteLead}
          onFetchTimeline={fetchTimeline}
          onScheduleMeeting={scheduleMeeting}
        />
      )}

      {/* Create lead modal */}
      {isCreating && (
        <LeadModal
          lead={null}
          defaultStage={createStage}
          onClose={() => setIsCreating(false)}
          onCreate={(data) => {
            handleCreateLead({ name: data.name, stage: data.stage || 'new' })
            setIsCreating(false)
          }}
        />
      )}
    </div>
  )
}
