'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useAuth } from '@/src/contexts/AuthContext'
import { useReferralData } from '@/src/hooks/useReferralData'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import {
  FiAward,
  FiBell,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiGift,
  FiLoader,
  FiMessageCircle,
  FiShare2,
  FiStar,
  FiUsers,
} from 'react-icons/fi'

function ReferralsContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const { user } = useAuth()
  const router = useRouter()
  const [copiedShareUrl, setCopiedShareUrl] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false)
  const [nudgingId, setNudgingId] = useState<string | null>(null)
  const [nudgeSuccess, setNudgeSuccess] = useState<string | null>(null)

  // Fetch real referral data from Supabase
  const { referrals, pointsData, stats, loading: dataLoading } = useReferralData(user?.username)

  // Use username as referral code (simple approach)
  const referralCode = user?.username || 'loading...'
  const shareUrl = `https://danz.now/i/${referralCode}`


  const copyToClipboard = (text: string, type: 'url' | 'code') => {
    navigator.clipboard.writeText(text)
    if (type === 'url') {
      setCopiedShareUrl(true)
      setTimeout(() => setCopiedShareUrl(false), 2000)
    } else {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Join me on DANZ! Dance your way to fitness and earn rewards. 🕺💃\n\nUse my referral link: ${shareUrl}`,
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  const shareViaSMS = () => {
    const message = encodeURIComponent(
      `Hey! Join me on DANZ and earn rewards by dancing. Use my link: ${shareUrl}`,
    )
    window.location.href = `sms:?&body=${message}`
  }

  const handleNudge = async (referralId: string) => {
    setNudgingId(referralId)
    setNudgeSuccess(null)

    // For now, show a success message (actual nudge will be via GraphQL when backend is ready)
    // TODO: Integrate with GraphQL mutation when email service is configured
    setTimeout(() => {
      setNudgingId(null)
      setNudgeSuccess(referralId)
      setTimeout(() => setNudgeSuccess(null), 3000)
    }, 1000)
  }

  if (isLoading || dataLoading) {
    return (
      <DashboardLayout>
        <div
          className="flex items-center justify-center min-h-[60vh]"
          role="status"
          aria-live="polite"
        >
          <div className="text-text-primary text-2xl">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Hero Section - Reward Highlight */}
        <div className="bg-gradient-to-r from-neon-purple/20 via-neon-pink/20 to-neon-purple/20 border border-neon-purple/30 rounded-2xl p-6 sm:p-8 mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <FiGift size={16} />
            Earn Big Rewards!
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
            Get{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              250 Points
            </span>{' '}
            Per Referral
          </h1>
          <p className="text-text-secondary max-w-md mx-auto">
            Share your unique link with friends. When they join and complete their first dance
            session, you both win!
          </p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-bg-secondary rounded-xl border border-white/10 p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">{stats.totalSignups}</p>
            <p className="text-xs text-text-secondary">Friends Joined</p>
          </div>
          <div className="bg-bg-secondary rounded-xl border border-white/10 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.totalCompleted}</p>
            <p className="text-xs text-text-secondary">Completed</p>
          </div>
          <div className="bg-bg-secondary rounded-xl border border-white/10 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {stats.totalPointsEarned.toLocaleString()}
            </p>
            <p className="text-xs text-text-secondary">Points Earned</p>
          </div>
          <div className="bg-bg-secondary rounded-xl border border-white/10 p-4 text-center">
            <p className="text-2xl font-bold text-neon-purple">{stats.conversionRate}%</p>
            <p className="text-xs text-text-secondary">Success Rate</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left Column - Share Tools (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Share Link Card */}
            <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-5">
              <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <FiShare2 className="text-neon-purple" />
                Share Your Link
              </h2>

              {/* Referral Link Display */}
              <div className="bg-bg-primary rounded-lg p-4 border border-white/10 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">YOUR REFERRAL LINK</p>
                    <p className="text-sm text-text-primary font-mono truncate">{shareUrl}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(shareUrl, 'url')}
                    className={`shrink-0 px-4 py-2.5 rounded-lg font-medium transition-all ${
                      copiedShareUrl
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30'
                    }`}
                  >
                    {copiedShareUrl ? (
                      <span className="flex items-center gap-1.5">
                        <FiCheck size={16} /> Copied!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <FiCopy size={16} /> Copy
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={shareViaWhatsApp}
                  className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-text-primary font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  <FaWhatsapp size={20} />
                  WhatsApp
                </button>
                <button
                  onClick={shareViaSMS}
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-text-primary font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  <FiMessageCircle size={18} />
                  SMS
                </button>
              </div>
            </div>

            {/* How It Works - Compact */}
            <div className="bg-bg-secondary rounded-xl border border-white/10 p-5">
              <h2 className="text-lg font-bold text-text-primary mb-4">How It Works</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">Share Link</p>
                    <p className="text-xs text-text-secondary">Send to friends via any app</p>
                  </div>
                </div>
                <div className="flex-1 flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">Friend Joins</p>
                    <p className="text-xs text-text-secondary">
                      You earn <span className="text-yellow-400 font-medium">+20 pts</span>{' '}
                      instantly
                    </p>
                  </div>
                </div>
                <div className="flex-1 flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm">They Dance</p>
                    <p className="text-xs text-text-secondary">
                      You earn <span className="text-green-400 font-medium">+230 pts</span> more!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Points & Referrals (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Points Balance Card */}
            <div className="bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 rounded-xl border border-neon-purple/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-secondary">Your Points Balance</h3>
                <FiStar className="text-yellow-400" size={20} />
              </div>
              <p className="text-3xl font-bold text-text-primary mb-1">
                {pointsData?.current_points_balance?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-text-secondary mb-3">Available points</p>

              {/* Expandable Breakdown */}
              <button
                onClick={() => setShowPointsBreakdown(!showPointsBreakdown)}
                className="w-full flex items-center justify-between text-xs text-neon-purple hover:text-neon-pink transition-colors"
              >
                <span>View breakdown</span>
                {showPointsBreakdown ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              </button>

              {showPointsBreakdown && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Total Earned</span>
                    <span className="text-text-primary">
                      {pointsData?.total_points_earned?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">From Referrals</span>
                    <span className="text-green-400">
                      {pointsData?.referral_points_earned?.toLocaleString() ||
                        stats.totalPointsEarned}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Spent</span>
                    <span className="text-red-400">
                      {pointsData?.total_points_spent?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Earning Tips - Compact */}
            <div className="bg-bg-secondary rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <FiAward className="text-yellow-400" size={16} />
                Ways to Earn
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Friend signs up</span>
                  <span className="text-yellow-400 font-medium">+20 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Friend dances</span>
                  <span className="text-green-400 font-medium">+230 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Dance session</span>
                  <span className="text-purple-400 font-medium">+10 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Attend event</span>
                  <span className="text-orange-400 font-medium">+50 pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Referrals - Full Width */}
        <div className="mt-6 bg-bg-secondary rounded-xl border border-neon-purple/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FiUsers className="text-neon-purple" />
              Recent Referrals
            </h2>
            {referrals.length > 0 && (
              <span className="text-sm text-text-secondary">
                {referrals.length} {referrals.length === 1 ? 'friend' : 'friends'}
              </span>
            )}
          </div>

          {referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map(referral => (
                <div
                  key={referral.id}
                  className="bg-bg-primary rounded-lg p-3 sm:p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {referral.avatar_url ? (
                      <img
                        src={referral.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold shrink-0">
                        {referral.display_name?.charAt(0).toUpperCase() ||
                          referral.username?.charAt(0).toUpperCase() ||
                          '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {referral.display_name || referral.username}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Joined {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 justify-end shrink-0">
                    {/* Points earned */}
                    <span
                      className={`font-bold text-sm ${referral.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}
                    >
                      +{referral.points_awarded}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                        referral.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {referral.status === 'completed' ? (
                        <span className="flex items-center gap-1">
                          <FiCheck size={12} /> Done
                        </span>
                      ) : (
                        <span className="hidden sm:inline">Waiting</span>
                      )}
                    </span>

                    {/* Nudge button for pending referrals */}
                    {referral.status !== 'completed' && (
                      <button
                        onClick={() => handleNudge(referral.id)}
                        disabled={nudgingId === referral.id}
                        className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          nudgeSuccess === referral.id
                            ? 'bg-green-500/20 text-green-400'
                            : nudgingId === referral.id
                              ? 'bg-neon-purple/10 text-neon-purple/50 cursor-wait'
                              : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30'
                        }`}
                        title="Send a friendly reminder"
                      >
                        {nudgingId === referral.id ? (
                          <FiLoader size={14} className="animate-spin" />
                        ) : nudgeSuccess === referral.id ? (
                          <>
                            <FiCheck size={14} />
                            <span className="hidden sm:inline">Sent!</span>
                          </>
                        ) : (
                          <>
                            <FiBell size={14} />
                            <span className="hidden sm:inline">Nudge</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <FiUsers className="text-text-secondary" size={32} />
              </div>
              <p className="text-text-secondary mb-2">No referrals yet</p>
              <p className="text-sm text-text-secondary">
                Share your link above to start earning 250 points per friend!
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function ReferralsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div
            className="flex items-center justify-center min-h-[60vh]"
            role="status"
            aria-live="polite"
          >
            <div className="text-text-primary text-2xl">Loading...</div>
          </div>
        </DashboardLayout>
      }
    >
      <ReferralsContent />
    </Suspense>
  )
}
