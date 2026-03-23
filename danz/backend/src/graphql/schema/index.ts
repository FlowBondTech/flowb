import { mergeTypeDefs } from '@graphql-tools/merge'
import { achievementTypeDefs } from './achievement.schema.js'
import { activityFeedTypeDefs } from './activityFeed.schema.js'
import { adminTypeDefs } from './admin.schema.js'
import { analyticsTypeDefs } from './analytics.schema.js'
import { baseTypeDefs } from './base.schema.js'
import { bondRequestTypeDefs } from './bond-request.schema.js'
import { challengeTypeDefs } from './challenge.schema.js'
import { danceSessionTypeDefs } from './danceSession.schema.js'
import { devTypeDefs } from './dev.schema.js'
import { eventTypeDefs } from './event.schema.js'
import { eventManagerTypeDefs } from './eventManager.schema.js'
import { feedbackTypeDefs } from './feedback.schema.js'
import { freestyleSessionTypeDefs } from './freestyleSession.schema.js'
import { gigTypeDefs } from './gig.schema.js'
import { leaderboardTypeDefs } from './leaderboard.schema.js'
import { messagingTypeDefs } from './messaging.schema.js'
import { miniappTypeDefs } from './miniapp.schema.js'
import { notificationTypeDefs } from './notification.schema.js'
import { organizerTypeDefs } from './organizer.schema.js'
import { privacyTypeDefs } from './privacy.schema.js'
import { referralTypeDefs } from './referral.schema.js'
import { socialFeedTypeDefs } from './socialFeed.schema.js'
import { sponsorTypeDefs } from './sponsor.schema.js'
import { uploadTypeDefs } from './upload.schema.js'
import { userTypeDefs } from './user.schema.js'
import { usernameChangeTypeDefs } from './usernameChange.schema.js'
import { wearableTypeDefs } from './wearable.schema.js'

export const typeDefs = mergeTypeDefs([
  baseTypeDefs,
  userTypeDefs,
  eventTypeDefs,
  eventManagerTypeDefs,
  adminTypeDefs,
  devTypeDefs,
  uploadTypeDefs,
  danceSessionTypeDefs,
  freestyleSessionTypeDefs,
  organizerTypeDefs,
  referralTypeDefs,
  socialFeedTypeDefs,
  messagingTypeDefs,
  privacyTypeDefs,
  bondRequestTypeDefs,
  usernameChangeTypeDefs,
  achievementTypeDefs,
  // New cross-platform features
  wearableTypeDefs,
  challengeTypeDefs,
  leaderboardTypeDefs,
  activityFeedTypeDefs,
  analyticsTypeDefs,
  miniappTypeDefs,
  feedbackTypeDefs,
  // Gig economy system
  gigTypeDefs,
  // Notifications (after gig schema since it references EventGig and GigApplication)
  notificationTypeDefs,
  // Sponsorship & $FLOW token system
  sponsorTypeDefs,
])
