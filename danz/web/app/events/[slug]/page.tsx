'use client'

import Navbar from '@/src/components/Navbar'
import { useAuth } from '@/src/contexts/AuthContext'
import { useMutation, useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiDollarSign,
  FiLoader,
  FiMapPin,
  FiShare2,
  FiUsers,
  FiVideo,
  FiX,
} from 'react-icons/fi'

const GET_PUBLIC_EVENT = gql`
  query GetPublicEvent($slug: String!) {
    publicEvent(slug: $slug) {
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
      slug
      is_public
      facilitator {
        privy_id
        username
        display_name
        avatar_url
        bio
      }
      created_at
      updated_at
    }
  }
`

const REGISTER_FOR_EVENT = gql`
  mutation RegisterForEvent($eventId: ID!, $notes: String) {
    registerForEvent(eventId: $eventId, notes: $notes) {
      id
      status
      registration_date
    }
  }
`

export default function PublicEventPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const { isAuthenticated, login, isLoading } = useAuth()
  const [showShareToast, setShowShareToast] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [pendingJoin, setPendingJoin] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [pageUrl, setPageUrl] = useState('')

  // Get page URL for QR code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href)
    }
  }, [slug])

  const { data, loading, error, refetch } = useQuery(GET_PUBLIC_EVENT, {
    variables: { slug },
    skip: !slug,
  })

  const [registerForEvent, { loading: registering }] = useMutation(REGISTER_FOR_EVENT, {
    onCompleted: () => {
      setRegistrationError(null)
      refetch()
    },
    onError: error => {
      console.error('Registration error:', error)
      const errorCode = error.graphQLErrors?.[0]?.extensions?.code
      if (errorCode === 'PROFILE_REQUIRED') {
        setRegistrationError('Please complete your profile before registering for events.')
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard?setup=true')
        }, 2000)
      } else if (errorCode === 'CONFLICT') {
        setRegistrationError(error.message)
      } else {
        setRegistrationError('Failed to register. Please try again.')
      }
    },
  })

  const event = data?.publicEvent

  // Handle auto-join after login
  useEffect(() => {
    if (pendingJoin && isAuthenticated && event && !event.is_registered) {
      handleJoinEvent()
      setPendingJoin(false)
    }
  }, [isAuthenticated, pendingJoin, event])

  // Check URL for pending join parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('join') === 'true') {
        setPendingJoin(true)
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  const handleJoinEvent = async () => {
    setRegistrationError(null) // Clear any previous errors

    if (!isAuthenticated) {
      // Store intent to join, then trigger login
      setPendingJoin(true)
      // Store the current URL with join intent in localStorage
      localStorage.setItem('pendingEventJoin', slug)
      login()
      return
    }

    try {
      await registerForEvent({
        variables: { eventId: event.id },
      })
    } catch (err) {
      // Error is handled in onError callback
      console.error('Failed to register:', err)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: event?.description || `Check out this event: ${event?.title}`,
          url,
        })
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(url)
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 2000)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'ongoing':
        return 'bg-neon-purple/20 text-neon-purple border-neon-purple/30'
      case 'past':
        return 'bg-text-muted/20 text-text-muted border-text-muted/30'
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-text-muted/20 text-text-muted border-text-muted/30'
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-neon-purple/20 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-neon-purple rounded-full animate-spin" />
          </div>
          <p className="text-text-secondary">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Event Not Found</h1>
          <p className="text-text-secondary mb-6">
            This event may be private or no longer available.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 rounded-lg text-white transition-all"
          >
            <FiArrowLeft />
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const isFull = event.max_capacity && event.registration_count >= event.max_capacity
  const isPast = event.status === 'past'
  const isCancelled = event.status === 'cancelled'
  const canJoin = !event.is_registered && !isFull && !isPast && !isCancelled

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Shared Navbar */}
      <Navbar />

      {/* Toast notification */}
      {showShareToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-24 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50"
        >
          Link copied to clipboard!
        </motion.div>
      )}

      {/* Breadcrumb and Share */}
      <div className="pt-24 pb-4 border-b border-neon-purple/10 bg-bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/events"
            className="flex items-center gap-2 text-text-secondary hover:text-neon-purple transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Back to Events</span>
          </Link>
        </div>
      </div>

      {/* Hero Image */}
      {event.image_url && (
        <div className="relative h-64 sm:h-80 lg:h-96 w-full">
          <Image src={event.image_url} alt={event.title} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/50 to-transparent" />
        </div>
      )}

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-card backdrop-blur-lg rounded-2xl border border-neon-purple/10 overflow-hidden"
        >
          {/* Event Header */}
          <div className="p-6 sm:p-8 border-b border-neon-purple/10">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(event.status)}`}
                  >
                    {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                  </span>
                  {event.category && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
                      {event.category}
                    </span>
                  )}
                  {event.is_virtual && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-neon-blue/20 text-neon-blue border border-neon-blue/30 flex items-center gap-1">
                      <FiVideo className="w-3 h-3" />
                      Virtual
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
                  {event.title}
                </h1>
              </div>

              {/* QR Code & Share - hidden on mobile */}
              {pageUrl && (
                <div className="hidden sm:flex flex-col items-center gap-2">
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    title="Click to enlarge"
                  >
                    <QRCodeSVG value={pageUrl} size={80} level="M" includeMargin={false} />
                    <span className="text-xs text-gray-500">Tap to enlarge</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-bg-hover hover:bg-neon-purple/20 border border-neon-purple/20 rounded-lg text-text-secondary hover:text-neon-purple transition-colors text-sm"
                  >
                    <FiShare2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              )}
            </div>

            {/* Organizer */}
            {event.facilitator && (
              <div className="flex items-center gap-3 mb-6">
                {event.facilitator.avatar_url ? (
                  <Image
                    src={event.facilitator.avatar_url}
                    alt={event.facilitator.display_name || event.facilitator.username}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neon-purple/30 flex items-center justify-center text-neon-purple font-bold">
                    {(event.facilitator.display_name || event.facilitator.username)
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm text-text-muted">Hosted by</p>
                  <p className="text-text-primary font-medium">
                    {event.facilitator.display_name || event.facilitator.username}
                  </p>
                </div>
              </div>
            )}

            {/* Key Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 text-text-secondary">
                <FiCalendar className="w-5 h-5 text-neon-purple mt-0.5" />
                <div>
                  <p className="font-medium text-text-primary">
                    {formatDate(event.start_date_time)}
                  </p>
                  <p className="text-sm text-text-muted">
                    {formatTime(event.start_date_time)} - {formatTime(event.end_date_time)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-text-secondary">
                <FiMapPin className="w-5 h-5 text-neon-purple mt-0.5" />
                <div>
                  <p className="font-medium text-text-primary">{event.location_name}</p>
                  {event.location_address && (
                    <p className="text-sm text-text-muted">{event.location_address}</p>
                  )}
                  {event.location_city && (
                    <p className="text-sm text-text-muted">{event.location_city}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-text-secondary">
                <FiUsers className="w-5 h-5 text-neon-purple" />
                <div>
                  <p className="font-medium text-text-primary">
                    {event.registration_count || 0}
                    {event.max_capacity && ` / ${event.max_capacity}`} attending
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-text-secondary">
                <FiDollarSign className="w-5 h-5 text-neon-purple" />
                <p className="font-medium text-text-primary">
                  {event.price_usd ? `$${event.price_usd.toFixed(2)}` : 'Free'}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="p-6 sm:p-8 border-b border-neon-purple/10">
              <h2 className="text-xl font-semibold text-text-primary mb-4">About this event</h2>
              <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Dance Styles */}
          {event.dance_styles && event.dance_styles.length > 0 && (
            <div className="p-6 sm:p-8 border-b border-neon-purple/10">
              <h2 className="text-xl font-semibold text-text-primary mb-4">Dance Styles</h2>
              <div className="flex flex-wrap gap-2">
                {event.dance_styles.map((style: string) => (
                  <span
                    key={style}
                    className="px-3 py-1.5 rounded-full text-sm bg-bg-hover text-text-secondary border border-neon-purple/10"
                  >
                    {style}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Join Button */}
          <div className="p-6 sm:p-8 bg-bg-secondary/50">
            {/* Error Message */}
            {registrationError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3"
              >
                <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">{registrationError}</p>
                  {registrationError.includes('complete your profile') && (
                    <p className="text-red-400/80 text-sm mt-1">Redirecting to your dashboard...</p>
                  )}
                </div>
              </motion.div>
            )}

            {event.is_registered ? (
              <div className="flex items-center justify-center gap-3 py-4 px-6 bg-green-500/20 rounded-xl border border-green-500/30">
                <FiCheck className="w-6 h-6 text-green-400" />
                <span className="text-lg font-semibold text-green-400">
                  You&apos;re registered!
                </span>
              </div>
            ) : isFull ? (
              <div className="text-center py-4 px-6 bg-bg-hover rounded-xl">
                <p className="text-text-muted font-medium">This event is full</p>
              </div>
            ) : isPast ? (
              <div className="text-center py-4 px-6 bg-bg-hover rounded-xl">
                <p className="text-text-muted font-medium">This event has ended</p>
              </div>
            ) : isCancelled ? (
              <div className="text-center py-4 px-6 bg-red-500/20 rounded-xl border border-red-500/30">
                <p className="text-red-400 font-medium">This event has been cancelled</p>
              </div>
            ) : (
              <button
                onClick={handleJoinEvent}
                disabled={registering}
                className="w-full py-4 px-6 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 rounded-xl text-white font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {registering ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Event
                    {event.price_usd ? ` - $${event.price_usd.toFixed(2)}` : ' - Free'}
                  </>
                )}
              </button>
            )}

            {!isAuthenticated && canJoin && (
              <p className="text-center text-sm text-text-muted mt-3">
                You&apos;ll need to sign in to join this event
              </p>
            )}
          </div>
        </motion.div>
      </main>

      {/* QR Code Modal */}
      {showQRModal && pageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowQRModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Scan to Open</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={pageUrl} size={200} level="M" includeMargin={true} />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Scan this QR code to open this event on your phone
            </p>
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <FiShare2 className="w-5 h-5" />
              Share Event
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Footer */}
      <footer className="border-t border-neon-purple/10 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-text-muted text-sm">
          <p>
            Powered by{' '}
            <a
              href="https://flowbond.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-purple hover:text-neon-pink transition-colors"
            >
              FlowBond.Tech
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
