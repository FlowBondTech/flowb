'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiHeart,
  FiHelpCircle,
  FiMapPin,
  FiRepeat,
  FiShare2,
  FiStar,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi'

export type RegistrationStatusType =
  | 'registered'
  | 'maybe'
  | 'waitlisted'
  | 'cancelled'
  | 'attended'
  | 'no-show'
  | null

interface EventCardProps {
  event: {
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
  onRegister: (event: any, status?: 'registered' | 'maybe') => void
  onCancel?: (event: any) => void
  onUpdateStatus?: (event: any, status: 'registered' | 'maybe') => void
  variant?: 'default' | 'compact' | 'featured'
}

const CATEGORY_EMOJIS: Record<string, string> = {
  class: '💃',
  social: '🎉',
  workshop: '📚',
  competition: '🏆',
  performance: '🎭',
  fitness: '💪',
  salsa: '🌶️',
  hip_hop: '🎤',
  contemporary: '🩰',
  ballet: '🦢',
  jazz: '🎷',
  ballroom: '👯',
  street: '🛹',
  cultural: '🌍',
}

export default function EventCard({
  event,
  onRegister,
  onCancel,
  onUpdateStatus,
  variant = 'default',
}: EventCardProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) return
    router.push(`/dashboard/my-events/${event.id}`)
  }

  // Determine actual registration status
  const registrationStatus =
    event.user_registration_status || (event.is_registered ? 'registered' : null)
  const isGoing = registrationStatus === 'registered' || registrationStatus === 'attended'
  const isMaybe = registrationStatus === 'maybe'
  const hasRegistration = isGoing || isMaybe

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTimeUntil = (dateString: string) => {
    const now = new Date()
    const eventDate = new Date(dateString)
    const diff = eventDate.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h`
    return 'Starting soon'
  }

  const categoryEmoji = CATEGORY_EMOJIS[event.category || 'class'] || '🎵'
  const spotsLeft = event.max_capacity ? event.max_capacity - (event.registration_count || 0) : null
  const isAlmostFull = spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0
  const isFull = spotsLeft === 0

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl border border-white/10 hover:border-neon-purple/30 transition-colors cursor-pointer"
        onClick={() => router.push(`/dashboard/my-events/${event.id}`)}
      >
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center text-2xl">
          {categoryEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">{event.title}</h3>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <FiClock className="w-3 h-3" />
              {getTimeUntil(event.start_date_time)}
            </span>
            <span className="flex items-center gap-1">
              <FiMapPin className="w-3 h-3" />
              {event.is_virtual ? 'Virtual' : event.location_city || event.location_name}
            </span>
          </div>
        </div>
        {isGoing ? (
          <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-1">
            <FiCheck className="w-3 h-3" />
            Going
          </div>
        ) : isMaybe ? (
          <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm flex items-center gap-1">
            <FiHelpCircle className="w-3 h-3" />
            Maybe
          </div>
        ) : (
          <div className="text-neon-purple font-medium">
            {event.price_usd && event.price_usd > 0 ? `$${event.price_usd}` : 'Free'}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleCardClick}
      className={`group relative bg-bg-secondary rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer ${
        event.is_featured
          ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10'
          : 'border-white/10 hover:border-neon-purple/40'
      }`}
    >
      {/* Featured Badge */}
      {event.is_featured && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">
          <FiStar className="w-3 h-3" />
          Featured
        </div>
      )}

      {/* Recurring Badge */}
      {event.is_recurring && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 bg-neon-purple/80 text-text-primary text-xs font-medium rounded-full">
          <FiRepeat className="w-3 h-3" />
          Series
        </div>
      )}

      {/* Image/Header */}
      <div className="relative h-40 bg-gradient-to-br from-neon-purple/30 via-neon-pink/20 to-neon-blue/30 overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl opacity-50">{categoryEmoji}</span>
          </div>
        )}

        {/* Overlay on hover */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-black/50 flex items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={e => {
              e.stopPropagation()
              setIsLiked(!isLiked)
            }}
            className={`p-3 rounded-full ${
              isLiked
                ? 'bg-red-500 text-text-primary'
                : 'bg-white/20 text-text-primary hover:bg-white/30'
            }`}
          >
            <FiHeart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={e => e.stopPropagation()}
            className="p-3 rounded-full bg-white/20 text-text-primary hover:bg-white/30"
          >
            <FiShare2 className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Time badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm text-text-primary text-xs rounded-lg">
          <FiClock className="w-3 h-3 text-neon-purple" />
          {getTimeUntil(event.start_date_time)}
        </div>

        {/* Price badge */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm text-text-primary text-sm font-bold rounded-lg">
          {event.price_usd && event.price_usd > 0 ? (
            <span className="text-green-400">${event.price_usd}</span>
          ) : (
            <span className="text-green-400">Free</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-text-primary mb-2 line-clamp-1 group-hover:text-neon-purple transition-colors">
          {event.title}
        </h3>

        {event.description && (
          <p className="text-sm text-text-secondary mb-4 line-clamp-2">{event.description}</p>
        )}

        {/* Info Grid */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <FiCalendar className="w-4 h-4 text-neon-purple flex-shrink-0" />
            <span className="truncate">{formatDate(event.start_date_time)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <FiMapPin className="w-4 h-4 text-neon-purple flex-shrink-0" />
            <span className="truncate">
              {event.is_virtual ? '🌐 Virtual Event' : event.location_name}
              {event.location_city && !event.is_virtual && ` • ${event.location_city}`}
            </span>
          </div>

          {event.facilitator && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              {event.facilitator.avatar_url ? (
                <img src={event.facilitator.avatar_url} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-neon-purple/30" />
              )}
              <span className="truncate">
                by {event.facilitator.display_name || event.facilitator.username}
              </span>
            </div>
          )}
        </div>

        {/* Dance Styles */}
        {event.dance_styles && event.dance_styles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {event.dance_styles.slice(0, 3).map(style => (
              <span
                key={style}
                className="px-2 py-0.5 bg-neon-purple/10 text-neon-purple text-xs rounded-full"
              >
                {style}
              </span>
            ))}
            {event.dance_styles.length > 3 && (
              <span className="px-2 py-0.5 bg-white/5 text-text-secondary text-xs rounded-full">
                +{event.dance_styles.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Capacity Bar */}
        {event.max_capacity && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-secondary">
                <FiUsers className="w-3 h-3 inline mr-1" />
                {event.registration_count || 0} / {event.max_capacity} spots
              </span>
              {isAlmostFull && (
                <span className="text-orange-400 font-medium flex items-center gap-1">
                  <FiZap className="w-3 h-3" />
                  {spotsLeft} left!
                </span>
              )}
              {isFull && <span className="text-red-400 font-medium">Sold out</span>}
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${((event.registration_count || 0) / event.max_capacity) * 100}%`,
                }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`h-full rounded-full ${
                  isFull
                    ? 'bg-red-500'
                    : isAlmostFull
                      ? 'bg-orange-500'
                      : 'bg-gradient-to-r from-neon-purple to-neon-pink'
                }`}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {hasRegistration ? (
          <div className="relative">
            <button
              onClick={e => {
                e.stopPropagation()
                setShowStatusMenu(!showStatusMenu)
              }}
              className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                isGoing
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
              }`}
            >
              {isGoing ? (
                <>
                  <FiCheck className="w-5 h-5" />
                  Going
                </>
              ) : (
                <>
                  <FiHelpCircle className="w-5 h-5" />
                  Maybe
                </>
              )}
              <FiChevronDown
                className={`w-4 h-4 ml-1 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Status Dropdown Menu */}
            {showStatusMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-bg-primary rounded-xl border border-white/10 overflow-hidden shadow-xl z-20"
              >
                {!isGoing && onUpdateStatus && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onUpdateStatus(event, 'registered')
                      setShowStatusMenu(false)
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-500/10 transition-colors text-left"
                  >
                    <FiCheck className="w-5 h-5 text-green-400" />
                    <span className="text-text-primary">Change to Going</span>
                  </button>
                )}
                {!isMaybe && onUpdateStatus && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onUpdateStatus(event, 'maybe')
                      setShowStatusMenu(false)
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-yellow-500/10 transition-colors text-left"
                  >
                    <FiHelpCircle className="w-5 h-5 text-yellow-400" />
                    <span className="text-text-primary">Change to Maybe</span>
                  </button>
                )}
                {onCancel && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onCancel(event)
                      setShowStatusMenu(false)
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-left border-t border-white/5"
                  >
                    <FiX className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">Cancel Registration</span>
                  </button>
                )}
              </motion.div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onRegister(event)}
            disabled={isFull}
            className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              isFull
                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-neon-purple to-neon-pink text-white hover:opacity-90 hover:shadow-lg hover:shadow-neon-purple/30'
            }`}
          >
            {isFull ? (
              'Sold Out'
            ) : (
              <>
                <FiZap className="w-5 h-5" />
                Join Event
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  )
}
