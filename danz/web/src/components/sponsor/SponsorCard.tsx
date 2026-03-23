'use client'

import type { SponsorTier } from '@/src/generated/graphql'
import { FiCheckCircle, FiExternalLink, FiMapPin } from 'react-icons/fi'
import SponsorBadge from './SponsorBadge'

interface SponsorData {
  id: string
  companyName: string
  companyDescription?: string | null
  logoUrl?: string | null
  websiteUrl?: string | null
  tier: SponsorTier
  isVerified?: boolean
  categories?: string[]
  totalEventsSponsored?: number
  totalFlowContributed?: number
  preferredRegions?: string[] | null
}

interface SponsorCardProps {
  sponsor: SponsorData
  variant?: 'default' | 'compact' | 'featured'
  onClick?: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  apparel: 'Dance Apparel',
  music: 'Music & Audio',
  wellness: 'Health & Wellness',
  tech: 'Technology',
  venues: 'Venues',
  local: 'Local Business',
  media: 'Media',
  education: 'Education',
  lifestyle: 'Lifestyle',
  corporate: 'Corporate',
}

export default function SponsorCard({ sponsor, variant = 'default', onClick }: SponsorCardProps) {
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl ${onClick ? 'cursor-pointer hover:bg-bg-tertiary/80' : ''}`}
        onClick={onClick}
      >
        {/* Logo */}
        {sponsor.logoUrl ? (
          <img
            src={sponsor.logoUrl}
            alt={sponsor.companyName}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
            <span className="text-neon-purple font-bold text-lg">
              {sponsor.companyName[0].toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-text-primary truncate">{sponsor.companyName}</p>
            {sponsor.isVerified && (
              <FiCheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            )}
          </div>
          <SponsorBadge tier={sponsor.tier} size="sm" />
        </div>
      </div>
    )
  }

  if (variant === 'featured') {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-neon-purple/30 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 ${onClick ? 'cursor-pointer hover:border-neon-purple/50' : ''}`}
        onClick={onClick}
      >
        {/* Featured badge */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 bg-neon-purple text-white text-xs font-medium rounded-full">
            Featured Sponsor
          </span>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            {/* Logo */}
            {sponsor.logoUrl ? (
              <img
                src={sponsor.logoUrl}
                alt={sponsor.companyName}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                <span className="text-neon-purple font-bold text-2xl">
                  {sponsor.companyName[0].toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-text-primary truncate">
                  {sponsor.companyName}
                </h3>
                {sponsor.isVerified && (
                  <FiCheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                )}
              </div>
              <SponsorBadge tier={sponsor.tier} />
            </div>
          </div>

          {sponsor.companyDescription && (
            <p className="text-text-muted text-sm mb-4 line-clamp-2">
              {sponsor.companyDescription}
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-green-400 font-medium">
                ${(sponsor.totalFlowContributed || 0).toLocaleString()} contributed
              </span>
              <span className="text-text-muted">{sponsor.totalEventsSponsored || 0} events</span>
            </div>
            {sponsor.websiteUrl && (
              <a
                href={sponsor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-purple hover:text-neon-purple/80 flex items-center gap-1"
                onClick={e => e.stopPropagation()}
              >
                <FiExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div
      className={`bg-bg-secondary border border-white/10 rounded-xl overflow-hidden ${onClick ? 'cursor-pointer hover:border-neon-purple/30 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Logo */}
          {sponsor.logoUrl ? (
            <img
              src={sponsor.logoUrl}
              alt={sponsor.companyName}
              className="w-14 h-14 rounded-xl object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-neon-purple/20 flex items-center justify-center">
              <span className="text-neon-purple font-bold text-xl">
                {sponsor.companyName[0].toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-text-primary truncate">{sponsor.companyName}</h3>
              {sponsor.isVerified && (
                <FiCheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </div>
            <SponsorBadge tier={sponsor.tier} size="sm" />
          </div>
        </div>

        {sponsor.companyDescription && (
          <p className="text-text-muted text-sm mb-4 line-clamp-2">{sponsor.companyDescription}</p>
        )}

        {/* Categories */}
        {sponsor.categories && sponsor.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {sponsor.categories.slice(0, 3).map(cat => (
              <span
                key={cat}
                className="px-2 py-0.5 bg-white/5 text-text-muted text-xs rounded-full"
              >
                {CATEGORY_LABELS[cat] || cat}
              </span>
            ))}
            {sponsor.categories.length > 3 && (
              <span className="px-2 py-0.5 text-text-muted text-xs">
                +{sponsor.categories.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-green-400">
              ${(sponsor.totalFlowContributed || 0).toLocaleString()}
            </span>
            <span className="text-text-muted">{sponsor.totalEventsSponsored || 0} events</span>
          </div>

          {sponsor.preferredRegions && sponsor.preferredRegions.length > 0 && (
            <div className="flex items-center gap-1 text-text-muted">
              <FiMapPin size={12} />
              <span className="text-xs">{sponsor.preferredRegions[0]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
