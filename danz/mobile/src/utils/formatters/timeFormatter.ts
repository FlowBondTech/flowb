export const getTimeRemaining = (startDateTime: string): string | null => {
  try {
    const now = new Date()

    // Parse the event start date time (ISO 8601 format)
    const eventDateTime = new Date(startDateTime)

    // If event has already passed
    if (eventDateTime <= now) {
      return null
    }

    // Calculate difference in milliseconds
    const diff = eventDateTime.getTime() - now.getTime()

    // Convert to various units
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)

    // Return human-readable format
    if (minutes < 60) {
      return minutes === 1 ? 'in 1 minute' : `in ${minutes} minutes`
    } else if (hours < 24) {
      return hours === 1 ? 'in 1 hour' : `in ${hours} hours`
    } else if (days === 1) {
      return 'Tomorrow'
    } else if (days < 7) {
      return `in ${days} days`
    } else if (weeks === 1) {
      return 'Next week'
    } else if (weeks < 4) {
      return `in ${weeks} weeks`
    } else if (months === 1) {
      return 'Next month'
    } else if (months < 12) {
      return `in ${months} months`
    } else {
      const years = Math.floor(months / 12)
      return years === 1 ? 'Next year' : `in ${years} years`
    }
  } catch (error) {
    console.error('Error calculating time remaining:', error)
    return null
  }
}

export const isEventToday = (startDateTime: string): boolean => {
  const today = new Date()
  const event = new Date(startDateTime)

  return (
    event.getDate() === today.getDate() &&
    event.getMonth() === today.getMonth() &&
    event.getFullYear() === today.getFullYear()
  )
}

export const isEventTomorrow = (startDateTime: string): boolean => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const event = new Date(startDateTime)

  return (
    event.getDate() === tomorrow.getDate() &&
    event.getMonth() === tomorrow.getMonth() &&
    event.getFullYear() === tomorrow.getFullYear()
  )
}

export const getTimeUntilEvent = (startDateTime: string): string => {
  const timeRemaining = getTimeRemaining(startDateTime)

  if (!timeRemaining) {
    return ''
  }

  // Special cases for today and tomorrow
  if (isEventToday(startDateTime)) {
    const eventDateTime = new Date(startDateTime)
    const now = new Date()
    const hoursUntil = Math.floor((eventDateTime.getTime() - now.getTime()) / 3600000)

    if (hoursUntil <= 0) {
      return 'Starting soon'
    } else if (hoursUntil === 1) {
      return 'Starts in 1 hour'
    } else if (hoursUntil < 24) {
      return `Starts in ${hoursUntil} hours`
    }
    return 'Today'
  }

  if (isEventTomorrow(startDateTime)) {
    return 'Tomorrow'
  }

  return timeRemaining
}

export const formatEventDateRange = (startDateTime: string, endDateTime: string): string => {
  const start = new Date(startDateTime)
  const end = new Date(endDateTime)

  const startDate = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endDate = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Same day event
  if (start.toDateString() === end.toDateString()) {
    return `${startDate}, ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }

  // Multi-day event
  return `${startDate} - ${endDate}`
}
