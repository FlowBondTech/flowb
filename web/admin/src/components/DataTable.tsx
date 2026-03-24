import { useState, useMemo, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  className?: string
  render?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  onRowClick?: (row: T) => void
  emptyText?: string
  loading?: boolean
  /** If true, use server pagination and don't paginate client-side */
  serverPagination?: boolean
  toolbar?: ReactNode
  bulkActions?: ReactNode
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  rowKey?: (row: T) => string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns, data, pageSize = 30, onRowClick, emptyText = 'No data',
  loading, serverPagination, toolbar, bulkActions, selectedIds, onSelectionChange, rowKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sortKey || serverPagination) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir, serverPagination])

  const totalPages = serverPagination ? 1 : Math.ceil(sorted.length / pageSize)
  const rows = serverPagination ? sorted : sorted.slice(page * pageSize, (page + 1) * pageSize)

  const hasSelection = onSelectionChange && selectedIds && rowKey
  const allSelected = hasSelection && rows.length > 0 && rows.every(r => selectedIds.has(rowKey(r)))

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div>
      {(toolbar || (bulkActions && selectedIds && selectedIds.size > 0)) && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {toolbar}
          {bulkActions && selectedIds && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[var(--color-muted-foreground)]">{selectedIds.size} selected</span>
              {bulkActions}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--color-glass-border)] glass">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {hasSelection && (
                <th className="w-10 px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) onSelectionChange(new Set())
                      else onSelectionChange(new Set(rows.map(r => rowKey(r))))
                    }}
                    className="accent-[var(--color-primary)]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3.5 py-2.5 text-left text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]/60 border-b border-[var(--color-border)] bg-black/20',
                    col.sortable && 'cursor-pointer select-none hover:text-[var(--color-muted-foreground)]',
                    col.className,
                  )}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        : <ChevronsUpDown size={14} className="opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {hasSelection && <td className="px-3 py-2.5"><div className="h-4 w-4 rounded bg-white/5 animate-pulse" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-3.5 py-2.5">
                      <div className="h-4 rounded bg-white/5 animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasSelection ? 1 : 0)} className="px-4 py-12 text-center text-[var(--color-muted-foreground)]">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey ? rowKey(row) : i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-white/[0.03] last:border-b-0 transition-colors',
                    onRowClick && 'cursor-pointer',
                    'hover:bg-white/[0.04]',
                  )}
                >
                  {hasSelection && (
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rowKey(row))}
                        onChange={() => {
                          const next = new Set(selectedIds)
                          if (next.has(rowKey(row))) next.delete(rowKey(row))
                          else next.add(rowKey(row))
                          onSelectionChange(next)
                        }}
                        className="accent-[var(--color-primary)]"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-3.5 py-2.5', col.className)}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!serverPagination && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
