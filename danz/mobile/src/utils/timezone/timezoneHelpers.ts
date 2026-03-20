/**
 * Timezone Helper Functions
 *
 * Strategy:
 * 1. Store all times in UTC (ISO 8601 format) in the database
 * 2. Convert to user's local timezone for display
 * 3. Convert from local to UTC when saving
 */

/**
 * Convert UTC datetime string to local Date object
 */
export const utcToLocal = (utcDateString: string): Date => {
  // JavaScript Date automatically converts UTC to local
  return new Date(utcDateString)
}

/**
 * Convert local Date to UTC ISO string for storage
 */
export const localToUTC = (localDate: Date): string => {
  // toISOString() always returns UTC
  return localDate.toISOString()
}

/**
 * Format datetime for display in user's local timezone
 */
export const formatLocalDateTime = (utcDateString: string): string => {
  const localDate = new Date(utcDateString)

  return localDate.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short', // Shows timezone abbreviation
  })
}

/**
 * Format just the date in local timezone
 */
export const formatLocalDate = (utcDateString: string): string => {
  const localDate = new Date(utcDateString)

  return localDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format just the time in local timezone
 */
export const formatLocalTime = (utcDateString: string): string => {
  const localDate = new Date(utcDateString)

  return localDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get user's timezone
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Display timezone offset from UTC
 */
export const getTimezoneOffset = (): string => {
  const offset = new Date().getTimezoneOffset()
  const hours = Math.floor(Math.abs(offset) / 60)
  const minutes = Math.abs(offset) % 60
  const sign = offset <= 0 ? '+' : '-'

  return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Check if two dates are on the same day in local timezone
 */
export const isSameLocalDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)

  return d1.toLocaleDateString() === d2.toLocaleDateString()
}

/**
 * Format event date range for display
 */
export const formatEventDateTimeRange = (
  startUTC: string,
  endUTC: string,
  showTimezone: boolean = false,
): string => {
  const start = new Date(startUTC)
  const end = new Date(endUTC)

  // Same day event
  if (isSameLocalDay(startUTC, endUTC)) {
    const date = start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: showTimezone ? 'short' : undefined,
    })

    return `${date} • ${startTime} - ${endTime}`
  }

  // Multi-day event
  const startStr = start.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const endStr = end.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: showTimezone ? 'short' : undefined,
  })

  return `${startStr} - ${endStr}`
}

/**
 * Get relative time description (e.g., "in 2 hours", "tomorrow")
 */
export const getRelativeTime = (utcDateString: string): string => {
  const now = new Date()
  const eventDate = new Date(utcDateString)
  const diffMs = eventDate.getTime() - now.getTime()

  // Past event
  if (diffMs < 0) {
    const absDiff = Math.abs(diffMs)
    const hours = Math.floor(absDiff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      return 'Just ended'
    }
  }

  // Future event
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 60) {
    return minutes <= 1 ? 'Starting now' : `in ${minutes} minutes`
  } else if (hours < 24) {
    return hours === 1 ? 'in 1 hour' : `in ${hours} hours`
  } else if (days === 1) {
    return 'Tomorrow'
  } else if (days < 7) {
    return `in ${days} days`
  } else {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? 'Next week' : `in ${weeks} weeks`
  }
}

/**
 * Create a local datetime string for datetime-local input
 */
export const toDateTimeLocalValue = (utcDateString: string): string => {
  const date = new Date(utcDateString)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}
