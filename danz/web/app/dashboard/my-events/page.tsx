'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import OrganizerApplicationForm from '@/src/components/dashboard/OrganizerApplicationForm'
import EventCreationWizard from '@/src/components/events/EventCreationWizard'
import EventsCalendarView from '@/src/components/events/EventsCalendarView'
import EventsGridView from '@/src/components/events/EventsGridView'
import EventsMapView from '@/src/components/events/EventsMapView'
import GamificationBar from '@/src/components/events/GamificationBar'
import Leaderboard from '@/src/components/events/Leaderboard'
import { useAuth } from '@/src/contexts/AuthContext'
import {
  EventStatus,
  useCancelEventRegistrationMutation,
  useGetEventsQuery,
  useGetMyProfileQuery,
  useRegisterForEventMutation,
} from '@/src/generated/graphql'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'
import {
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiFilter,
  FiGrid,
  FiHeart,
  FiList,
  FiMap,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi'
import { FiHelpCircle } from 'react-icons/fi'

type ViewMode = 'grid' | 'calendar' | 'map'
type EventTab = 'all' | 'mine' | 'going' | 'maybe' | 'interested'

// Mock leaderboard data (in production, fetch from API)
const MOCK_LEADERBOARD = [
  {
    id: '1',
    username: 'dancequeen',
    display_name: 'Sarah M.',
    xp: 4250,
    level: 8,
    events_created: 12,
    events_attended: 45,
    streak: 14,
  },
  {
    id: '2',
    username: 'groovyking',
    display_name: 'Marcus J.',
    xp: 3890,
    level: 7,
    events_created: 8,
    events_attended: 52,
    streak: 21,
  },
  {
    id: '3',
    username: 'salsafire',
    display_name: 'Elena R.',
    xp: 3450,
    level: 7,
    events_created: 15,
    events_attended: 38,
    streak: 7,
  },
  {
    id: '4',
    username: 'hiphopdreams',
    display_name: 'Tyler W.',
    xp: 2980,
    level: 6,
    events_created: 5,
    events_attended: 42,
    streak: 0,
  },
  {
    id: '5',
    username: 'balletrose',
    display_name: 'Lily C.',
    xp: 2650,
    level: 5,
    events_created: 3,
    events_attended: 35,
    streak: 5,
  },
  {
    id: '6',
    username: 'jazzyhands',
    display_name: 'Mike D.',
    xp: 2340,
    level: 5,
    events_created: 7,
    events_attended: 28,
    streak: 3,
  },
  {
    id: '7',
    username: 'breakdancer',
    display_name: 'Carlos G.',
    xp: 1980,
    level: 4,
    events_created: 2,
    events_attended: 31,
    streak: 0,
  },
]

export default function EventsPage() {
  const { isAuthenticated } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeTab, setActiveTab] = useState<EventTab>('all')
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [registrationNotes, setRegistrationNotes] = useState('')
  const [selectedRsvpStatus, setSelectedRsvpStatus] = useState<
    'registered' | 'maybe' | 'interested'
  >('registered')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [eventToCancel, setEventToCancel] = useState<any>(null)

  const { data: profileData, refetch: refetchProfile } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })

  const {
    data: eventsData,
    loading,
    refetch,
  } = useGetEventsQuery({
    variables: {
      filter: {
        status: EventStatus.Upcoming,
      },
      pagination: {
        limit: 50,
      },
    },
  })

  const [registerForEvent] = useRegisterForEventMutation({
    onCompleted: () => {
      setSelectedEvent(null)
      setRegistrationNotes('')
      setSelectedRsvpStatus('registered')
      refetch()
    },
  })

  const [cancelEventRegistration] = useCancelEventRegistrationMutation({
    onCompleted: () => {
      setShowCancelConfirm(false)
      setEventToCancel(null)
      refetch()
    },
  })

  // Check permissions
  const userRole = profileData?.me?.role
  const isApprovedOrganizer = profileData?.me?.is_organizer_approved
  const canCreateEvents =
    userRole === 'admin' ||
    userRole === 'manager' ||
    (userRole === 'organizer' && isApprovedOrganizer)
  const needsApproval = userRole === 'organizer' && !isApprovedOrganizer
  const canApplyToOrganize = !canCreateEvents && isAuthenticated

  // Gamification stats (TODO: Add these fields to GraphQL schema)
  // For now using mock data, in production fetch from profile API
  const gamificationStats = {
    xp: 850,
    level: 3,
    eventsCreated: 2,
    eventsAttended: 8,
    streak: 5,
  }

  const events = eventsData?.events?.events || []

  // Filter events by tab (registration status)
  const filterByTab = (event: any) => {
    if (activeTab === 'all') return true
    const status = event.user_registration_status
    if (activeTab === 'mine')
      return (
        status === 'registered' ||
        status === 'attended' ||
        status === 'maybe' ||
        status === 'interested'
      )
    if (activeTab === 'going') return status === 'registered' || status === 'attended'
    if (activeTab === 'maybe') return status === 'maybe'
    if (activeTab === 'interested') return status === 'interested'
    return true
  }

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch =
      !searchQuery ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location_city?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || event.category === selectedCategory
    const matchesTab = filterByTab(event)
    return matchesSearch && matchesCategory && matchesTab
  })

  // Count events per tab
  const tabCounts = {
    all: events.length,
    mine: events.filter(
      (e: any) =>
        e.user_registration_status === 'registered' ||
        e.user_registration_status === 'attended' ||
        e.user_registration_status === 'maybe' ||
        e.user_registration_status === 'interested',
    ).length,
    going: events.filter(
      (e: any) =>
        e.user_registration_status === 'registered' || e.user_registration_status === 'attended',
    ).length,
    maybe: events.filter((e: any) => e.user_registration_status === 'maybe').length,
    interested: events.filter((e: any) => e.user_registration_status === 'interested').length,
  }

  const handleRegister = async (event: any, status?: 'registered' | 'maybe') => {
    if (status) {
      setSelectedRsvpStatus(status)
    }
    setSelectedEvent(event)
  }

  const handleConfirmRegistration = async () => {
    if (selectedEvent) {
      // Note: The 'maybe' status will be stored in notes until backend adds status support
      const notesWithStatus =
        selectedRsvpStatus === 'maybe'
          ? `[RSVP: Maybe] ${registrationNotes || ''}`.trim()
          : registrationNotes || null

      await registerForEvent({
        variables: {
          eventId: selectedEvent.id,
          notes: notesWithStatus,
        },
      })
    }
  }

  const handleCancelRegistration = (event: any) => {
    setEventToCancel(event)
    setShowCancelConfirm(true)
  }

  const handleConfirmCancel = async () => {
    if (eventToCancel) {
      await cancelEventRegistration({
        variables: {
          eventId: eventToCancel.id,
        },
      })
    }
  }

  // Note: Status updates require backend support - for now, users can cancel and re-register
  const handleUpdateStatus = async (event: any, status: 'registered' | 'maybe') => {
    // TODO: Implement when backend adds self-service status update mutation
    // For now, show a message that this feature is coming soon
    console.log('Status update requested:', event.id, status)
    // Workaround: Cancel and re-register with new status
    // This is not ideal as it may affect capacity counts temporarily
  }

  const handleEventCreated = () => {
    setShowCreateWizard(false)
    refetch()
    refetchProfile()
  }

  const CATEGORIES = [
    { value: 'class', label: 'Class', emoji: '💃' },
    { value: 'social', label: 'Social', emoji: '🎉' },
    { value: 'workshop', label: 'Workshop', emoji: '📚' },
    { value: 'competition', label: 'Competition', emoji: '🏆' },
    { value: 'performance', label: 'Performance', emoji: '🎭' },
    { value: 'fitness', label: 'Fitness', emoji: '💪' },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Gamification Bar */}
        {isAuthenticated && (
          <GamificationBar
            xp={gamificationStats.xp}
            level={gamificationStats.level}
            eventsCreated={gamificationStats.eventsCreated}
            eventsAttended={gamificationStats.eventsAttended}
            streak={gamificationStats.streak}
          />
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary mb-2">
              Dance Events
            </h1>
            <p className="text-text-secondary">
              Discover, join, and create amazing dance experiences
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Leaderboard Toggle */}
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showLeaderboard
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10'
              }`}
            >
              <FiTrendingUp className="w-5 h-5" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>

            {/* Create Event Button */}
            {canCreateEvents ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateWizard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <FiPlus className="w-4 h-4" />
                Create Event
              </motion.button>
            ) : needsApproval ? (
              <button
                onClick={() => setShowApplicationForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors"
              >
                <FiClock className="w-5 h-5" />
                Approval Pending
              </button>
            ) : canApplyToOrganize ? (
              <button
                onClick={() => setShowApplicationForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-blue text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <FiFileText className="w-5 h-5" />
                Apply to Organize
              </button>
            ) : null}
          </div>
        </div>

        {/* Event Tabs */}
        {isAuthenticated && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'all' as EventTab, label: 'Discover', icon: FiList, color: 'neon-purple' },
              { id: 'mine' as EventTab, label: 'My Events', icon: FiCalendar, color: 'neon-blue' },
              { id: 'going' as EventTab, label: 'Going', icon: FiCheck, color: 'green-500' },
              { id: 'maybe' as EventTab, label: 'Maybe', icon: FiHelpCircle, color: 'yellow-500' },
              {
                id: 'interested' as EventTab,
                label: 'Interested',
                icon: FiHeart,
                color: 'pink-500',
              },
            ].map(tab => {
              const Icon = tab.icon
              const count = tabCounts[tab.id]
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? `bg-${tab.color}/20 text-${tab.color === 'neon-purple' ? 'neon-purple' : tab.color.replace('-500', '-400')} border border-${tab.color}/30`
                      : 'bg-bg-secondary text-text-secondary hover:bg-white/10 border border-white/10'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor:
                            tab.color === 'neon-purple'
                              ? 'rgba(168, 85, 247, 0.2)'
                              : tab.color === 'neon-blue'
                                ? 'rgba(59, 130, 246, 0.2)'
                                : tab.color === 'green-500'
                                  ? 'rgba(34, 197, 94, 0.2)'
                                  : tab.color === 'yellow-500'
                                    ? 'rgba(234, 179, 8, 0.2)'
                                    : 'rgba(236, 72, 153, 0.2)',
                          color:
                            tab.color === 'neon-purple'
                              ? '#a855f7'
                              : tab.color === 'neon-blue'
                                ? '#3b82f6'
                                : tab.color === 'green-500'
                                  ? '#4ade80'
                                  : tab.color === 'yellow-500'
                                    ? '#facc15'
                                    : '#f472b6',
                          borderColor:
                            tab.color === 'neon-purple'
                              ? 'rgba(168, 85, 247, 0.3)'
                              : tab.color === 'neon-blue'
                                ? 'rgba(59, 130, 246, 0.3)'
                                : tab.color === 'green-500'
                                  ? 'rgba(34, 197, 94, 0.3)'
                                  : tab.color === 'yellow-500'
                                    ? 'rgba(234, 179, 8, 0.3)'
                                    : 'rgba(236, 72, 153, 0.3)',
                        }
                      : {}
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20' : 'bg-white/10'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Filters and View Modes */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Search and Category Filter */}
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary rounded-xl border border-white/10 focus:border-neon-purple/50 focus:outline-none text-text-primary"
              />
            </div>

            <div className="relative">
              <select
                value={selectedCategory || ''}
                onChange={e => setSelectedCategory(e.target.value || null)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-bg-secondary rounded-xl border border-white/10 focus:border-neon-purple/50 focus:outline-none text-text-primary cursor-pointer"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
              <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-xl border border-white/10">
            {[
              { mode: 'grid' as ViewMode, icon: FiGrid, label: 'Grid' },
              { mode: 'calendar' as ViewMode, icon: FiCalendar, label: 'Calendar' },
              { mode: 'map' as ViewMode, icon: FiMap, label: 'Map' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === mode
                    ? 'bg-neon-purple text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div>
          {viewMode === 'grid' && (
            <EventsGridView
              events={filteredEvents as any}
              onRegister={handleRegister}
              onCancel={handleCancelRegistration}
              onUpdateStatus={handleUpdateStatus}
              isLoading={loading}
            />
          )}

          {viewMode === 'calendar' && (
            <EventsCalendarView
              events={filteredEvents as any}
              onRegister={handleRegister}
              onEventClick={setSelectedEvent}
            />
          )}

          {viewMode === 'map' && (
            <EventsMapView events={filteredEvents as any} onRegister={handleRegister} />
          )}
        </div>

        {/* Leaderboard Modal */}
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowLeaderboard(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: 0,
                  transition: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                  },
                }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-bg-secondary rounded-2xl border border-neon-purple/30 max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl shadow-neon-purple/20"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{
                        rotate: [0, -10, 10, -10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 0.6,
                        delay: 0.2,
                        ease: 'easeInOut',
                      }}
                      className="text-2xl"
                    >
                      🏆
                    </motion.div>
                    <h2 className="text-xl font-bold text-text-primary">Dance Leaderboard</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/dashboard/leaderboard"
                      className="px-4 py-2 bg-neon-purple/20 text-neon-purple rounded-lg hover:bg-neon-purple/30 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      View Full Page
                      <FiChevronRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => setShowLeaderboard(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <FiX className="w-5 h-5 text-text-secondary" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
                  <Leaderboard
                    users={MOCK_LEADERBOARD}
                    currentUserId={profileData?.me?.privy_id}
                    variant="full"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event Creation Wizard Modal */}
        <EventCreationWizard
          isOpen={showCreateWizard}
          onClose={() => setShowCreateWizard(false)}
          onSuccess={handleEventCreated}
        />

        {/* Registration Modal */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedEvent(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-bg-secondary rounded-2xl border border-neon-purple/20 p-6 max-w-md w-full"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-text-primary">Join Event</h3>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-bg-primary rounded-xl p-4 mb-4">
                  <h4 className="font-bold text-text-primary mb-2">{selectedEvent.title}</h4>
                  <div className="space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="w-4 h-4 text-neon-purple" />
                      {new Date(selectedEvent.start_date_time).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <FiMapPin className="w-4 h-4 text-neon-purple" />
                      {selectedEvent.is_virtual
                        ? 'Virtual Event'
                        : selectedEvent.location_name || selectedEvent.location_city}
                    </div>
                    {selectedEvent.price_usd > 0 && (
                      <div className="flex items-center gap-2">
                        <FiDollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">${selectedEvent.price_usd}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* RSVP Status Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    Your Response
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedRsvpStatus('registered')}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        selectedRsvpStatus === 'registered'
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-white/10 bg-bg-primary text-text-secondary hover:border-white/20'
                      }`}
                    >
                      <FiCheck className="w-5 h-5" />
                      <span className="text-sm font-medium">Going</span>
                    </button>
                    <button
                      onClick={() => setSelectedRsvpStatus('maybe')}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        selectedRsvpStatus === 'maybe'
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                          : 'border-white/10 bg-bg-primary text-text-secondary hover:border-white/20'
                      }`}
                    >
                      <FiHelpCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Maybe</span>
                    </button>
                    <button
                      onClick={() => setSelectedRsvpStatus('interested')}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        selectedRsvpStatus === 'interested'
                          ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                          : 'border-white/10 bg-bg-primary text-text-secondary hover:border-white/20'
                      }`}
                    >
                      <FiHeart className="w-5 h-5" />
                      <span className="text-sm font-medium">Interested</span>
                    </button>
                  </div>
                </div>

                {/* XP Reward Preview */}
                <div className="flex items-center justify-center gap-2 p-3 bg-neon-purple/10 border border-neon-purple/20 rounded-xl mb-4">
                  <span className="text-yellow-500">
                    {selectedRsvpStatus === 'registered'
                      ? '+25 XP'
                      : selectedRsvpStatus === 'maybe'
                        ? '+10 XP'
                        : '+5 XP'}
                  </span>
                  <span className="text-text-secondary">
                    for{' '}
                    {selectedRsvpStatus === 'registered'
                      ? 'joining'
                      : selectedRsvpStatus === 'maybe'
                        ? 'considering'
                        : 'showing interest in'}{' '}
                    this event!
                  </span>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={registrationNotes}
                    onChange={e => setRegistrationNotes(e.target.value)}
                    className="w-full bg-bg-primary text-text-primary rounded-xl px-4 py-3 border border-white/10 focus:border-neon-purple/50 focus:outline-none resize-none"
                    rows={3}
                    placeholder="Any dietary restrictions, special requirements..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 py-3 bg-white/10 text-text-primary rounded-xl hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRegistration}
                    className="flex-1 py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <FiCheck className="w-5 h-5" />
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel Registration Confirmation Modal */}
        <AnimatePresence>
          {showCancelConfirm && eventToCancel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowCancelConfirm(false)
                setEventToCancel(null)
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-bg-secondary rounded-2xl border border-red-500/20 p-6 max-w-md w-full"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-text-primary">Cancel Registration?</h3>
                  <button
                    onClick={() => {
                      setShowCancelConfirm(false)
                      setEventToCancel(null)
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-bg-primary rounded-xl p-4 mb-4">
                  <h4 className="font-bold text-text-primary mb-2">{eventToCancel.title}</h4>
                  <div className="space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="w-4 h-4 text-neon-purple" />
                      {new Date(eventToCancel.start_date_time).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                <p className="text-text-secondary mb-6">
                  Are you sure you want to cancel your registration for this event? You can always
                  register again if spots are available.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCancelConfirm(false)
                      setEventToCancel(null)
                    }}
                    className="flex-1 py-3 bg-white/10 text-text-primary rounded-xl hover:bg-white/20 transition-colors"
                  >
                    Keep Registration
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiX className="w-5 h-5" />
                    Cancel Registration
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Organizer Application Modal */}
        <OrganizerApplicationForm
          isOpen={showApplicationForm}
          onClose={() => setShowApplicationForm(false)}
          onSuccess={() => {
            refetchProfile()
          }}
        />
      </div>
    </DashboardLayout>
  )
}
