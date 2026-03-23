'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import {
  CreateSponsorshipModal,
  SponsorBadge,
  type SponsorshipFormData,
  SponsorshipProgressBar,
} from '@/src/components/sponsor'
import { DANCE_STYLES, EVENT_TYPES } from '@/src/constants/eventConstants'
import { SponsorTier, SponsorshipVisibility } from '@/src/generated/graphql'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiInfo,
  FiMapPin,
  FiStar,
  FiUser,
  FiUsers,
} from 'react-icons/fi'

// Mock event data - will be replaced with GraphQL query
const mockEvent = {
  id: '1',
  title: 'Hip Hop Battle Championship',
  description:
    'Join us for the ultimate hip hop dance battle! Featuring top dancers from across the region competing for the championship title. Live DJ, amazing performances, and unforgettable energy.',
  imageUrl: '/images/events/hiphop-battle.jpg',
  category: 'BATTLE',
  location: 'Brooklyn Dance Center',
  address: '123 Dance St, Brooklyn, NY 11201',
  startDateTime: '2025-02-15T18:00:00Z',
  endDateTime: '2025-02-15T23:00:00Z',
  maxCapacity: 200,
  registrationCount: 156,
  danceStyles: ['HIP_HOP', 'BREAKING', 'POPPING'],
  eventType: 'BATTLE',
  ticketPrice: 25,
  facilitator: {
    id: 'f1',
    username: 'dancemaster',
    displayName: 'Dance Master NYC',
    avatarUrl: null,
    isVerifiedCreator: true,
    totalEventsHosted: 24,
    averageRating: 4.8,
  },
  sponsorshipSettings: {
    seekingSponsorship: true,
    sponsorshipGoal: 3000,
    currentSponsorshipTotal: 1200,
    acceptanceMode: 'MANUAL',
    pitchMessage:
      'Help us bring the best hip hop talent together! Your sponsorship will directly support prize money for winners and provide resources for emerging dancers.',
  },
  existingSponsors: [
    {
      sponsor: {
        id: 's1',
        companyName: 'Nike Dance',
        logoUrl: '/logos/nike.png',
        tier: SponsorTier.Gold,
      },
      flowAmount: 800,
      visibility: SponsorshipVisibility.Featured,
    },
    {
      sponsor: {
        id: 's2',
        companyName: 'Beat Studio',
        logoUrl: '/logos/beats.png',
        tier: SponsorTier.Silver,
      },
      flowAmount: 400,
      visibility: SponsorshipVisibility.Visible,
    },
  ],
  matchScore: 92,
  matchReasons: [
    'Hip Hop (your preferred style)',
    'Brooklyn (your preferred region)',
    'Battle events (your preferred type)',
  ],
}

export default function EventSponsorshipDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [showSponsorModal, setShowSponsorModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // TODO: Replace with actual GraphQL query
  const event = mockEvent

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getDanceStyleLabel = (style: string) => {
    return DANCE_STYLES.find(s => s.value === style)?.label || style
  }

  const getEventTypeLabel = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type)?.label || type
  }

  const handleSponsorSubmit = async (data: SponsorshipFormData) => {
    setIsSubmitting(true)
    try {
      // TODO: Implement createEventSponsorship mutation
      console.log('Creating sponsorship:', data)
      await new Promise(resolve => setTimeout(resolve, 1500))
      setShowSponsorModal(false)
      // Show success message or redirect
    } catch (error) {
      console.error('Failed to create sponsorship:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const remaining =
    (event.sponsorshipSettings?.sponsorshipGoal || 0) -
    (event.sponsorshipSettings?.currentSponsorshipTotal || 0)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary mb-6 transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span>Back to Events</span>
        </button>

        {/* Hero Section */}
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center">
              <span className="text-8xl">🎭</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Match Score Badge */}
          {event.matchScore && (
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-green-500/90 rounded-full">
              <span className="text-sm font-bold text-white">{event.matchScore}% Match</span>
            </div>
          )}

          {/* Event Title */}
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
              <div className="flex items-center gap-1">
                <FiCalendar className="w-4 h-4" />
                <span>{formatDate(event.startDateTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiClock className="w-4 h-4" />
                <span>
                  {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <FiMapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-bg-secondary border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">About This Event</h2>
              <p className="text-text-muted leading-relaxed">{event.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple rounded-full text-sm">
                  {getEventTypeLabel(event.eventType)}
                </span>
                {event.danceStyles.map(style => (
                  <span
                    key={style}
                    className="px-3 py-1 bg-white/10 text-text-primary rounded-full text-sm"
                  >
                    {getDanceStyleLabel(style)}
                  </span>
                ))}
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-bg-secondary border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Event Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <FiUsers className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Capacity</p>
                    <p className="font-medium text-text-primary">
                      {event.registrationCount} / {event.maxCapacity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <FiDollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Ticket Price</p>
                    <p className="font-medium text-text-primary">
                      {event.ticketPrice ? `$${event.ticketPrice}` : 'Free'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 col-span-2">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <FiMapPin className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Location</p>
                    <p className="font-medium text-text-primary">{event.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Organizer */}
            <div className="bg-bg-secondary border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Event Organizer</h2>

              <div className="flex items-center gap-4">
                {event.facilitator.avatarUrl ? (
                  <img
                    src={event.facilitator.avatarUrl}
                    alt={event.facilitator.displayName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center">
                    <FiUser className="w-8 h-8 text-text-muted" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-text-primary">
                      {event.facilitator.displayName}
                    </p>
                    {event.facilitator.isVerifiedCreator && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                        <FiCheck className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted">@{event.facilitator.username}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
                    <span>{event.facilitator.totalEventsHosted} events hosted</span>
                    <span className="flex items-center gap-1">
                      <FiStar className="w-4 h-4 text-yellow-400" />
                      {event.facilitator.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Reasons */}
            {event.matchReasons && event.matchReasons.length > 0 && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <FiCheck className="w-5 h-5 text-green-400" />
                  Why This Event Matches Your Preferences
                </h2>
                <ul className="space-y-2">
                  {event.matchReasons.map((reason, i) => (
                    <li key={i} className="flex items-center gap-2 text-text-primary">
                      <FiCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sponsorship Status */}
            <div className="bg-bg-secondary border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Sponsorship Status</h2>

              {event.sponsorshipSettings?.seekingSponsorship ? (
                <>
                  <SponsorshipProgressBar
                    current={event.sponsorshipSettings.currentSponsorshipTotal || 0}
                    goal={event.sponsorshipSettings.sponsorshipGoal || 0}
                    size="lg"
                    showLabels
                  />

                  {remaining > 0 && (
                    <p className="text-sm text-text-muted mt-3">
                      ${remaining.toLocaleString()} still needed to reach goal
                    </p>
                  )}

                  {event.sponsorshipSettings.pitchMessage && (
                    <div className="mt-4 p-3 bg-white/5 rounded-lg">
                      <p className="text-sm text-text-muted italic">
                        "{event.sponsorshipSettings.pitchMessage}"
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowSponsorModal(true)}
                    className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 rounded-xl text-white font-medium transition-opacity"
                  >
                    Sponsor This Event
                  </button>

                  <p className="text-xs text-text-muted text-center mt-2">
                    Minimum sponsorship: $50 FLOW
                  </p>
                </>
              ) : (
                <div className="text-center py-4">
                  <FiInfo className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-text-muted">This event is not currently seeking sponsorship</p>
                </div>
              )}
            </div>

            {/* Existing Sponsors */}
            {event.existingSponsors.length > 0 && (
              <div className="bg-bg-secondary border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Current Sponsors</h2>

                <div className="space-y-3">
                  {event.existingSponsors.map((sponsorship, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      {sponsorship.sponsor.logoUrl ? (
                        <img
                          src={sponsorship.sponsor.logoUrl}
                          alt={sponsorship.sponsor.companyName}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center">
                          <span className="text-lg">🏢</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {sponsorship.sponsor.companyName}
                        </p>
                        <SponsorBadge tier={sponsorship.sponsor.tier} size="sm" />
                      </div>
                      {sponsorship.visibility === SponsorshipVisibility.Featured && (
                        <FiStar className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-bg-secondary border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Stats</h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-muted">Registration</span>
                  <span className="text-text-primary font-medium">
                    {Math.round((event.registrationCount / event.maxCapacity) * 100)}% full
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Sponsors</span>
                  <span className="text-text-primary font-medium">
                    {event.existingSponsors.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Organizer Rating</span>
                  <span className="text-text-primary font-medium flex items-center gap-1">
                    <FiStar className="w-4 h-4 text-yellow-400" />
                    {event.facilitator.averageRating.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Estimated Reach</span>
                  <span className="text-text-primary font-medium">
                    ~{event.maxCapacity * 5} impressions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsorship Modal */}
      <CreateSponsorshipModal
        isOpen={showSponsorModal}
        onClose={() => setShowSponsorModal(false)}
        event={{
          id: event.id,
          title: event.title,
          imageUrl: event.imageUrl,
          location: event.location,
          startDateTime: event.startDateTime,
          sponsorshipSettings: {
            sponsorshipGoal: event.sponsorshipSettings?.sponsorshipGoal,
            currentSponsorshipTotal: event.sponsorshipSettings?.currentSponsorshipTotal,
          },
        }}
        onSubmit={handleSponsorSubmit}
        isSubmitting={isSubmitting}
      />
    </DashboardLayout>
  )
}
