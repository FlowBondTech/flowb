# FlowB VIP - Build Guide

## Prerequisites
- EAS CLI: `npm install -g eas-cli` (already installed)
- Expo account: logged in as `kohx`
- Apple Developer account: `kohx.biz@gmail.com`, Team ID: `BH2A3MJ4CK`

## First-Time Setup (run once)

### 1. Initialize EAS Project
```bash
cd flowb-vip
eas init  # Creates project on Expo servers, fills in projectId
```
This updates `app.config.ts` extra.eas.projectId and `eas.json`.

### 2. Register Bundle ID with Apple
The bundle ID `me.flowb.alert` needs to be registered in Apple Developer Portal.
EAS will do this automatically on first build, or manually:
- Go to developer.apple.com > Certificates, Identifiers & Profiles > Identifiers
- Register `me.flowb.alert`
- Enable: Push Notifications, Time Sensitive Notifications

### 3. Create App Store Connect Entry
- Go to appstoreconnect.apple.com
- Create new app with bundle ID `me.flowb.alert`
- Note the ASC App ID and update `eas.json` submit.production.ios.ascAppId

## Build Commands (all work from Linux!)

### Development Build (TestFlight internal testing)
```bash
cd flowb-vip
eas build --platform ios --profile development
```

### Preview Build (internal distribution via link)
```bash
eas build --platform ios --profile preview
```

### Production Build (App Store)
```bash
eas build --platform ios --profile production
```

### Submit to App Store
```bash
eas submit --platform ios --profile production
```

## After Build
- Development: Install via Expo Go or dev client
- Preview: Install via QR code / direct link (requires Apple UDID registered)
- Production: Submitted to App Store Connect for TestFlight / release

## macOS App (requires Mac with Xcode)
The macOS SwiftUI app at `flowb-vip-macos/` must be built on a Mac:
```bash
cd flowb-vip-macos
swift build
# Or open in Xcode and build from there
```

For distribution:
1. Open in Xcode
2. Product > Archive
3. Distribute App > Developer ID (direct) or Mac App Store
4. Export .dmg or .pkg

## Environment Variables
- `EXPO_PUBLIC_API_URL` - FlowB API (default: https://flowb.fly.dev)
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase (default: https://eoajujwpdkfuicnoxetk.supabase.co)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (hardcoded default)

## EAS Project ID
Project ID `ad9a75a4-13fc-4b39-b7a5-6d1cd72085f0` is set in `app.config.ts` and `usePushNotifications.ts`.
