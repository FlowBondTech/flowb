/**
 * Formats a date string into a human-readable relative time.
 * e.g., "2 hours ago", "3 days ago", "just now"
 */
export function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`

  return date.toLocaleDateString()
}

/**
 * Calculates approval rate as a percentage string.
 */
export function calcApprovalRate(approved: number, total: number): string {
  if (total === 0) return '--'
  return `${Math.round((approved / total) * 100)}%`
}
