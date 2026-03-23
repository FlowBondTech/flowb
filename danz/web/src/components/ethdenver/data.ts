// ─── TypeScript Interfaces ───────────────────────────────────────────────────

export interface Mission {
  name: string
  description: string
  xp: number
  icon: string
}

export interface MissionCategory {
  id: string
  title: string
  subtitle: string
  gradient: string
  missions: Mission[]
}

export interface SponsorTier {
  id: string
  name: string
  price: string
  missions: string
  features: string[]
  highlighted: boolean
  cta: string
}

export interface RewardTier {
  rank: string
  label: string
  rewards: string[]
  gradient: string
}

export interface ValueCard {
  audience: string
  headline: string
  points: string[]
  gradient: string
}

export interface FlowBondFeature {
  title: string
  description: string
  multiplier?: string
}

export interface CommunityPartner {
  type: string
  examples: string[]
  benefit: string
}

export interface NavSection {
  id: string
  label: string
}

// ─── Section Navigation ─────────────────────────────────────────────────────

export const navSections: NavSection[] = [
  { id: 'hero', label: 'Overview' },
  { id: 'missions', label: 'Missions' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'preview', label: 'App Preview' },
  { id: 'community', label: 'Community' },
  { id: 'leaderboard', label: 'Rewards' },
  { id: 'value', label: 'Value' },
  { id: 'flowbond', label: 'FlowBond' },
  { id: 'cta', label: 'Partner' },
]

// ─── Hero Stats ─────────────────────────────────────────────────────────────

export const heroStats = [
  { value: '3', label: 'Mission Types' },
  { value: '7', label: 'Days' },
  { value: '$DANZ', label: 'Token Rewards' },
  { value: '4', label: 'Sponsor Tiers' },
]

// ─── Mission Categories ─────────────────────────────────────────────────────

export const missionCategories: MissionCategory[] = [
  {
    id: 'dance',
    title: 'Core Dance',
    subtitle: 'Move to earn rewards',
    gradient: 'from-purple-500 to-pink-500',
    missions: [
      {
        name: 'First Dance',
        description: 'Complete your first dance session at ETHDenver',
        xp: 100,
        icon: '💃',
      },
      {
        name: 'Night Mover',
        description: 'Dance at 3 different after-parties',
        xp: 300,
        icon: '🌙',
      },
      {
        name: 'Flow State',
        description: '30-minute unbroken dance session verified by FlowBond',
        xp: 500,
        icon: '🌊',
      },
      {
        name: 'Social Spark',
        description: 'Dance with 5 different partners in one night',
        xp: 250,
        icon: '✨',
      },
      {
        name: 'Triple Flow',
        description: 'Complete 3 dance missions in a single day',
        xp: 400,
        icon: '🔥',
      },
      {
        name: 'Pop-Up Starter',
        description: 'Start a spontaneous dance circle with 5+ people',
        xp: 600,
        icon: '🎪',
      },
    ],
  },
  {
    id: 'community',
    title: 'Community',
    subtitle: 'Explore & connect',
    gradient: 'from-pink-500 to-red-500',
    missions: [
      {
        name: 'Visit the House',
        description: 'Check in at 3 different hack houses',
        xp: 200,
        icon: '🏠',
      },
      {
        name: "Builder's Break",
        description: 'Join a movement break at a hack house',
        xp: 150,
        icon: '🔨',
      },
      {
        name: 'Sunset Flow',
        description: 'Attend an outdoor movement session',
        xp: 350,
        icon: '🌅',
      },
      {
        name: 'Venue Explorer',
        description: 'Visit 5 different event venues in Denver',
        xp: 250,
        icon: '🗺️',
      },
    ],
  },
  {
    id: 'sponsor',
    title: 'Sponsor',
    subtitle: 'Brand challenges',
    gradient: 'from-blue-500 to-purple-500',
    missions: [
      {
        name: 'Visit Booth',
        description: 'Check in at a sponsor booth and learn about their project',
        xp: 100,
        icon: '🎯',
      },
      {
        name: 'Brand Challenge',
        description: 'Complete a sponsor-specific movement challenge',
        xp: 300,
        icon: '🏆',
      },
      {
        name: 'Social Share',
        description: 'Post about a sponsor with the event hashtag',
        xp: 150,
        icon: '📱',
      },
      {
        name: 'QR Scan',
        description: 'Scan sponsor QR codes at 3 different locations',
        xp: 200,
        icon: '📲',
      },
    ],
  },
]

// ─── Sponsor Tiers ──────────────────────────────────────────────────────────

export const sponsorTiers: SponsorTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$500',
    missions: '2 custom missions',
    features: [
      'Logo on mission card',
      'Basic analytics dashboard',
      'Listed in sponsor directory',
      'Post-event engagement report',
    ],
    highlighted: false,
    cta: 'Get Started',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$2,000',
    missions: '5 custom missions',
    features: [
      'Featured placement in mission feed',
      'Social media mentions (3x)',
      'Branded QR check-in experience',
      'Real-time analytics dashboard',
      'Priority mission positioning',
    ],
    highlighted: false,
    cta: 'Choose Growth',
  },
  {
    id: 'headliner',
    name: 'Headliner',
    price: '$5,000',
    missions: '10 custom missions',
    features: [
      'Push notifications to all users',
      'Full content package (photo + video)',
      'Dedicated mission category',
      'VIP analytics + heatmaps',
      'Co-branded leaderboard section',
      'On-stage brand moment',
    ],
    highlighted: true,
    cta: 'Go Headliner',
  },
  {
    id: 'ecosystem',
    name: 'Ecosystem',
    price: '$10,000',
    missions: 'Unlimited missions',
    features: [
      'Full-week presence across all events',
      'Comprehensive analytics report',
      'Custom FlowBond integration',
      'Exclusive sponsor leaderboard',
      'Post-event user engagement data',
      'Priority partnership for future events',
      'Co-created movement experience',
    ],
    highlighted: false,
    cta: 'Partner With Us',
  },
]

// ─── Reward Tiers ───────────────────────────────────────────────────────────

export const rewardTiers: RewardTier[] = [
  {
    rank: 'Top 10',
    label: 'Legends',
    gradient: 'from-yellow-400 to-amber-500',
    rewards: [
      'FlowBond device',
      '$DANZ token rewards (amount TBA)',
      'Priority access to future DANZ events',
      'Exclusive NFT achievement badge',
    ],
  },
  {
    rank: 'Top 50',
    label: 'Champions',
    gradient: 'from-slate-300 to-slate-400',
    rewards: [
      '$DANZ token rewards (amount TBA)',
      'Early access to DANZ platform features',
      'Champion NFT badge',
      'Leaderboard recognition',
    ],
  },
  {
    rank: 'Top 200',
    label: 'Movers',
    gradient: 'from-amber-600 to-amber-700',
    rewards: [
      '$DANZ token rewards (amount TBA)',
      'Achievement NFT',
      'Community recognition on leaderboard',
    ],
  },
]

// ─── Value Propositions ─────────────────────────────────────────────────────

export const valueCards: ValueCard[] = [
  {
    audience: 'Sponsors',
    headline: 'Measurable engagement, not just impressions',
    gradient: 'from-purple-500 to-pink-500',
    points: [
      'Real-time mission completion analytics',
      'Verified foot traffic to your booth',
      'Social amplification through user challenges',
      'Post-event engagement data package',
    ],
  },
  {
    audience: 'Organizers',
    headline: 'Turn your event into an interactive experience',
    gradient: 'from-pink-500 to-red-500',
    points: [
      'Drive attendee engagement between talks',
      'Gamified venue exploration',
      'Sponsor revenue through mission packs',
      'Post-event analytics for future planning',
    ],
  },
  {
    audience: 'Attendees',
    headline: 'Earn rewards just by showing up and moving',
    gradient: 'from-blue-500 to-purple-500',
    points: [
      'Earn $DANZ rewards for completing missions',
      'Discover hidden events and experiences',
      'Compete on the leaderboard for prizes',
      'Connect with the dance community',
    ],
  },
]

// ─── FlowBond Features ──────────────────────────────────────────────────────

export const flowBondFeatures: FlowBondFeature[] = [
  {
    title: 'Proof of Movement',
    description: 'On-chain verification that you actually danced, not just checked in',
    multiplier: '1x base',
  },
  {
    title: 'Dance Bonus Multiplier',
    description: 'FlowBond wearers earn 2x-3x on all dance missions',
    multiplier: '2-3x bonus',
  },
  {
    title: 'Group Sync Detection',
    description: 'When multiple FlowBonds sync, everyone gets a collaborative bonus',
    multiplier: '1.5x group',
  },
  {
    title: 'Proof of Attendance',
    description: 'On-chain attendance verification via wearable proximity',
  },
]

// ─── Community Partners ─────────────────────────────────────────────────────

export const communityPartners: CommunityPartner[] = [
  {
    type: 'Hack Houses',
    examples: ['ETHDenver Official', 'Solana House', 'DeFi Den', 'NFT Gallery'],
    benefit: 'Drive foot traffic with location-based missions',
  },
  {
    type: 'Side Events',
    examples: ['After-parties', 'Workshops', 'Meetups', 'Panels'],
    benefit: 'Boost attendance with mission-gated experiences',
  },
  {
    type: 'Venues',
    examples: ['Clubs', 'Bars', 'Co-working spaces', 'Pop-up locations'],
    benefit: 'Transform your space into a mission checkpoint',
  },
]

// ─── Phone Mockup Missions ──────────────────────────────────────────────────

export const previewMissions = [
  { name: 'First Dance', xp: 100, status: 'completed' as const, icon: '💃' },
  { name: 'Visit Solana House', xp: 200, status: 'active' as const, icon: '🏠' },
  { name: 'Night Mover', xp: 300, status: 'locked' as const, icon: '🌙' },
  { name: 'Brand Challenge', xp: 300, status: 'locked' as const, icon: '🏆' },
  { name: 'Flow State', xp: 500, status: 'locked' as const, icon: '🌊' },
]
