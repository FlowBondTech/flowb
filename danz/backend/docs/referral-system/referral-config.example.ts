/**
 * Referral System Configuration
 * 
 * Centralized configuration for the DANZ referral system.
 * Copy to src/config/referral.ts and customize as needed.
 */

export const REFERRAL_CONFIG = {
  // Points & Rewards
  POINTS_PER_REFERRAL: 20,
  REFEREE_BONUS_POINTS: 0,  // Optional: points for referee
  
  // Time Limits
  REFERRAL_EXPIRY_DAYS: 30,
  REWARD_DELAY_HOURS: 24,  // Wait before awarding points
  MIN_SESSION_DURATION_SECONDS: 300,  // 5 minutes
  
  // Rate Limits
  MAX_PENDING_PER_USER: 10,
  MAX_CLICKS_PER_HOUR: 5,
  MAX_SIGNUPS_PER_IP_PER_DAY: 3,
  MAX_SAME_DEVICE_REFERRALS: 2,
  
  // Fraud Detection
  FRAUD_DETECTION_ENABLED: true,
  MIN_SECONDS_TO_SIGNUP: 5,
  SAME_IP_THRESHOLD: 3,
  SAME_DEVICE_THRESHOLD: 2,
  RAPID_REFERRAL_THRESHOLD: 5,
  
  // URLs
  DEEP_LINK_SCHEME: 'danz',
  DEEP_LINK_DOMAIN: 'danz.now',
  LANDING_PAGE_PATH: '/i',
  
  // Share Messages
  SHARE_MESSAGE: 'Join me on DANZ - Dance, Earn, Connect!',
  SHARE_TITLE: 'Join me on DANZ!',
  
  // App Store Links
  IOS_APP_ID: 'YOUR_APP_ID',
  IOS_APP_STORE_URL: 'https://apps.apple.com/app/danz/YOUR_APP_ID',
  ANDROID_PACKAGE_NAME: 'com.danz.app',
  ANDROID_PLAY_STORE_URL: 'https://play.google.com/store/apps/details?id=com.danz.app',
} as const;

export type ReferralConfig = typeof REFERRAL_CONFIG;

export default REFERRAL_CONFIG;
