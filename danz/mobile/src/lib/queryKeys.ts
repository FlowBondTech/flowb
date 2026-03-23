// Query key factory for consistent cache key management
export const queryKeys = {
  // Events
  events: () => ['events'] as const,
  eventsList: (filters?: any) => ['events', 'list', filters] as const,
  event: (id: string) => ['events', 'detail', id] as const,
  userEvents: (userId: string) => ['events', 'user', userId] as const,
  myCreatedEvents: () => ['events', 'created', 'me'] as const,
  organizerEvents: (organizerId: string) => ['events', 'organizer', organizerId] as const,
  pastEvents: () => ['events', 'past'] as const,

  // Feed
  feedPosts: (filters?: any) => ['feed', 'posts', filters] as const,
  feedPost: (id: string) => ['feed', 'post', id] as const,
  userFeedPosts: (userId: string) => ['feed', 'user', userId] as const,

  // Users
  users: () => ['users'] as const,
  usersList: (filters?: any) => ['users', 'list', filters] as const,
  user: (id: string) => ['users', 'detail', id] as const,
  userProfile: (userId?: string) => ['users', 'profile', userId || 'me'] as const,
  currentUser: () => ['users', 'current'] as const,
  userByUsername: (username: string) => ['users', 'username', username] as const,
  checkUsername: (username: string) => ['users', 'check-username', username] as const,

  // Auth
  auth: () => ['auth'] as const,

  // Uploads
  uploads: () => ['uploads'] as const,
  uploadUrl: () => ['uploads', 'url'] as const,

  // Achievements
  achievements: () => ['achievements'] as const,
  userAchievements: (userId: string) => ['achievements', 'user', userId] as const,

  // Notifications
  notifications: () => ['notifications'] as const,
  userNotifications: (userId: string) => ['notifications', 'user', userId] as const,

  // Dance Bonds
  danceBonds: () => ['danceBonds'] as const,
  userDanceBonds: (userId: string) => ['danceBonds', 'user', userId] as const,

  // Sessions
  sessions: () => ['sessions'] as const,
  userSessions: (userId: string) => ['sessions', 'user', userId] as const,
  sessionHistory: (userId: string) => ['sessions', 'history', userId] as const,

  // Wallet
  wallet: () => ['wallet'] as const,
  userWallet: (userId: string) => ['wallet', 'user', userId] as const,
}
