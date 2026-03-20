'use client'

import { FaTiktok } from 'react-icons/fa'
import {
  FiActivity,
  FiAward,
  FiCalendar,
  FiInstagram,
  FiLink,
  FiMapPin,
  FiMusic,
  FiStar,
  FiTwitter,
  FiYoutube,
  FiZap,
} from 'react-icons/fi'

interface ProfileViewCardProps {
  user: any
  isOwnProfile?: boolean
}

export default function ProfileViewCard({ user, isOwnProfile = true }: ProfileViewCardProps) {
  if (!user) return null

  const isPremium = user?.is_premium === 'active' || user?.subscription_tier === 'premium'

  return (
    <div className="space-y-6 pb-6">
      {/* Cover & Avatar Section */}
      <div className="relative">
        <div className="h-48 rounded-xl overflow-hidden bg-gradient-to-r from-neon-purple/20 to-neon-pink/20">
          {user.cover_image_url ? (
            <img src={user.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neon-purple/30 via-neon-pink/20 to-neon-purple/30" />
          )}
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name || user.username}
                className="w-24 h-24 rounded-full object-cover border-4 border-bg-primary shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white text-3xl font-bold border-4 border-bg-primary shadow-lg">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            {isPremium && (
              <div className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <FiStar className="text-white" size={14} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-14 px-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              {user.display_name || user.username}
              {user.username_minted && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  .danz.eth
                </span>
              )}
            </h1>
            <p className="text-text-secondary">@{user.username}</p>
            {user.pronouns && <p className="text-text-secondary text-sm mt-1">{user.pronouns}</p>}
          </div>

          {/* Level Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple/20 border border-neon-purple/30 rounded-full">
            <FiZap className="text-neon-purple" size={14} />
            <span className="text-neon-purple font-semibold text-sm">Level {user.level || 1}</span>
          </div>
        </div>

        {/* Bio */}
        {user.bio && <p className="text-text-primary mt-4 leading-relaxed">{user.bio}</p>}

        {/* Location & Info Row */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-text-secondary">
          {(user.city || user.location) && user.show_location !== false && (
            <span className="flex items-center gap-1.5">
              <FiMapPin size={14} />
              {user.city}
              {user.city && user.location && ', '}
              {user.location}
            </span>
          )}
          {user.age && (
            <span className="flex items-center gap-1.5">
              <FiCalendar size={14} />
              {user.age} years old
            </span>
          )}
          {user.skill_level && (
            <span className="flex items-center gap-1.5 capitalize">
              <FiActivity size={14} />
              {user.skill_level}
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3 mt-6 p-4 bg-bg-secondary/50 rounded-xl border border-white/5">
          <div className="text-center">
            <div className="text-xl font-bold text-neon-purple">{user.xp || 0}</div>
            <div className="text-xs text-text-secondary">XP</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-neon-pink">{user.longest_streak || 0}</div>
            <div className="text-xs text-text-secondary">Streak</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">
              {user.total_events_attended || 0}
            </div>
            <div className="text-xs text-text-secondary">Events</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{user.dance_bonds_count || 0}</div>
            <div className="text-xs text-text-secondary">Bonds</div>
          </div>
        </div>

        {/* Dance Styles */}
        {user.dance_styles?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <FiAward size={14} />
              Dance Styles
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.dance_styles.map((style: string) => (
                <span
                  key={style}
                  className="px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/30 rounded-full text-neon-purple text-sm"
                >
                  {style}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Music */}
        {user.favorite_music?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <FiMusic size={14} />
              Favorite Music
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.favorite_music.map((genre: string) => (
                <span
                  key={genre}
                  className="px-3 py-1.5 bg-neon-pink/10 border border-neon-pink/30 rounded-full text-neon-pink text-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {(user.website || user.instagram || user.tiktok || user.youtube || user.twitter) && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <FiLink size={14} />
              Links
            </h3>
            <div className="flex flex-wrap gap-3">
              {user.website && (
                <a
                  href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-text-primary transition-colors"
                >
                  <FiLink size={16} />
                  <span className="text-sm">Website</span>
                </a>
              )}
              {user.instagram && (
                <a
                  href={`https://instagram.com/${user.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/30 rounded-lg text-text-primary hover:text-pink-400 transition-colors"
                >
                  <FiInstagram size={16} />
                  <span className="text-sm">@{user.instagram.replace('@', '')}</span>
                </a>
              )}
              {user.tiktok && (
                <a
                  href={`https://tiktok.com/@${user.tiktok.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/30 rounded-lg text-text-primary hover:text-cyan-400 transition-colors"
                >
                  <FaTiktok size={16} />
                  <span className="text-sm">@{user.tiktok.replace('@', '')}</span>
                </a>
              )}
              {user.youtube && (
                <a
                  href={`https://youtube.com/@${user.youtube.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-lg text-text-primary hover:text-red-400 transition-colors"
                >
                  <FiYoutube size={16} />
                  <span className="text-sm">@{user.youtube.replace('@', '')}</span>
                </a>
              )}
              {user.twitter && (
                <a
                  href={`https://twitter.com/${user.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-lg text-text-primary hover:text-blue-400 transition-colors"
                >
                  <FiTwitter size={16} />
                  <span className="text-sm">@{user.twitter.replace('@', '')}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Member Since */}
        {user.created_at && (
          <p className="mt-6 text-xs text-text-secondary">
            Member since{' '}
            {new Date(user.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
