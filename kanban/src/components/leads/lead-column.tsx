import { useState, useCallback, useRef, type DragEvent, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Lead, LeadStage } from '@/types/kanban'
import { LeadCard } from './lead-card'

interface LeadColumnProps {
  stage: LeadStage
  label: string
  borderColor: string
  leads: Lead[]
  onEditLead: (lead: Lead) => void
  onCreateLead: (data: { name: string; stage: LeadStage }) => void
  onDragStart: (e: DragEvent<HTMLDivElement>, lead: Lead) => void
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>, stage: LeadStage) => void
  draggingLeadId: string | null
}

function formatTotal(leads: Lead[]): string {
  const total = leads.reduce((sum, l) => sum + (l.value || 0), 0)
  if (total === 0) return ''
  if (total >= 1000) return `$${(total / 1000).toFixed(total % 1000 === 0 ? 0 : 1)}k`
  return `$${total}`
}

export function LeadColumn({
  stage,
  label,
  borderColor,
  leads,
  onEditLead,
  onCreateLead,
  onDragStart,
  onDragEnd,
  onDrop,
  draggingLeadId,
}: LeadColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const totalValue = formatTotal(leads)

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      onDrop(e, stage)
    },
    [onDrop, stage]
  )

  const handleAddSubmit = useCallback(() => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onCreateLead({ name: trimmed, stage })
    setNewName('')
    inputRef.current?.focus()
  }, [newName, stage, onCreateLead])

  const handleAddKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddSubmit()
      }
      if (e.key === 'Escape') {
        setIsAdding(false)
        setNewName('')
      }
    },
    [handleAddSubmit]
  )

  return (
    <div
      data-stage={stage}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex h-full w-72 flex-shrink-0 flex-col rounded-xl border-t-2 bg-muted/30',
        'md:w-full md:min-w-0',
        borderColor,
        isDragOver && 'bg-accent/40 ring-2 ring-ring/30',
        'transition-colors duration-150'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium bg-muted text-muted-foreground">
            {leads.length}
          </span>
        </div>
        {totalValue && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {totalValue}
          </span>
        )}
      </div>

      {/* Scrollable lead list */}
      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {leads.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">No leads</p>
          </div>
        )}

        {leads.length === 0 && isDragOver && (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-ring/40 py-8">
            <p className="text-xs text-muted-foreground">Drop here</p>
          </div>
        )}

        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onEdit={onEditLead}
            isDragging={draggingLeadId === lead.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>

      {/* Quick-add at bottom */}
      <div className="border-t px-2 py-2">
        {isAdding ? (
          <div className="rounded-lg border bg-card p-2 shadow-sm">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="Lead name..."
              autoFocus
              className="w-full rounded-md border-0 bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:ring-0"
            />
            <div className="mt-1.5 flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setIsAdding(false); setNewName('') }}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                onClick={handleAddSubmit}
                disabled={!newName.trim()}
                className="h-7 px-3 text-xs"
              >
                Add
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-4 w-4" />
            Add lead
          </button>
        )}
      </div>
    </div>
  )
}
