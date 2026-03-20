'use client'

import { EventStatus, useGetEventsQuery } from '@/src/generated/graphql'
import { useRouter } from 'next/navigation'
import { FiCalendar, FiChevronRight, FiClock, FiMapPin, FiUsers } from 'react-icons/fi'

export default function UpcomingEventsWidget() {
  const router = useRouter()
  const { data, loading } = useGetEventsQuery({
    variables: {
      filter: {
        registered_by_me: true,
        status: EventStatus.Upcoming,
      },
      pagination: {
        limit: 5,
      },
    },
  })

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const events = data?.events?.events || []

  const getEventTypeColor = (category: string | null | undefined) => {
    switch (category) {
      case 'workshop':
        return 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400'
      case 'competition':
        return 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400'
      case 'class':
        return 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400'
      case 'social':
        return 'from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-400'
      default:
        return 'from-neon-purple/20 to-neon-purple/5 border-neon-purple/30 text-neon-purple'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <FiCalendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Upcoming Events</h2>
            <p className="text-sm text-text-secondary">{events.length} events scheduled</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/my-events')}
          className="flex items-center gap-2 px-4 py-2 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 rounded-lg text-neon-purple text-sm font-medium transition-colors"
        >
          <span>View All</span>
          <FiChevronRight size={16} />
        </button>
      </div>

      {events.length > 0 ? (
        <div className="space-y-3">
          {events.slice(0, 3).map(event => {
            const daysUntil = getDaysUntil(event.start_date_time)
            return (
              <div
                key={event.id}
                onClick={() => router.push(`/events/${event.slug}`)}
                className={`relative overflow-hidden bg-gradient-to-br ${getEventTypeColor(
                  event.category,
                )} border rounded-xl p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group`}
              >
                {/* Countdown Badge */}
                {daysUntil <= 2 && daysUntil >= 0 && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-bg-primary/90 backdrop-blur-sm border border-white/20 rounded-lg">
                    <span className="text-xs font-medium text-text-primary">
                      {daysUntil === 0
                        ? 'Today!'
                        : daysUntil === 1
                          ? 'Tomorrow'
                          : `${daysUntil} days`}
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Date Box */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="text-2xl font-bold text-text-primary">
                      {new Date(event.start_date_time).getDate()}
                    </div>
                    <div className="text-xs text-text-secondary uppercase">
                      {new Date(event.start_date_time).toLocaleDateString('en-US', {
                        month: 'short',
                      })}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-text-primary mb-2 truncate group-hover:text-neon-purple transition-colors">
                      {event.title}
                    </h3>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <FiClock size={14} className="flex-shrink-0" />
                        <span>{formatTime(event.start_date_time)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <FiMapPin size={14} className="flex-shrink-0" />
                        <span className="truncate">
                          {event.location_name || event.location_city || 'Virtual'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <FiUsers size={14} className="flex-shrink-0" />
                        <span>{event.registration_count || 0} attending</span>
                      </div>
                    </div>
                  </div>

                  {/* Type Badge */}
                  {event.category && (
                    <div className="flex-shrink-0">
                      <span className="inline-block px-2.5 py-1 bg-bg-primary/50 backdrop-blur-sm border border-white/10 rounded-lg text-xs font-medium text-text-primary capitalize">
                        {event.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-purple/10 flex items-center justify-center">
            <FiCalendar className="w-8 h-8 text-neon-purple" />
          </div>
          <p className="text-text-secondary mb-4">No upcoming events</p>
          <button
            onClick={() => router.push('/dashboard/my-events')}
            className="px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl font-medium hover:shadow-lg hover:shadow-neon-purple/30 transition-all"
          >
            Discover Events
          </button>
        </div>
      )}
    </div>
  )
}
