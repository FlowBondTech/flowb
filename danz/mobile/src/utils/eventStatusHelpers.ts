/**
 * Helper functions to determine event status based on timestamps
 */

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

/**
 * Determines the status of an event based on its start and end times
 * @param startDateTime - Event start date/time as string or Date
 * @param endDateTime - Event end date/time as string or Date
 * @param isCancelled - Optional flag if event is cancelled
 * @returns The calculated status of the event
 */
export function getEventStatus(
  startDateTime: string | Date,
  endDateTime: string | Date,
  isCancelled?: boolean,
): EventStatus {
  if (isCancelled) {
    return 'cancelled'
  }

  const now = new Date()
  const start = new Date(startDateTime)
  const end = new Date(endDateTime)

  if (now < start) {
    return 'upcoming'
  } else if (now >= start && now <= end) {
    return 'ongoing'
  } else {
    return 'completed'
  }
}

/**
 * Checks if an event is in the past
 * @param endDateTime - Event end date/time as string or Date
 * @returns true if event has ended
 */
export function isEventPast(endDateTime: string | Date): boolean {
  return new Date(endDateTime) < new Date()
}

/**
 * Checks if an event is currently ongoing
 * @param startDateTime - Event start date/time as string or Date
 * @param endDateTime - Event end date/time as string or Date
 * @returns true if event is currently happening
 */
export function isEventOngoing(startDateTime: string | Date, endDateTime: string | Date): boolean {
  const now = new Date()
  const start = new Date(startDateTime)
  const end = new Date(endDateTime)
  return now >= start && now <= end
}

/**
 * Checks if an event is upcoming
 * @param startDateTime - Event start date/time as string or Date
 * @returns true if event hasn't started yet
 */
export function isEventUpcoming(startDateTime: string | Date): boolean {
  return new Date(startDateTime) > new Date()
}
