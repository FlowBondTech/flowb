/**
 * Format event duration in human-readable form
 */
export const formatEventDuration = (startDate: string | Date, endDate: string | Date): string => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const diffMs = end.getTime() - start.getTime()
  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  const hours = totalHours % 24
  const minutes = totalMinutes % 60

  if (totalDays > 0) {
    if (totalDays === 1) {
      return hours > 0 ? `1 day ${hours} ${hours === 1 ? 'hour' : 'hours'}` : '1 day'
    }
    return `${totalDays} days`
  }

  if (totalHours > 0) {
    if (minutes > 0) {
      return totalHours === 1 ? `1 hour ${minutes} min` : `${totalHours} hours ${minutes} min`
    }
    return totalHours === 1 ? '1 hour' : `${totalHours} hours`
  }

  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}

/**
 * Check if a date is today
 */
const isToday = (date: Date): boolean => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if a date is tomorrow
 */
const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  )
}

/**
 * Format a date to a readable string
 */
const formatDate = (date: Date, formatStr: string): string => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const monthsFull = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  const weekday = date.getDay()

  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12 // Convert to 12-hour format

  const minutesStr = minutes < 10 ? `0${minutes}` : minutes.toString()

  // Simple format replacements
  let result = formatStr
  result = result.replace('EEE', days[weekday])
  result = result.replace('EEEE', daysFull[weekday])
  result = result.replace('MMM', months[month])
  result = result.replace('MMMM', monthsFull[month])
  result = result.replace('d', day.toString())
  result = result.replace('dd', day < 10 ? `0${day}` : day.toString())
  result = result.replace('yyyy', year.toString())
  result = result.replace('h:mm a', `${hours}:${minutesStr} ${ampm}`)
  result = result.replace('h:mm', `${hours}:${minutesStr}`)

  return result
}

/**
 * Check if two dates are on the same day
 */
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Format time in 12-hour format
 */
const formatTime = (date: Date): string => {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes.toString()
  return `${hours}:${minutesStr} ${ampm}`
}

/**
 * Format start and end times with local timezone
 */
export const formatEventTimes = (startDate: string | Date, endDate: string | Date) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const startDateStr = formatDate(start, 'EEE, MMM d, yyyy')
  const startTime = formatTime(start)
  const endTime = formatTime(end)

  // Check if event spans multiple days
  const sameDay = isSameDay(start, end)

  if (sameDay) {
    // Add friendly date labels
    let dateLabel = startDateStr
    if (isToday(start)) {
      dateLabel = `Today, ${formatDate(start, 'MMM d')}`
    } else if (isTomorrow(start)) {
      dateLabel = `Tomorrow, ${formatDate(start, 'MMM d')}`
    }

    return {
      date: dateLabel,
      time: `${startTime} - ${endTime}`,
      duration: formatEventDuration(start, end),
    }
  } else {
    // Multi-day event
    return {
      date: `${formatDate(start, 'MMM d')} - ${formatDate(end, 'MMM d, yyyy')}`,
      time: `${startTime} - ${endTime}`,
      duration: formatEventDuration(start, end),
    }
  }
}

/**
 * Get timezone abbreviation
 */
export const getTimezone = (): string => {
  try {
    const date = new Date()
    const timeString = date.toLocaleTimeString('en-us', { timeZoneName: 'short' })
    const parts = timeString.split(' ')
    const timezone = parts[parts.length - 1] // Get the last part which should be timezone
    return timezone || 'Local'
  } catch {
    return 'Local'
  }
}
