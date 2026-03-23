/** Local types matching the GraphQL gig fragments. These will be superseded
 *  by generated types once `npm run codegen` is executed against the backend
 *  schema that includes the gig domain. */

export interface GigRole {
  id: string
  name: string
  slug: string
  description?: string | null
  category?: string | null
  tier?: string | null
  icon?: string | null
  baseDanzRate?: number | null
  requiresVerification?: boolean | null
  isActive?: boolean | null
}

export interface GigEvent {
  id: string
  title: string
  start_date_time?: string | null
  end_date_time?: string | null
  location_name?: string | null
  location_city?: string | null
}

export interface GigApplication {
  id: string
  status: string
}

export interface EventGigItem {
  id: string
  eventId: string
  roleId: string
  title: string
  description?: string | null
  slotsAvailable: number
  slotsFilled: number
  danzReward: number
  bonusDanz?: number | null
  timeCommitment?: string | null
  specificRequirements?: string | null
  status: string
  createdAt: string
  role?: GigRole | null
  event?: GigEvent | null
  canApply?: boolean | null
  myApplication?: GigApplication | null
}

export interface GigApplicationItem {
  id: string
  gigId: string
  userId: string
  status: string
  applicationNote?: string | null
  danzAwarded?: number | null
  createdAt: string
  gig: EventGigItem
}

export interface GigStats {
  totalGigsCompleted: number
  totalDanzEarned: number
  activeRoles: number
  currentApprovedGigs: number
  pendingApplications: number
  averageRating: number
  lastGigDate?: string | null
}

export interface GigDashboardData {
  stats: GigStats
  availableGigs: EventGigItem[]
  activeGigs: GigApplicationItem[]
  recentHistory: GigApplicationItem[]
}
