'use client'

import Link from 'next/link'
import { FiBriefcase, FiChevronRight } from 'react-icons/fi'

interface EventGigBannerProps {
  eventId: string
  gigCount: number
  matchingGigCount?: number
}

export default function EventGigBanner({
  eventId,
  gigCount,
  matchingGigCount = 0,
}: EventGigBannerProps) {
  if (gigCount === 0) return null

  const hasMatchingGigs = matchingGigCount > 0

  return (
    <div
      className={`p-4 rounded-xl ${
        hasMatchingGigs
          ? 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30'
          : 'bg-bg-tertiary border border-white/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              hasMatchingGigs ? 'bg-neon-purple/30' : 'bg-bg-secondary'
            }`}
          >
            <FiBriefcase
              className={`w-5 h-5 ${hasMatchingGigs ? 'text-neon-purple' : 'text-text-muted'}`}
            />
          </div>
          <div>
            <p className="font-medium text-text-primary">
              {hasMatchingGigs
                ? `${matchingGigCount} Gig${matchingGigCount > 1 ? 's' : ''} Match Your Skills!`
                : `${gigCount} Gig Opportunity${gigCount > 1 ? 'ies' : 'y'}`}
            </p>
            <p className="text-sm text-text-muted">
              {hasMatchingGigs
                ? 'Apply now and earn $DANZ'
                : 'Register for roles to see matching opportunities'}
            </p>
          </div>
        </div>

        <Link
          href={`/events/${eventId}/gigs`}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            hasMatchingGigs
              ? 'bg-neon-purple hover:bg-neon-purple/80 text-white'
              : 'bg-bg-secondary hover:bg-bg-secondary/80 text-text-primary'
          }`}
        >
          View Gigs <FiChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}
