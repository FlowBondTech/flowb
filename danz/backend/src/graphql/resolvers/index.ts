import { DateTimeResolver, JSONResolver } from 'graphql-scalars'
import { achievementResolvers } from './achievement.resolvers.js'
import { activityFeedResolvers } from './activityFeed.resolvers.js'
import { adminResolvers } from './admin.resolvers.js'
import { adminPointsResolvers } from './admin-points.resolvers.js'
import { analyticsResolvers } from './analytics.resolvers.js'
import { bondRequestResolvers } from './bondRequest.resolvers.js'
import { challengeResolvers } from './challenge.resolvers.js'
import { danceSessionResolvers } from './danceSession.resolvers.js'
import { devResolvers } from './dev.resolvers.js'
import { eventResolvers } from './event.resolvers.js'
import { eventManagerResolvers } from './eventManager.resolvers.js'
import { feedbackResolvers } from './feedback.resolvers.js'
import { freestyleSessionResolvers } from './freestyleSession.resolvers.js'
import { gigResolvers } from './gig.resolvers.js'
import { leaderboardResolvers } from './leaderboard.resolvers.js'
import { messagingResolvers } from './messaging.resolvers.js'
import { miniappResolvers } from './miniapp.resolvers.js'
import { notificationResolvers } from './notification.resolvers.js'
import { organizerResolvers } from './organizer.resolvers.js'
import { privacyResolvers } from './privacy.resolvers.js'
import { referralResolvers } from './referral.resolvers.js'
import { socialFeedResolvers } from './socialFeed.resolvers.js'
import { sponsorResolvers } from './sponsor.resolvers.js'
import { uploadResolvers } from './upload.resolvers.js'
import { userResolvers } from './user.resolvers.js'
import { usernameChangeResolvers } from './usernameChange.resolvers.js'
import { wearableResolvers } from './wearable.resolvers.js'

export const resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  Query: {
    _empty: () => 'empty',
    ...userResolvers.Query,
    ...eventResolvers.Query,
    ...eventManagerResolvers.Query,
    ...adminResolvers.Query,
    ...adminPointsResolvers.Query,
    ...devResolvers.Query,
    ...uploadResolvers.Query,
    ...danceSessionResolvers.Query,
    ...freestyleSessionResolvers.Query,
    ...notificationResolvers.Query,
    ...organizerResolvers.Query,
    ...referralResolvers.Query,
    ...socialFeedResolvers.Query,
    // New cross-platform features
    ...wearableResolvers.Query,
    ...challengeResolvers.Query,
    ...leaderboardResolvers.Query,
    ...activityFeedResolvers.Query,
    ...analyticsResolvers.Query,
    ...miniappResolvers.Query,
    ...messagingResolvers.Query,
    ...privacyResolvers.Query,
    ...bondRequestResolvers.Query,
    ...usernameChangeResolvers.Query,
    ...feedbackResolvers.Query,
    ...achievementResolvers.Query,
    // Gig economy system
    ...gigResolvers.Query,
    // Sponsorship & $FLOW token system
    ...sponsorResolvers.Query,
  },

  Mutation: {
    _empty: () => 'empty',
    ...userResolvers.Mutation,
    ...eventResolvers.Mutation,
    ...eventManagerResolvers.Mutation,
    ...adminResolvers.Mutation,
    ...adminPointsResolvers.Mutation,
    ...devResolvers.Mutation,
    ...danceSessionResolvers.Mutation,
    ...freestyleSessionResolvers.Mutation,
    ...notificationResolvers.Mutation,
    ...organizerResolvers.Mutation,
    ...referralResolvers.Mutation,
    ...socialFeedResolvers.Mutation,
    // New cross-platform features
    ...wearableResolvers.Mutation,
    ...challengeResolvers.Mutation,
    ...leaderboardResolvers.Mutation,
    ...activityFeedResolvers.Mutation,
    ...analyticsResolvers.Mutation,
    ...miniappResolvers.Mutation,
    ...messagingResolvers.Mutation,
    ...privacyResolvers.Mutation,
    ...bondRequestResolvers.Mutation,
    ...usernameChangeResolvers.Mutation,
    ...feedbackResolvers.Mutation,
    ...achievementResolvers.Mutation,
    // Gig economy system
    ...gigResolvers.Mutation,
    // Sponsorship & $FLOW token system
    ...sponsorResolvers.Mutation,
  },

  User: userResolvers.User,
  Event: eventResolvers.Event,
  EventRegistration: eventResolvers.EventRegistration,
  EventManager: eventManagerResolvers.EventManager,
  DanceBond: userResolvers.DanceBond || socialFeedResolvers.DanceBond,
  DanceSession: danceSessionResolvers.DanceSession,
  FreestyleSession: freestyleSessionResolvers.FreestyleSession,
  Notification: notificationResolvers.Notification,
  OrganizerApplication: organizerResolvers.OrganizerApplication,
  ReferralCode: referralResolvers.ReferralCode,
  Referral: referralResolvers.Referral,
  PointTransaction: adminPointsResolvers.PointTransaction,
  DailyActivity: adminPointsResolvers.DailyActivity,
  EventAttendance: adminPointsResolvers.EventAttendance,
  Post: socialFeedResolvers.Post,
  PostWithDetails: socialFeedResolvers.PostWithDetails,
  PostLike: socialFeedResolvers.PostLike,
  PostComment: socialFeedResolvers.PostComment,

  // Dev Panel Types
  FeatureRequest: devResolvers.FeatureRequest,
  FeatureRequestComment: devResolvers.FeatureRequestComment,
  DevTask: devResolvers.DevTask,
  ChangelogEntry: devResolvers.ChangelogEntry,

  // New cross-platform types
  WearableDevice: wearableResolvers.WearableDevice,
  WearableHealthData: wearableResolvers.WearableHealthData,
  WearableMotionData: wearableResolvers.WearableMotionData,
  UserChallenge: challengeResolvers.UserChallenge,
  Activity: activityFeedResolvers.Activity,

  // Messaging types
  Conversation: messagingResolvers.Conversation,
  ConversationParticipant: messagingResolvers.ConversationParticipant,
  Message: messagingResolvers.Message,
  MessageReaction: messagingResolvers.MessageReaction,
  UserBlock: messagingResolvers.UserBlock,

  // Privacy types
  UserSuggestion: privacyResolvers.UserSuggestion,

  // Bond request types
  BondRequest: bondRequestResolvers.BondRequest,

  // Username change types
  UsernameChangeRequest: usernameChangeResolvers.UsernameChangeRequest,

  // Feedback types
  Feedback: feedbackResolvers.Feedback,

  // Gig economy types
  GigRole: gigResolvers.GigRole,
  UserGigRole: gigResolvers.UserGigRole,
  EventGig: gigResolvers.EventGig,
  GigApplication: gigResolvers.GigApplication,
  GigSubmission: gigResolvers.GigSubmission,
  GigRewardRate: gigResolvers.GigRewardRate,
  EventGigManager: gigResolvers.EventGigManager,

  // Sponsorship & $FLOW token types
  Sponsor: sponsorResolvers.Sponsor,
  SponsorCategory: sponsorResolvers.SponsorCategory,
  EventSponsorship: sponsorResolvers.EventSponsorship,
  EventFlowPool: sponsorResolvers.EventFlowPool,
  FlowTransaction: sponsorResolvers.FlowTransaction,
  SponsorSubscription: sponsorResolvers.SponsorSubscription,
  SubscriptionAutoMatch: sponsorResolvers.SubscriptionAutoMatch,
  VerifiedEventCreator: sponsorResolvers.VerifiedEventCreator,
  SponsorshipApproval: sponsorResolvers.SponsorshipApproval,
  EventSponsorshipSettings: sponsorResolvers.EventSponsorshipSettings,
  SuggestedEvent: sponsorResolvers.SuggestedEvent,
}
