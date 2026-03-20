'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import {
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiHelpCircle,
  FiMapPin,
} from 'react-icons/fi'
import type { RegistrationStatusType } from './EventCard'

interface Event {
  id: string
  title: string
  description?: string | null
  category?: string | null
  location_name?: string | null
  location_city?: string | null
  start_date_time: string
  end_date_time?: string | null
  max_capacity?: number | null
  registration_count?: number | null
  price_usd?: number | null
  dance_styles?: string[] | null
  is_featured?: boolean | null
  is_recurring?: boolean | null
  is_registered?: boolean | null
  user_registration_status?: RegistrationStatusType
  is_virtual?: boolean | null
}

interface EventsCalendarViewProps {
  events: Event[]
  onRegister: (event: Event) => void
  onEventClick: (event: Event) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  class: 'bg-purple-500',
  social: 'bg-pink-500',
  workshop: 'bg-blue-500',
  competition: 'bg-yellow-500',
  performance: 'bg-red-500',
  fitness: 'bg-green-500',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
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

export default function EventsCalendarView({
  events,
  onRegister,
  onEventClick,
}: EventsCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { calendarDays, eventsMap } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of month
    const firstDay = new Date(year, month, 1)
    // Last day of month
    const lastDay = new Date(year, month + 1, 0)

    // Days to show from previous month
    const startPadding = firstDay.getDay()
    // Days to show from next month
    const endPadding = 6 - lastDay.getDay()

    const days: Date[] = []

    // Previous month days
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    // Next month days
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i))
    }

    // Map events by date
    const map: Record<string, Event[]> = {}
    events.forEach(event => {
      const date = new Date(event.start_date_time)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(event)
    })

    return { calendarDays: days, eventsMap: map }
  }, [currentDate, events])

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const getEventsForDate = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    return eventsMap[key] || []
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2 bg-bg-secondary rounded-2xl border border-white/10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-text-primary">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-neon-purple/20 text-neon-purple rounded-lg hover:bg-neon-purple/30 transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(day => (
            <div key={day} className="text-center text-sm text-text-secondary py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            const dayEvents = getEventsForDate(date)
            const hasEvents = dayEvents.length > 0

            return (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDate(date)}
                className={`
                  aspect-square p-1 rounded-lg relative transition-colors
                  ${isCurrentMonth(date) ? 'text-text-primary' : 'text-text-secondary/50'}
                  ${isToday(date) ? 'bg-neon-purple/30 border border-neon-purple' : ''}
                  ${isSelected(date) ? 'bg-neon-purple text-text-primary' : 'hover:bg-white/10'}
                `}
              >
                <span className="text-sm">{date.getDate()}</span>
                {hasEvents && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          CATEGORY_COLORS[event.category || 'class'] || 'bg-neon-purple'
                        }`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-text-secondary">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/10">
          {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
            <div key={category} className="flex items-center gap-2 text-sm text-text-secondary">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="capitalize">{category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Date Events */}
      <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <FiCalendar className="w-5 h-5 text-neon-purple" />
          {selectedDate
            ? selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            : 'Select a date'}
        </h3>

        <AnimatePresence mode="wait">
          {selectedDate ? (
            selectedDateEvents.length > 0 ? (
              <motion.div
                key="events"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {selectedDateEvents.map(event => (
                  <motion.div
                    key={event.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onEventClick(event)}
                    className="p-4 bg-bg-primary rounded-xl border border-white/10 hover:border-neon-purple/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-full min-h-[60px] rounded-full ${
                          CATEGORY_COLORS[event.category || 'class'] || 'bg-neon-purple'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-text-primary truncate">{event.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                          <FiClock className="w-3 h-3" />
                          {new Date(event.start_date_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                          <FiMapPin className="w-3 h-3" />
                          <span className="truncate">
                            {event.is_virtual
                              ? 'Virtual'
                              : event.location_name || event.location_city}
                          </span>
                        </div>
                        {(() => {
                          const status =
                            event.user_registration_status ||
                            (event.is_registered ? 'registered' : null)
                          const isGoing = status === 'registered' || status === 'attended'
                          const isMaybe = status === 'maybe'

                          if (isGoing) {
                            return (
                              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                <FiCheck className="w-3 h-3" />
                                Going
                              </span>
                            )
                          } else if (isMaybe) {
                            return (
                              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                                <FiHelpCircle className="w-3 h-3" />
                                Maybe
                              </span>
                            )
                          } else {
                            return (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  onRegister(event)
                                }}
                                className="mt-2 px-3 py-1 bg-neon-purple/20 text-neon-purple text-xs rounded-full hover:bg-neon-purple/30 transition-colors"
                              >
                                {event.price_usd && event.price_usd > 0
                                  ? `$${event.price_usd}`
                                  : 'Free'}{' '}
                                - Join
                              </button>
                            )
                          }
                        })()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-8"
              >
                <div className="text-4xl mb-3">📅</div>
                <p className="text-text-secondary">No events on this day</p>
                <p className="text-sm text-text-secondary/70 mt-1">Create one and earn XP!</p>
              </motion.div>
            )
          ) : (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="text-4xl mb-3">👈</div>
              <p className="text-text-secondary">Click a date to see events</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
