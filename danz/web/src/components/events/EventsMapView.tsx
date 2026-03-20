'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { FiChevronRight, FiGlobe, FiMapPin, FiNavigation, FiX } from 'react-icons/fi'
import EventCard, { type RegistrationStatusType } from './EventCard'

interface Event {
  id: string
  title: string
  description?: string | null
  category?: string | null
  location_name?: string | null
  location_city?: string | null
  location_lat?: number | null
  location_lng?: number | null
  start_date_time: string
  end_date_time?: string | null
  max_capacity?: number | null
  registration_count?: number | null
  price_usd?: number | null
  dance_styles?: string[] | null
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

interface EventsMapViewProps {
  events: Event[]
  onRegister: (event: Event) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  class: '#A855F7',
  social: '#EC4899',
  workshop: '#3B82F6',
  competition: '#EAB308',
  performance: '#EF4444',
  fitness: '#22C55E',
}

// Simulated city locations (in production, use actual geocoding)
const CITY_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'New York': { lat: 40.7128, lng: -74.006 },
  Miami: { lat: 25.7617, lng: -80.1918 },
  Chicago: { lat: 41.8781, lng: -87.6298 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  Austin: { lat: 30.2672, lng: -97.7431 },
  Seattle: { lat: 47.6062, lng: -122.3321 },
  Denver: { lat: 39.7392, lng: -104.9903 },
  Atlanta: { lat: 33.749, lng: -84.388 },
  Boston: { lat: 42.3601, lng: -71.0589 },
}

export default function EventsMapView({ events, onRegister }: EventsMapViewProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null)

  // Group events by city
  const eventsByCity = events.reduce(
    (acc, event) => {
      const city = event.location_city || 'Virtual'
      if (!acc[city]) acc[city] = []
      acc[city].push(event)
      return acc
    },
    {} as Record<string, Event[]>,
  )

  // Calculate city statistics
  const cityStats = Object.entries(eventsByCity)
    .map(([city, cityEvents]) => ({
      city,
      count: cityEvents.length,
      events: cityEvents,
      location: CITY_LOCATIONS[city] || { lat: 0, lng: 0 },
      hasLocation: !!CITY_LOCATIONS[city],
    }))
    .sort((a, b) => b.count - a.count)

  const virtualEvents = events.filter(e => e.is_virtual)
  const physicalCities = cityStats.filter(c => c.city !== 'Virtual' && c.hasLocation)

  const selectedCityData = selectedCity ? cityStats.find(c => c.city === selectedCity) : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map Area */}
      <div className="lg:col-span-2 bg-bg-secondary rounded-2xl border border-white/10 overflow-hidden">
        {/* Map Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiMapPin className="w-5 h-5 text-neon-purple" />
            <h2 className="font-bold text-text-primary">Events Near You</h2>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple/20 text-neon-purple rounded-lg hover:bg-neon-purple/30 transition-colors text-sm">
            <FiNavigation className="w-4 h-4" />
            Use My Location
          </button>
        </div>

        {/* Simplified Map Visualization */}
        <div className="relative h-[400px] bg-gradient-to-br from-bg-primary via-neon-purple/5 to-neon-blue/5 overflow-hidden">
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* City markers */}
          {physicalCities.map((cityData, index) => {
            // Distribute cities visually across the map
            const row = Math.floor(index / 4)
            const col = index % 4
            const x = 15 + col * 22 + (row % 2) * 10
            const y = 20 + row * 30

            return (
              <motion.div
                key={cityData.city}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
              >
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedCity(cityData.city)}
                  className={`relative group ${selectedCity === cityData.city ? 'z-20' : 'z-10'}`}
                >
                  {/* Pulse effect */}
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: index * 0.3,
                    }}
                    className={`absolute inset-0 rounded-full ${
                      selectedCity === cityData.city ? 'bg-neon-purple' : 'bg-neon-pink'
                    }`}
                  />

                  {/* Marker */}
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      selectedCity === cityData.city
                        ? 'bg-neon-purple shadow-lg shadow-neon-purple/50'
                        : 'bg-neon-pink/80 hover:bg-neon-purple'
                    }`}
                  >
                    <span className="text-text-primary font-bold text-sm">{cityData.count}</span>
                  </div>

                  {/* City label */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap">
                    <span className="text-xs text-text-primary bg-black/60 px-2 py-0.5 rounded">
                      {cityData.city}
                    </span>
                  </div>
                </motion.button>
              </motion.div>
            )
          })}

          {/* Virtual events indicator */}
          {virtualEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 right-4 bg-neon-blue/20 backdrop-blur-sm border border-neon-blue/30 rounded-xl p-4"
            >
              <button
                onClick={() => setSelectedCity('Virtual')}
                className="flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-neon-blue flex items-center justify-center">
                  <FiGlobe className="w-5 h-5 text-text-primary" />
                </div>
                <div>
                  <p className="text-text-primary font-medium">
                    {virtualEvents.length} Virtual Events
                  </p>
                  <p className="text-sm text-text-secondary">Join from anywhere</p>
                </div>
                <FiChevronRight className="w-5 h-5 text-text-secondary" />
              </button>
            </motion.div>
          )}

          {/* No events message */}
          {physicalCities.length === 0 && virtualEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  No events on the map yet
                </h3>
                <p className="text-text-secondary">
                  Create an event and put your city on the dance map!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* City Quick Stats */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {cityStats.slice(0, 6).map(cityData => (
              <button
                key={cityData.city}
                onClick={() => setSelectedCity(cityData.city)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCity === cityData.city
                    ? 'bg-neon-purple text-text-primary'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
              >
                {cityData.city === 'Virtual' ? (
                  <FiGlobe className="w-4 h-4" />
                ) : (
                  <FiMapPin className="w-4 h-4" />
                )}
                <span>{cityData.city}</span>
                <span className="px-2 py-0.5 bg-black/30 rounded-full text-xs">
                  {cityData.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* City Events Panel */}
      <div className="bg-bg-secondary rounded-2xl border border-white/10 overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedCityData ? (
            <motion.div
              key={selectedCityData.city}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              {/* Panel Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-text-primary flex items-center gap-2">
                    {selectedCityData.city === 'Virtual' ? (
                      <FiGlobe className="w-5 h-5 text-neon-blue" />
                    ) : (
                      <FiMapPin className="w-5 h-5 text-neon-purple" />
                    )}
                    {selectedCityData.city}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {selectedCityData.count} event{selectedCityData.count !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCity(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Events List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedCityData.events.map(event => (
                  <motion.div
                    key={event.id}
                    onHoverStart={() => setHoveredEvent(event.id)}
                    onHoverEnd={() => setHoveredEvent(null)}
                  >
                    <EventCard event={event} onRegister={onRegister} variant="compact" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center p-8"
            >
              <div className="text-center">
                <div className="text-5xl mb-4">📍</div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Select a location</h3>
                <p className="text-sm text-text-secondary">
                  Click on a city marker or use the quick stats to explore events in that area
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
