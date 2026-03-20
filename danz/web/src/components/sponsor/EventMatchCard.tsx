'use client'

import { FiCalendar, FiCheck, FiMapPin, FiStar, FiUsers } from 'react-icons/fi'

interface EventData {
  id: string
  title: string
  description?: string | null
  imageUrl?: string | null
  location?: string | null
  startDateTime: string
  maxCapacity?: number | null
  registrationCount?: number
  category?: string | null
  danceStyles?: string[] | null
  facilitator?: {
    username?: string | null
    isVerifiedCreator?: boolean
  } | null
  sponsorshipSettings?: {
    seekingSponsorship: boolean
    sponsorshipGoal?: number | null
    currentSponsorshipTotal?: number
  } | null
}

interface EventMatchCardProps {
  event: EventData
  matchScore: number
  matchReasons: string[]
  estimatedReach?: number | null
  onViewClick?: () => void
  onSponsorClick?: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  workshop: 'Workshop',
  battle: 'Battle',
  social: 'Social',
  performance: 'Performance',
  class: 'Class',
  competition: 'Competition',
  open_floor: 'Open Floor',
  showcase: 'Showcase',
}

export default function EventMatchCard({
  event,
  matchScore,
  matchReasons,
  estimatedReach,
  onViewClick,
  onSponsorClick,
}: EventMatchCardProps) {
  const formattedDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const progressPercent = event.sponsorshipSettings?.sponsorshipGoal
    ? Math.min(
        ((event.sponsorshipSettings.currentSponsorshipTotal || 0) /
          event.sponsorshipSettings.sponsorshipGoal) *
          100,
        100,
      )
    : 0

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-500/20 border-green-500/30'
    if (score >= 70) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
    return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
  }

  return (
    <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden hover:border-neon-purple/30 transition-colors">
      {/* Image */}
      <div className="relative h-40 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-30">🎭</span>
          </div>
        )}

        {/* Match Score Badge */}
        <div
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full border text-sm font-bold ${getMatchScoreColor(matchScore)}`}
        >
          {matchScore}% Match
        </div>

        {/* Category Badge */}
        {event.category && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white">
            {CATEGORY_LABELS[event.category] || event.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title & Creator */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-primary line-clamp-1">{event.title}</h3>
            {event.facilitator?.isVerifiedCreator && (
              <span className="text-blue-400" title="Verified Creator">
                <FiCheck className="w-4 h-4" />
              </span>
            )}
          </div>
          {event.facilitator?.username && (
            <p className="text-sm text-text-muted">by {event.facilitator.username}</p>
          )}
        </div>

        {/* Event Details */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-text-muted">
          <div className="flex items-center gap-1">
            <FiCalendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1">
              <FiMapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{event.location}</span>
            </div>
          )}
          {event.maxCapacity && (
            <div className="flex items-center gap-1">
              <FiUsers className="w-3.5 h-3.5" />
              <span>{event.maxCapacity}</span>
            </div>
          )}
        </div>

        {/* Match Reasons */}
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-2">Match Reasons:</p>
          <div className="flex flex-wrap gap-1.5">
            {matchReasons.slice(0, 3).map((reason, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-neon-purple/10 border border-neon-purple/20 text-neon-purple text-xs rounded-full flex items-center gap-1"
              >
                <FiCheck className="w-3 h-3" />
                {reason}
              </span>
            ))}
            {matchReasons.length > 3 && (
              <span className="px-2 py-0.5 text-text-muted text-xs">
                +{matchReasons.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Sponsorship Progress */}
        {event.sponsorshipSettings?.seekingSponsorship &&
          event.sponsorshipSettings?.sponsorshipGoal && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-text-muted">Sponsorship Progress</span>
                <span className="text-text-primary font-medium">
                  ${(event.sponsorshipSettings.currentSponsorshipTotal || 0).toLocaleString()} / $
                  {event.sponsorshipSettings.sponsorshipGoal.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-purple to-neon-pink transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

        {/* Estimated Reach */}
        {estimatedReach && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <FiStar className="w-4 h-4 text-yellow-400" />
            <span className="text-text-muted">
              Est. reach:{' '}
              <span className="text-text-primary font-medium">
                {estimatedReach.toLocaleString()} dancers
              </span>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onViewClick}
            className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-text-primary font-medium text-sm transition-colors"
          >
            View Details
          </button>
          <button
            onClick={onSponsorClick}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 rounded-lg text-white font-medium text-sm transition-opacity"
          >
            Sponsor
          </button>
        </div>
      </div>
    </div>
  )
}
