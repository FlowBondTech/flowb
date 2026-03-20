'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import EventCheckinCode from '@/src/components/events/EventCheckinCode'
import EventCheckinModal from '@/src/components/events/EventCheckinModal'
import EventSocialFeed from '@/src/components/events/EventSocialFeed'
import EventSponsorshipSettings from '@/src/components/events/EventSponsorshipSettings'
import {
  useCancelEventRegistrationMutation,
  useGetMyProfileQuery,
  useRegisterForEventMutation,
} from '@/src/generated/graphql'
import { gql, useQuery } from '@apollo/client'
import { AnimatePresence, motion } from 'motion/react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { FaFacebookF, FaTelegram, FaWhatsapp } from 'react-icons/fa'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiCopy,
  FiDollarSign,
  FiEdit2,
  FiExternalLink,
  FiHeart,
  FiHelpCircle,
  FiLink,
  FiMapPin,
  FiShare2,
  FiTwitter,
  FiUsers,
  FiX,
} from 'react-icons/fi'

// Inline query since production schema may not have all fields yet
const GET_EVENT_DETAIL = gql`
  query GetEventDetail($id: ID!) {
    event(id: $id) {
      id
      title
      description
      category
      dance_styles
      skill_level
      location_name
      location_city
      location_address
      location_latitude
      location_longitude
      is_virtual
      virtual_link
      start_date_time
      end_date_time
      price_usd
      max_capacity
      registration_count
      status
      is_featured
      is_recurring
      image_url
      is_registered
      user_registration_status
      facilitator {
        privy_id
        username
        display_name
        avatar_url
      }
    }
  }
`

// Query for checkin_code - only available for organizers
const GET_EVENT_CHECKIN_CODE = gql`
  query GetEventCheckinCode($id: ID!) {
    event(id: $id) {
      id
      checkin_code
    }
  }
`

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  class: { label: 'Class', emoji: '💃' },
  social: { label: 'Social', emoji: '🎉' },
  workshop: { label: 'Workshop', emoji: '📚' },
  competition: { label: 'Competition', emoji: '🏆' },
  performance: { label: 'Performance', emoji: '🎭' },
  fitness: { label: 'Fitness', emoji: '💪' },
}

// Avatar component with error handling
function OrganizerAvatar({ avatarUrl, name }: { avatarUrl?: string | null; name: string }) {
  const [imgError, setImgError] = useState(false)

  if (!avatarUrl || imgError) {
    return (
      <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
        <span className="text-neon-purple text-lg font-bold">{name[0].toUpperCase()}</span>
      </div>
    )
  }

  return (
    <img
      src={avatarUrl}
      alt={name}
      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      onError={() => setImgError(true)}
    />
  )
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [registrationNotes, setRegistrationNotes] = useState('')
  const [selectedRsvpStatus, setSelectedRsvpStatus] = useState<
    'registered' | 'maybe' | 'interested'
  >('registered')
  const [showQRModal, setShowQRModal] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showUnregisterModal, setShowUnregisterModal] = useState(false)
  const [showSponsorshipSettings, setShowSponsorshipSettings] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: profileData } = useGetMyProfileQuery()
  const userRole = profileData?.me?.role
  const userPrivyId = profileData?.me?.privy_id

  const { data, loading, error, refetch } = useQuery(GET_EVENT_DETAIL, {
    variables: { id: eventId },
    skip: !eventId,
  })

  // Separate query for checkin code (only organizers/admins can see this)
  const { data: checkinData } = useQuery(GET_EVENT_CHECKIN_CODE, {
    variables: { id: eventId },
    skip: !eventId,
  })

  const [registerForEvent, { loading: registering, error: registerError }] =
    useRegisterForEventMutation({
      onCompleted: () => {
        setShowRegistrationModal(false)
        setRegistrationNotes('')
        refetch()
      },
      onError: error => {
        console.error('Registration failed:', error.message)
      },
    })

  const [cancelRegistration, { loading: cancelling }] = useCancelEventRegistrationMutation({
    onCompleted: () => refetch(),
  })

  const event = data?.event
  const checkinCode = checkinData?.event?.checkin_code

  // Check if current user can manage this event
  const isOrganizer = event?.facilitator?.privy_id === userPrivyId
  const isAdmin = userRole === 'admin' || userRole === 'manager'
  const canManageEvent = isOrganizer || isAdmin

  // Registration status
  const isRegistered = event?.is_registered
  const registrationStatus = event?.user_registration_status
  const isGoing = registrationStatus === 'registered' || registrationStatus === 'attended'
  const isMaybe = registrationStatus === 'maybe'
  const isInterested = registrationStatus === 'interested'
  const hasAnyStatus = isGoing || isMaybe || isInterested

  // Event timing
  const now = new Date()
  const startTime = event ? new Date(event.start_date_time) : null
  const endTime = event?.end_date_time ? new Date(event.end_date_time) : null
  const twoHoursBefore = startTime ? new Date(startTime.getTime() - 2 * 60 * 60 * 1000) : null
  const isCheckinWindow = twoHoursBefore && endTime && now >= twoHoursBefore && now <= endTime

  const handleRegister = async () => {
    let notesWithStatus = registrationNotes || ''
    if (selectedRsvpStatus === 'maybe') {
      notesWithStatus = `[RSVP: Maybe] ${notesWithStatus}`.trim()
    } else if (selectedRsvpStatus === 'interested') {
      notesWithStatus = `[RSVP: Interested] ${notesWithStatus}`.trim()
    }

    await registerForEvent({
      variables: {
        eventId: event.id,
        notes: notesWithStatus || null,
      },
    })
  }

  const handleCancel = () => {
    setShowUnregisterModal(true)
  }

  const confirmUnregister = async () => {
    await cancelRegistration({
      variables: { eventId: event.id },
    })
    setShowUnregisterModal(false)
  }

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

  const eventUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = event ? `Check out ${event.title} on DANZ!` : ''

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(eventUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(eventUrl)
    const encodedText = encodeURIComponent(shareText)

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    }

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400')
    }
    setShowShareMenu(false)
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: shareText,
          url: eventUrl,
        })
      } catch (err) {
        // User cancelled or share failed
      }
    }
    setShowShareMenu(false)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 bg-white/10 rounded" />
            <div className="h-64 bg-white/10 rounded-2xl" />
            <div className="h-24 bg-white/10 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !event) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6"
          >
            <FiArrowLeft />
            Back
          </button>
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-text-primary mb-2">Event Not Found</h2>
            <p className="text-text-secondary">
              This event may have been removed or doesn't exist.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const categoryInfo = CATEGORY_LABELS[event.category || 'class'] || { label: 'Event', emoji: '🎵' }
  const spotsLeft = event.max_capacity ? event.max_capacity - (event.registration_count || 0) : null
  const isFull = spotsLeft === 0

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
        >
          <FiArrowLeft />
          Back to Events
        </button>

        {/* Event Header */}
        <div className="relative rounded-2xl overflow-hidden mb-6">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="w-full h-64 object-cover" />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-neon-purple/30 via-neon-pink/20 to-neon-blue/30 flex items-center justify-center">
              <span className="text-8xl">{categoryInfo.emoji}</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-sm font-medium text-white">
              {categoryInfo.emoji} {categoryInfo.label}
            </span>
            {event.is_featured && (
              <span className="px-3 py-1 bg-yellow-500 rounded-full text-sm font-bold text-black">
                Featured
              </span>
            )}
          </div>

          {/* Edit Button for Organizers */}
          {canManageEvent && (
            <button
              onClick={() => router.push(`/dashboard/my-events/create?edit=${event.id}`)}
              className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-colors"
            >
              <FiEdit2 size={18} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Description */}
            <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6 relative">
              {/* QR Code & Share in top-right */}
              <div className="absolute top-4 right-4 flex items-center gap-2" ref={shareMenuRef}>
                {/* QR Code Button */}
                <button
                  onClick={() => setShowQRModal(true)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
                  title="Show QR Code"
                >
                  <div className="w-8 h-8 bg-white rounded p-0.5 group-hover:scale-105 transition-transform">
                    <QRCodeSVG
                      value={eventUrl || 'https://danz.app'}
                      size={28}
                      level="M"
                      includeMargin={false}
                      fgColor="#000000"
                      bgColor="#FFFFFF"
                    />
                  </div>
                </button>

                {/* Share Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    title="Share Event"
                  >
                    <FiShare2 className="w-5 h-5 text-text-secondary" />
                  </button>

                  {/* Share Dropdown Menu */}
                  <AnimatePresence>
                    {showShareMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-bg-primary border border-white/10 rounded-xl shadow-xl overflow-hidden z-30"
                      >
                        <div className="p-2 space-y-1">
                          <button
                            onClick={handleCopyLink}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left"
                          >
                            {copiedLink ? (
                              <FiCheck className="w-4 h-4 text-green-400" />
                            ) : (
                              <FiLink className="w-4 h-4 text-text-secondary" />
                            )}
                            <span className={copiedLink ? 'text-green-400' : 'text-text-primary'}>
                              {copiedLink ? 'Link Copied!' : 'Copy Link'}
                            </span>
                          </button>

                          {'share' in navigator && (
                            <button
                              onClick={handleNativeShare}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                              <FiShare2 className="w-4 h-4 text-text-secondary" />
                              <span className="text-text-primary">Share via...</span>
                            </button>
                          )}

                          <div className="border-t border-white/5 my-1" />

                          <button
                            onClick={() => handleShare('twitter')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left"
                          >
                            <FiTwitter className="w-4 h-4 text-[#1DA1F2]" />
                            <span className="text-text-primary">Twitter / X</span>
                          </button>

                          <button
                            onClick={() => handleShare('facebook')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left"
                          >
                            <FaFacebookF className="w-4 h-4 text-[#1877F2]" />
                            <span className="text-text-primary">Facebook</span>
                          </button>

                          <button
                            onClick={() => handleShare('whatsapp')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left"
                          >
                            <FaWhatsapp className="w-4 h-4 text-[#25D366]" />
                            <span className="text-text-primary">WhatsApp</span>
                          </button>

                          <button
                            onClick={() => handleShare('telegram')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left"
                          >
                            <FaTelegram className="w-4 h-4 text-[#0088cc]" />
                            <span className="text-text-primary">Telegram</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4 pr-28">
                {event.title}
              </h1>

              {event.description && (
                <p className="text-text-secondary whitespace-pre-wrap">{event.description}</p>
              )}

              {/* Dance Styles */}
              {event.dance_styles && event.dance_styles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {event.dance_styles.map((style: string) => (
                    <span
                      key={style}
                      className="px-3 py-1 bg-neon-purple/10 text-neon-purple text-sm rounded-full"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Event Details */}
            <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">Event Details</h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FiCalendar className="w-5 h-5 text-neon-purple mt-0.5" />
                  <div>
                    <p className="text-text-primary font-medium">
                      {formatDate(event.start_date_time)}
                    </p>
                    <p className="text-text-secondary text-sm">
                      {formatTime(event.start_date_time)}
                      {event.end_date_time && ` - ${formatTime(event.end_date_time)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiMapPin className="w-5 h-5 text-neon-purple mt-0.5" />
                  <div>
                    {event.is_virtual ? (
                      <>
                        <p className="text-text-primary font-medium">Virtual Event</p>
                        {event.virtual_link && isRegistered && (
                          <a
                            href={event.virtual_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neon-purple hover:underline text-sm flex items-center gap-1"
                          >
                            Join Link <FiExternalLink size={12} />
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-text-primary font-medium">{event.location_name}</p>
                        {event.location_address && (
                          <p className="text-text-secondary text-sm">{event.location_address}</p>
                        )}
                        {event.location_city && (
                          <p className="text-text-secondary text-sm">{event.location_city}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {event.max_capacity && (
                  <div className="flex items-start gap-3">
                    <FiUsers className="w-5 h-5 text-neon-purple mt-0.5" />
                    <div>
                      <p className="text-text-primary font-medium">
                        {event.registration_count || 0} / {event.max_capacity} attendees
                      </p>
                      {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 10 && (
                        <p className="text-orange-400 text-sm">Only {spotsLeft} spots left!</p>
                      )}
                      {isFull && <p className="text-red-400 text-sm">Sold out</p>}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <FiDollarSign className="w-5 h-5 text-neon-purple mt-0.5" />
                  <p className="text-text-primary font-medium">
                    {event.price_usd && event.price_usd > 0 ? `$${event.price_usd}` : 'Free'}
                  </p>
                </div>

                {event.skill_level && (
                  <div className="flex items-start gap-3">
                    <FiClock className="w-5 h-5 text-neon-purple mt-0.5" />
                    <p className="text-text-primary font-medium capitalize">
                      {event.skill_level} level
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Organizer Info */}
            {event.facilitator && (
              <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Hosted by</h2>
                <div className="flex items-center gap-4">
                  <OrganizerAvatar
                    avatarUrl={event.facilitator.avatar_url}
                    name={event.facilitator.display_name || event.facilitator.username || '?'}
                  />
                  <div>
                    <p className="text-text-primary font-medium">
                      {event.facilitator.display_name || event.facilitator.username}
                    </p>
                    {event.facilitator.username && (
                      <p className="text-text-secondary text-sm">@{event.facilitator.username}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Card */}
            <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">
              {hasAnyStatus ? (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl ${
                      isGoing
                        ? 'bg-green-500/10 border border-green-500/30'
                        : isMaybe
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'bg-pink-500/10 border border-pink-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isGoing ? (
                        <FiCheck className="text-green-400" size={20} />
                      ) : isMaybe ? (
                        <FiHelpCircle className="text-yellow-400" size={20} />
                      ) : (
                        <FiHeart className="text-pink-400" size={20} />
                      )}
                      <span
                        className={`font-semibold ${
                          isGoing ? 'text-green-400' : isMaybe ? 'text-yellow-400' : 'text-pink-400'
                        }`}
                      >
                        {isGoing ? "You're Going!" : isMaybe ? 'Maybe Going' : 'Interested'}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm">
                      {isGoing
                        ? "We'll see you at the event!"
                        : isMaybe
                          ? 'Update your status when you decide.'
                          : "You'll be notified about updates."}
                    </p>
                  </div>

                  {/* Check-in Button (during check-in window) */}
                  {isCheckinWindow && isGoing && (
                    <button
                      onClick={() => setShowCheckinModal(true)}
                      className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <FiCheck size={18} />
                      Check In Now
                    </button>
                  )}

                  {/* Upgrade to Going button for Interested/Maybe */}
                  {(isMaybe || isInterested) && (
                    <button
                      onClick={() => {
                        setSelectedRsvpStatus('registered')
                        setShowRegistrationModal(true)
                      }}
                      className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <FiCheck size={18} />
                      Change to Going
                    </button>
                  )}

                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full py-3 bg-white/5 text-red-400 rounded-xl font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiX size={18} />
                    {isInterested ? 'Remove Interest' : 'Cancel Registration'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary mb-1">
                      {event.price_usd && event.price_usd > 0 ? `$${event.price_usd}` : 'Free'}
                    </p>
                    {spotsLeft !== null && (
                      <p className="text-text-secondary text-sm">
                        {spotsLeft > 0 ? `${spotsLeft} spots remaining` : 'No spots remaining'}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setShowRegistrationModal(true)}
                    disabled={isFull}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      isFull
                        ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-neon-purple to-neon-pink text-white hover:opacity-90'
                    }`}
                  >
                    {isFull ? 'Sold Out' : 'Register Now'}
                  </button>
                </div>
              )}
            </div>

            {/* Event Social Feed */}
            <EventSocialFeed eventId={event.id} eventTitle={event.title} limit={5} />

            {/* Check-in Code Card (for organizers) */}
            {canManageEvent && checkinCode && (
              <EventCheckinCode checkinCode={checkinCode} eventTitle={event.title} />
            )}

            {/* Sponsorship Settings (for organizers) */}
            {canManageEvent && (
              <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">Sponsorship</h3>
                <p className="text-sm text-text-muted mb-4">
                  Configure how sponsors can support your event with $FLOW tokens.
                </p>
                <button
                  onClick={() => setShowSponsorshipSettings(true)}
                  className="w-full py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 text-green-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  <FiDollarSign size={18} />
                  Sponsorship Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowRegistrationModal(false)}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-bg-secondary border border-neon-purple/30 rounded-2xl w-full max-w-md mx-4 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary">Join Event</h2>
              <button
                onClick={() => setShowRegistrationModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <FiX className="text-text-secondary" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* RSVP Status Selection */}
              <div>
                <label className="block text-text-secondary text-sm mb-2">Your Response</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedRsvpStatus('registered')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      selectedRsvpStatus === 'registered'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-white/10 text-text-secondary hover:border-white/20'
                    }`}
                  >
                    <FiCheck size={20} />
                    <span className="text-sm">Going</span>
                  </button>
                  <button
                    onClick={() => setSelectedRsvpStatus('maybe')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      selectedRsvpStatus === 'maybe'
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                        : 'border-white/10 text-text-secondary hover:border-white/20'
                    }`}
                  >
                    <FiHelpCircle size={20} />
                    <span className="text-sm">Maybe</span>
                  </button>
                  <button
                    onClick={() => setSelectedRsvpStatus('interested')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      selectedRsvpStatus === 'interested'
                        ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                        : 'border-white/10 text-text-secondary hover:border-white/20'
                    }`}
                  >
                    <FiHeart size={20} />
                    <span className="text-sm">Interested</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">Notes (Optional)</label>
                <textarea
                  value={registrationNotes}
                  onChange={e => setRegistrationNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-neon-purple/50 resize-none"
                  rows={3}
                  placeholder="Any special requirements..."
                />
              </div>

              {registerError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  Registration failed: {registerError.message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRegistrationModal(false)}
                  className="flex-1 py-3 bg-white/10 text-text-primary rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="flex-1 py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {registering ? 'Registering...' : 'Confirm'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Check-in Modal */}
      <EventCheckinModal
        isOpen={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
        onCheckinSuccess={() => refetch()}
      />

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop - click to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowQRModal(false)}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-bg-secondary border border-white/10 rounded-2xl p-6 mx-4 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-text-secondary" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-text-primary">Share Event</h3>
                <p className="text-sm text-text-secondary mt-1">Scan to view this event</p>
              </div>

              {/* Large QR Code */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG
                    value={eventUrl || 'https://danz.app'}
                    size={200}
                    level="H"
                    includeMargin={false}
                    fgColor="#000000"
                    bgColor="#FFFFFF"
                  />
                </div>
              </div>

              {/* Event Title */}
              <p className="text-center text-text-secondary text-sm mb-6 line-clamp-2">
                {event?.title}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleCopyLink()
                    setShowQRModal(false)
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-text-primary font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FiCopy className="w-4 h-4" />
                  Copy Link
                </button>
                <button
                  onClick={() => {
                    setShowQRModal(false)
                    setShowShareMenu(true)
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <FiShare2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unregister Confirmation Modal */}
      <AnimatePresence>
        {showUnregisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowUnregisterModal(false)}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-bg-secondary border border-white/10 rounded-2xl p-6 mx-4 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowUnregisterModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-text-secondary" />
              </button>

              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <FiX className="w-8 h-8 text-red-400" />
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-text-primary mb-2">Unregister from Event?</h3>
                <p className="text-text-secondary">
                  Are you sure you want to unregister from{' '}
                  <span className="text-text-primary font-medium">"{event?.title}"</span>?
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUnregisterModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-text-primary font-medium transition-colors"
                >
                  Keep Registration
                </button>
                <button
                  onClick={confirmUnregister}
                  disabled={cancelling}
                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    'Unregistering...'
                  ) : (
                    <>
                      <FiX className="w-4 h-4" />
                      Unregister
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sponsorship Settings Modal */}
      <EventSponsorshipSettings
        eventId={event?.id || ''}
        isOpen={showSponsorshipSettings}
        onClose={() => setShowSponsorshipSettings(false)}
        onSuccess={() => refetch()}
      />
    </DashboardLayout>
  )
}
