'use client'

import { motion } from 'motion/react'
import EventCard from './EventCard'

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
  skill_level?: string | null
  is_featured?: boolean | null
  is_recurring?: boolean | null
  is_registered?: boolean | null
  user_registration_status?: RegistrationStatusType
  is_virtual?: boolean | null
  image_url?: string | null
  facilitator?: {
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
  } | null
}

interface EventsGridViewProps {
  events: Event[]
  onRegister: (event: Event, status?: 'registered' | 'maybe') => void
  onCancel?: (event: Event) => void
  onUpdateStatus?: (event: Event, status: 'registered' | 'maybe') => void
  isLoading?: boolean
}

export default function EventsGridView({
  events,
  onRegister,
  onCancel,
  onUpdateStatus,
  isLoading,
}: EventsGridViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-bg-secondary rounded-2xl border border-white/10 overflow-hidden animate-pulse"
          >
            <div className="h-40 bg-white/5" />
            <div className="p-5 space-y-4">
              <div className="h-5 bg-white/10 rounded w-3/4" />
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
              <div className="h-10 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="text-6xl mb-4">🎭</div>
        <h3 className="text-xl font-bold text-text-primary mb-2">No events found</h3>
        <p className="text-text-secondary mb-6">
          Be the first to create an event and earn bonus XP!
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon-purple/20 text-neon-purple rounded-lg text-sm">
          <span className="text-yellow-500">+150 XP</span> for creating the first event!
        </div>
      </motion.div>
    )
  }

  // Sort: Featured first, then by date
  const sortedEvents = [...events].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1
    if (!a.is_featured && b.is_featured) return 1
    return new Date(a.start_date_time).getTime() - new Date(b.start_date_time).getTime()
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedEvents.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <EventCard
            event={event}
            onRegister={onRegister}
            onCancel={onCancel}
            onUpdateStatus={onUpdateStatus}
          />
        </motion.div>
      ))}
    </div>
  )
}
