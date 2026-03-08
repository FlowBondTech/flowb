import { useCallback, type DragEvent } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Lead } from '@/types/kanban'

interface LeadCardProps {
  lead: Lead
  onEdit: (lead: Lead) => void
  isDragging?: boolean
  onDragStart?: (e: DragEvent<HTMLDivElement>, lead: Lead) => void
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void
}

function formatValue(value: number | null): string {
  if (value == null) return ''
  if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return `$${value}`
}

export function LeadCard({
  lead,
  onEdit,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: LeadCardProps) {
  const handleClick = useCallback(() => onEdit(lead), [onEdit, lead])

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('text/plain', lead.id)
      e.dataTransfer.effectAllowed = 'move'
      onDragStart?.(e, lead)
    },
    [onDragStart, lead]
  )

  const handleDragEnd = useCallback(
    (e: DragEvent<HTMLDivElement>) => onDragEnd?.(e),
    [onDragEnd]
  )

  return (
    <div
      data-lead-id={lead.id}
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'group relative cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        'active:shadow-sm active:translate-y-0',
        isDragging && 'opacity-50 rotate-2 shadow-lg scale-105'
      )}
    >
      {/* Name */}
      <h3 className="pr-5 text-sm font-semibold leading-snug text-foreground line-clamp-1">
        {lead.name}
      </h3>

      {/* Company */}
      {lead.company && (
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
          {lead.company}
        </p>
      )}

      {/* Metadata row */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {/* Value badge */}
        {lead.value != null && lead.value > 0 && (
          <Badge variant="green" className="h-5 px-1.5 py-0 text-[10px] font-semibold">
            {formatValue(lead.value)}
          </Badge>
        )}

        {/* Source */}
        {lead.source && (
          <Badge variant="gray" className="h-4 px-1 py-0 text-[9px] leading-none">
            {lead.source}
          </Badge>
        )}

        {/* Tags */}
        {lead.tags?.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="blue" className="h-4 px-1 py-0 text-[9px] leading-none">
            {tag}
          </Badge>
        ))}
        {lead.tags && lead.tags.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 2}</span>
        )}
      </div>

      {/* Relative time — bottom right */}
      <span className="absolute bottom-2.5 right-2.5 text-[10px] text-muted-foreground">
        {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: false })}
      </span>
    </div>
  )
}
