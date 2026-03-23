export type PendingGigApplication = {
  id: string
  gigId: string
  userId: string
  status: string
  applicationNote?: string | null
  createdAt: string
  user?: {
    privy_id: string
    username?: string | null
    display_name?: string | null
    avatar_url?: string | null
  } | null
  gig?: {
    id: string
    eventId: string
    roleId: string
    title: string
    description?: string | null
    danzReward?: number | null
    role?: {
      id: string
      name: string
      slug: string
      icon?: string | null
      category?: string | null
    } | null
    event?: {
      id: string
      title: string
      start_date_time?: string | null
      location_name?: string | null
    } | null
  } | null
}

export type GigManagerStats = {
  totalReviewed: number
  approvedCount: number
  rejectedCount: number
  averageReviewTime?: number | null
  todayReviewed: number
}
