'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { DANCE_STYLES, EVENT_TYPES } from '@/src/constants/eventConstants'
import {
  useGetEventsForSponsorshipQuery,
  useGetMySponsorProfileQuery,
  useGetSponsorCategoriesQuery,
} from '@/src/generated/graphql'
import { useAuth } from '@/src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiFilter,
  FiGrid,
  FiList,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi'

export default function SponsorEventsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [selectedDanceStyles, setSelectedDanceStyles] = useState<string[]>([])
  const [regionFilter, setRegionFilter] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: profileData } = useGetMySponsorProfileQuery({
    skip: !isAuthenticated || isLoading,
  })

  const { data: categoriesData } = useGetSponsorCategoriesQuery()

  const {
    data: eventsData,
    loading: eventsLoading,
    refetch,
  } = useGetEventsForSponsorshipQuery({
    skip: !isAuthenticated || isLoading,
    variables: {
      input: {
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        // Note: eventTypes not supported by GraphQL schema - filter client-side instead
        danceStyles: selectedDanceStyles.length > 0 ? selectedDanceStyles : undefined,
        region: regionFilter || undefined,
        verifiedCreatorsOnly: verifiedOnly || undefined,
        limit: 50,
      },
    },
  })


  const categories = categoriesData?.sponsorCategories || []
  const events = eventsData?.eventsForSponsorship || []

  // Filter events by search query
  const filteredEvents = events.filter(
    event =>
      !searchQuery ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const toggleCategory = (slug: string) => {
    setSelectedCategories(prev =>
      prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug],
    )
  }

  const toggleEventType = (type: string) => {
    setSelectedEventTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    )
  }

  const toggleDanceStyle = (style: string) => {
    setSelectedDanceStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style],
    )
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedEventTypes([])
    setSelectedDanceStyles([])
    setRegionFilter('')
    setVerifiedOnly(false)
    setSearchQuery('')
  }

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedEventTypes.length > 0 ||
    selectedDanceStyles.length > 0 ||
    regionFilter ||
    verifiedOnly

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-neon-purple/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-neon-purple rounded-full animate-spin" />
            </div>
            <p className="text-text-secondary animate-pulse">Loading events...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/sponsor')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-text-muted" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Browse Events</h1>
              <p className="text-text-muted">Find events to sponsor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className="w-5 h-5 text-text-muted" />
            </button>
            <div className="flex bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-neon-purple/20 text-neon-purple' : 'text-text-muted'}`}
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-neon-purple/20 text-neon-purple' : 'text-text-muted'}`}
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events by name or location..."
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                hasActiveFilters
                  ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple'
                  : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
              }`}
            >
              <FiFilter className="w-5 h-5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 bg-neon-purple text-white text-xs rounded-full">
                  {selectedCategories.length +
                    selectedEventTypes.length +
                    selectedDanceStyles.length +
                    (verifiedOnly ? 1 : 0) +
                    (regionFilter ? 1 : 0)}
                </span>
              )}
              <FiChevronDown
                className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category.slug}
                      onClick={() => toggleCategory(category.slug)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedCategories.includes(category.slug)
                          ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50'
                          : 'bg-white/5 text-text-secondary border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Types */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Event Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => toggleEventType(type.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedEventTypes.includes(type.value)
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-white/5 text-text-secondary border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dance Styles */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Dance Styles
                </label>
                <div className="flex flex-wrap gap-2">
                  {DANCE_STYLES.slice(0, 12).map(style => (
                    <button
                      key={style.value}
                      onClick={() => toggleDanceStyle(style.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedDanceStyles.includes(style.value)
                          ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/50'
                          : 'bg-white/5 text-text-secondary border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Region & Verified Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-primary mb-2">Region</label>
                  <input
                    type="text"
                    value={regionFilter}
                    onChange={e => setRegionFilter(e.target.value)}
                    placeholder="e.g., New York, California"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                      verifiedOnly
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                    }`}
                  >
                    <FiCheck className="w-4 h-4" />
                    <span>Verified Creators Only</span>
                  </button>
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-sm text-text-muted hover:text-red-400 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-muted">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Events Grid/List */}
        {eventsLoading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-3 border-neon-purple/20 border-t-neon-purple rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading events...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div
            className={
              viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'
            }
          >
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} viewMode={viewMode} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neon-purple/10 flex items-center justify-center">
              <FiCalendar className="text-neon-purple" size={28} />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">No events found</h3>
            <p className="text-text-secondary mb-4">Try adjusting your filters or search query</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-xl text-neon-purple font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function EventCard({ event, viewMode }: { event: any; viewMode: 'grid' | 'list' }) {
  const router = useRouter()

  const formattedDate = new Date(event.start_date_time).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => router.push(`/dashboard/sponsor/event/${event.id}`)}
        className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-white/10 hover:border-neon-purple/30 transition-colors cursor-pointer"
      >
        {/* Image */}
        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FiCalendar className="text-neon-purple" size={24} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate mb-1">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted mb-2">
            <span className="flex items-center gap-1">
              <FiCalendar className="w-4 h-4" />
              {formattedDate}
            </span>
            {event.location_name && (
              <span className="flex items-center gap-1">
                <FiMapPin className="w-4 h-4" />
                {event.location_name}
              </span>
            )}
            {event.max_capacity && (
              <span className="flex items-center gap-1">
                <FiUsers className="w-4 h-4" />
                {event.registration_count || 0}/{event.max_capacity}
              </span>
            )}
          </div>
          {event.dance_styles && event.dance_styles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.dance_styles.slice(0, 3).map((style: string) => (
                <span
                  key={style}
                  className="px-2 py-0.5 bg-neon-pink/10 text-neon-pink text-xs rounded-full"
                >
                  {style}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action */}
        <button className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/30 rounded-xl text-neon-purple font-medium text-sm transition-colors self-center">
          Sponsor
        </button>
      </div>
    )
  }

  // Grid view
  return (
    <div
      onClick={() => router.push(`/dashboard/sponsor/event/${event.id}`)}
      className="bg-bg-secondary rounded-xl border border-white/10 hover:border-neon-purple/30 transition-all overflow-hidden cursor-pointer group"
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-neon-purple/20 to-neon-pink/20">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FiCalendar className="text-neon-purple" size={32} />
          </div>
        )}

        {/* Category Badge */}
        {event.category && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white">
            {event.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-text-primary mb-2 line-clamp-1">{event.title}</h3>

        <div className="space-y-1.5 text-sm text-text-muted mb-3">
          <div className="flex items-center gap-2">
            <FiCalendar className="w-4 h-4 flex-shrink-0" />
            <span>{formattedDate}</span>
          </div>
          {event.location_name && (
            <div className="flex items-center gap-2">
              <FiMapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{event.location_name}</span>
            </div>
          )}
        </div>

        {/* Dance Styles */}
        {event.dance_styles && event.dance_styles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {event.dance_styles.slice(0, 2).map((style: string) => (
              <span
                key={style}
                className="px-2 py-0.5 bg-neon-pink/10 text-neon-pink text-xs rounded-full"
              >
                {style}
              </span>
            ))}
            {event.dance_styles.length > 2 && (
              <span className="px-2 py-0.5 text-text-muted text-xs">
                +{event.dance_styles.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Organizer */}
        {event.facilitator && (
          <div className="flex items-center gap-2 pt-3 border-t border-white/5">
            {event.facilitator.avatar_url ? (
              <img src={event.facilitator.avatar_url} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-neon-purple/20" />
            )}
            <span className="text-xs text-text-muted truncate">
              by {event.facilitator.username || 'Unknown'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
