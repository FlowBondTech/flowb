'use client'

import BackToTop from '@/src/components/ethdenver/BackToTop'
import CTASection from '@/src/components/ethdenver/CTASection'
import CommunityMissionsSection from '@/src/components/ethdenver/CommunityMissionsSection'
import CoreMissionsSection from '@/src/components/ethdenver/CoreMissionsSection'
import FlowBondIntegrationSection from '@/src/components/ethdenver/FlowBondIntegrationSection'
import HeroSection from '@/src/components/ethdenver/HeroSection'
import LeaderboardRewardsSection from '@/src/components/ethdenver/LeaderboardRewardsSection'
import MissionBoardPreview from '@/src/components/ethdenver/MissionBoardPreview'
import SectionNav from '@/src/components/ethdenver/SectionNav'
import SponsorPacksSection from '@/src/components/ethdenver/SponsorPacksSection'
import ValuePropositionSection from '@/src/components/ethdenver/ValuePropositionSection'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { FiCheckCircle, FiX } from 'react-icons/fi'

export default function ETHDenverPage() {
  const searchParams = useSearchParams()
  const isSponsorSuccess = searchParams.get('sponsor_success') === 'true'
  const [showBanner, setShowBanner] = useState(isSponsorSuccess)

  return (
    <>
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-neon-purple to-neon-pink text-white px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">
                Sponsor purchase successful! View your sponsor dashboard{' '}
                <Link href="/dashboard/sponsor" className="underline font-bold hover:opacity-80">
                  here
                </Link>
                .
              </span>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      <SectionNav />
      <HeroSection />
      <CoreMissionsSection />
      <SponsorPacksSection />
      <MissionBoardPreview />
      <CommunityMissionsSection />
      <LeaderboardRewardsSection />
      <ValuePropositionSection />
      <FlowBondIntegrationSection />
      <CTASection />
      <BackToTop />
    </>
  )
}
