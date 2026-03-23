'use client'

import Navbar from '@/src/components/Navbar'
import { useAuth } from '@/src/contexts/AuthContext'
import { type EventCategory, useGetPublicEventsQuery } from '@/src/generated/graphql'
import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import {
  FiArrowRight,
  FiCalendar,
  FiDollarSign,
  FiFilter,
  FiMapPin,
  FiSearch,
  FiUsers,
  FiVideo,
} from 'react-icons/fi'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'class', label: 'Dance Class' },
  { value: 'social', label: 'Social Dance' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'competition', label: 'Competition' },
  { value: 'performance', label: 'Performance' },
  { value: 'fitness', label: 'Dance Fitness' },
]

export default function PublicEventsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const { isAuthenticated, isLoading, login } = useAuth()

  // Use publicEvents query - no auth required, only returns public events
  const { data, loading, error } = useGetPublicEventsQuery({
    variables: {
      filter: {
        category: selectedCategory ? (selectedCategory as EventCategory) : undefined,
      },
      pagination: { limit: 50 },
    },
    errorPolicy: 'all',
  })

  // Apply search filter (server already filtered for is_public)
  const allEvents = data?.publicEvents?.events || []
  const events = searchQuery
    ? allEvents.filter((event: any) => {
        const query = searchQuery.toLowerCase()
        return (
          event.title?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location_city?.toLowerCase().includes(query) ||
          event.dance_styles?.some((style: string) => style.toLowerCase().includes(query))
        )
      })
    : allEvents

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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
        return 'bg-green-500/20 text-green-400'
      case 'ongoing':
        return 'bg-neon-purple/20 text-neon-purple'
      default:
        return 'bg-text-muted/20 text-text-muted'
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Shared Navbar */}
      <Navbar />

      {/* Hero - with top padding for fixed navbar */}
      <div className="relative pt-28 sm:pt-32 pb-12 sm:pb-16 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-neon-pink/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            Discover Dance Events
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Find and join amazing dance events near you. From salsa socials to hip-hop workshops.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search events, locations, dance styles..."
              className="w-full bg-bg-card text-text-primary rounded-xl pl-12 pr-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none placeholder-text-muted"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-bg-card text-text-primary rounded-xl px-4 py-3 border border-neon-purple/20 focus:border-neon-purple/50 focus:outline-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value} className="bg-bg-primary">
                  {cat.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                showFilters
                  ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple'
                  : 'bg-bg-card border-neon-purple/20 text-text-secondary hover:text-text-primary'
              }`}
            >
              <FiFilter className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-neon-purple/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-neon-purple rounded-full animate-spin" />
              </div>
              <p className="text-text-secondary">Loading events...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Unable to Load Events</h2>
            <p className="text-text-secondary mb-8 max-w-md mx-auto">
              We're having trouble loading events right now. Please try again later.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-bg-card border border-neon-purple/20 hover:border-neon-purple/50 rounded-xl text-text-primary font-medium transition-all"
            >
              Go Home
            </Link>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neon-purple/10 flex items-center justify-center">
              <FiCalendar className="w-10 h-10 text-neon-purple" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">No events found</h2>
            <p className="text-text-secondary mb-8">
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters'
                : 'Check back soon for upcoming dance events!'}
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 rounded-xl text-white font-medium transition-all"
            >
              Sign In to Create Events
            </Link>
          </div>
        ) : (
          <>
            <p className="text-text-secondary mb-6">{events.length} events found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event: any, index: number) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/events/${event.slug || event.id}`}
                    className="block bg-bg-card backdrop-blur-lg rounded-2xl border border-neon-purple/10 overflow-hidden hover:border-neon-purple/50 transition-all duration-300 group"
                  >
                    {/* Image */}
                    {event.image_url ? (
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={event.image_url}
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />
                        <div className="absolute top-3 right-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
                          >
                            {event.status}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-48 bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center">
                        <span className="text-6xl">💃</span>
                        <div className="absolute top-3 right-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
                          >
                            {event.status}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {event.category && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-neon-purple/20 text-neon-purple">
                            {event.category}
                          </span>
                        )}
                        {event.is_virtual && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-neon-blue/20 text-neon-blue flex items-center gap-1">
                            <FiVideo className="w-3 h-3" />
                            Virtual
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-neon-purple transition-colors">
                        {event.title}
                      </h3>

                      <div className="space-y-2 text-sm text-text-secondary mb-4">
                        <div className="flex items-center gap-2">
                          <FiCalendar className="w-4 h-4 text-neon-purple" />
                          <span>
                            {formatDate(event.start_date_time)} at{' '}
                            {formatTime(event.start_date_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiMapPin className="w-4 h-4 text-neon-purple" />
                          <span>
                            {event.location_name}
                            {event.location_city ? `, ${event.location_city}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <FiUsers className="w-4 h-4 text-neon-purple" />
                            <span>
                              {event.registration_count || 0}
                              {event.max_capacity ? `/${event.max_capacity}` : ''} going
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FiDollarSign className="w-4 h-4 text-neon-purple" />
                            <span>{event.price_usd ? `$${event.price_usd}` : 'Free'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Organizer */}
                      {event.facilitator && (
                        <div className="flex items-center gap-2 pt-4 border-t border-neon-purple/10">
                          {event.facilitator.avatar_url ? (
                            <Image
                              src={event.facilitator.avatar_url}
                              alt={event.facilitator.display_name || event.facilitator.username}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-neon-purple/30 flex items-center justify-center text-neon-purple text-xs font-bold">
                              {(event.facilitator.display_name || event.facilitator.username)
                                ?.charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-text-secondary">
                            by {event.facilitator.display_name || event.facilitator.username}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-end mt-4 text-neon-purple text-sm font-medium group-hover:gap-2 transition-all">
                        View Details <FiArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neon-purple/10 py-8">
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
