# DANZ Referral System - Complete Documentation

This directory contains the complete implementation plan for the DANZ mobile app referral system.

## 📋 What's Included

### 1. **REFERRAL_SYSTEM_PLAN.md** (Main Documentation)
Complete 14-section implementation guide covering:
- Database schema (4 new tables)
- GraphQL API (schema + resolvers)
- Mobile app components (React Native)
- Deep linking setup (iOS + Android)
- Fraud prevention system
- User flows and business logic
- Testing & deployment checklists

### 2. **migration_001_referral_system.sql** (Database Migration)
Production-ready SQL migration with:
- All table definitions
- Indexes for performance
- Triggers for automation
- Functions for fraud detection
- Views for analytics
- Row Level Security policies

### 3. **QUICK_START.md** (Implementation Guide)
Step-by-step setup instructions:
- 6-step implementation plan
- Testing procedures
- Common issues & solutions
- Key files reference

### 4. **referral-config.example.ts** (Configuration)
Type-safe configuration file with:
- Reward amounts
- Rate limits
- Fraud thresholds
- URL structure
- Feature flags

---

## 🚀 Quick Start

### For Developers:
1. Read **QUICK_START.md** first
2. Run **migration_001_referral_system.sql** in Supabase
3. Copy code from **REFERRAL_SYSTEM_PLAN.md** sections 5-6
4. Test using flows in **QUICK_START.md**

### For Product Managers:
1. Review **REFERRAL_SYSTEM_PLAN.md** sections 1-4, 7, 9
2. Understand business logic and user flows
3. Review fraud prevention strategy
4. Check deployment checklist

### For QA/Testing:
1. Follow testing checklist in section 11 of plan
2. Use testing flows in **QUICK_START.md**
3. Review fraud prevention tests

---

## 🎯 Key Features

✅ **Referral Links**: `danz.now/i/username` format
✅ **Rewards**: 20 points per successful referral
✅ **Deep Linking**: iOS Universal Links + Android App Links
✅ **Fraud Prevention**: Multi-layer detection system
✅ **Mobile UI**: Complete React Native components
✅ **Analytics**: Built-in views and metrics
✅ **Scalable**: Production-ready database design

---

## 📊 System Architecture

```
User Flow:
┌─────────────────────────────────────────────────────────────┐
│ 1. Referrer shares link: danz.now/i/username                │
│ 2. Referee clicks → Web landing page tracks click           │
│ 3. Redirects to app store or opens app                      │
│ 4. Referee signs up → Status: signed_up                     │
│ 5. Referee completes first session → Status: completed      │
│ 6. Referrer receives 20 points automatically                │
└─────────────────────────────────────────────────────────────┘

Database:
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│ referral_codes  │────→│  referrals   │────→│ referral_rewards │
│ (user→username) │     │ (tracking)   │     │ (points)         │
└─────────────────┘     └──────────────┘     └──────────────────┘
         │                     │
         │                     ↓
         │              ┌──────────────────────────┐
         └─────────────→│ referral_click_tracking  │
                        │ (analytics + fraud)      │
                        └──────────────────────────┘
```

---

## 🔒 Fraud Prevention

Multi-layer security system:
- **Device Fingerprinting**: IP, device ID, user agent tracking
- **Rate Limiting**: Max 5 clicks/hour, 3 signups/IP/day
- **Behavioral Analysis**: Time to signup, session patterns
- **Self-Referral Prevention**: Database constraints
- **Duplicate Detection**: One referral per user maximum
- **Automated Flagging**: Real-time fraud alerts

---

## 📱 Mobile Integration

### Components Provided:
- `useReferralDeepLink` - Deep link handler hook
- `ReferralSection` - Profile UI component
- Signup flow integration
- Session completion tracking

### Deep Link Support:
- iOS: Universal Links via `apple-app-site-association`
- Android: App Links via `assetlinks.json`
- Web fallback with smart redirects

---

## 📈 Analytics & Monitoring

### Built-in Views:
- `referral_performance` - Conversion rates, clicks, completions
- `referral_fraud_alerts` - Real-time fraud detection

### Key Metrics:
- Total referrals per user
- Conversion rate (clicks → completions)
- Points distributed
- Fraud detection rate
- Top referrers leaderboard

---

## 🛠️ Technical Stack

**Backend:**
- PostgreSQL/Supabase (database)
- GraphQL/Apollo Server (API)
- TypeScript (type safety)

**Mobile:**
- React Native + Expo (framework)
- Expo Linking (deep links)
- Apollo Client (GraphQL)
- AsyncStorage (local state)

**Web:**
- Static HTML landing pages
- Universal Links configuration
- App Links configuration

---

## ⏱️ Implementation Timeline

- **Database Setup**: 15 minutes
- **Backend GraphQL**: 30 minutes
- **Mobile Deep Linking**: 45 minutes
- **Web Landing Page**: 30 minutes
- **Signup Integration**: 15 minutes
- **Session Tracking**: 15 minutes

**Total**: ~2.5 hours for complete implementation

---

## 📚 Documentation Structure

```
docs/referral-system/
├── README.md (this file)
├── REFERRAL_SYSTEM_PLAN.md (complete spec - 14 sections)
├── migration_001_referral_system.sql (database setup)
├── QUICK_START.md (implementation guide)
└── referral-config.example.ts (configuration)
```

---

## 🔗 Related Resources

- [Expo Deep Linking Docs](https://docs.expo.dev/linking/overview/)
- [iOS Universal Links Guide](https://developer.apple.com/ios/universal-links/)
- [Android App Links Guide](https://developer.android.com/training/app-links)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

---

## 🤝 Support

For questions or issues:
1. Check **QUICK_START.md** common issues section
2. Review main plan for detailed explanations
3. Test using provided SQL queries
4. Verify deep link configuration

---

## 📝 License & Usage

This referral system implementation is designed specifically for the DANZ mobile app.

**Key Highlights:**
- Production-ready code
- Comprehensive fraud prevention
- Mobile-first design
- Scalable architecture
- Type-safe implementation
- Complete documentation

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Status**: Ready for Implementation
