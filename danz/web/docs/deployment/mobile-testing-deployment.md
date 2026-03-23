# Mobile Testing & Deployment Guide

Complete guide for testing DANZ with Expo Go and deploying to TestFlight (iOS) and Google Play (Android).

## Quick Reference

| Environment | Command | Platform | Time |
|-------------|---------|----------|------|
| Expo Go | `npm start` | iOS/Android | Instant |
| Development Build | `eas build --profile development` | iOS/Android | 10-15 min |
| TestFlight | `eas build --platform ios` + `eas submit` | iOS | 15-20 min |
| APK (Internal) | `eas build --profile preview-apk` | Android | 10-15 min |
| Play Store | `eas build --platform android` + `eas submit` | Android | 15-20 min |

---

## Part 1: Testing with Expo Go

### What is Expo Go?

Expo Go is a free app that lets you run your Expo project instantly on a real device without building a native app. Perfect for rapid development and testing.

### Limitations

::: warning Expo Go Limitations
- **No native modules** that aren't in Expo SDK
- **No custom native code** (use development builds instead)
- **SDK version locked** to Expo Go's bundled SDK
- For DANZ: Features like `expo-video`, `expo-secure-store` work, but any custom native code won't
:::

### Setup

#### 1. Install Expo Go on Your Device

| Platform | Link |
|----------|------|
| iOS | [App Store](https://apps.apple.com/app/expo-go/id982107779) |
| Android | [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) |

#### 2. Start Development Server

```bash
cd flowbondtech-danz-app

# Start the dev server
npm start

# Or with tunnel for external devices
npx expo start --tunnel
```

#### 3. Connect Your Device

**Same Network (Recommended)**
```
1. Ensure phone and computer on same WiFi
2. Scan QR code with:
   - iOS: Camera app → tap notification
   - Android: Expo Go app → Scan QR Code
```

**Different Network (Tunnel)**
```bash
# Install ngrok globally (one time)
npm install -g @expo/ngrok

# Start with tunnel
npx expo start --tunnel
```

### Testing Workflow

```bash
# Development mode (hot reload enabled)
npm start

# Clear cache if issues
npx expo start --clear

# Specific platform
npx expo start --ios
npx expo start --android
```

### Common Expo Go Issues

| Issue | Solution |
|-------|----------|
| "Network request failed" | Use `--tunnel` or check same WiFi |
| "SDK version mismatch" | Update Expo Go app |
| QR code won't scan | Use manual URL entry in Expo Go |
| Slow reload | Use LAN instead of tunnel |
| Module not found | Run `npm install` then restart |

### Debug Tools

```bash
# Open React DevTools
Press 'j' in terminal

# Open debugger
Press 'm' → "Open JS Debugger"

# Reload app
Press 'r' in terminal
# Or shake device → "Reload"
```

---

## Part 2: Development Builds (Recommended)

Development builds are custom native apps with the Expo development client. Required for testing native modules not in Expo Go.

### When to Use Development Builds

- Testing native modules (`expo-video`, custom plugins)
- Testing push notifications
- Testing in-app purchases
- Performance testing
- Testing platform-specific features

### Create Development Build

#### iOS Simulator

```bash
# Build for iOS simulator
eas build --profile development --platform ios

# After build completes, it auto-installs on simulator
# Or download and drag .app to simulator
```

#### iOS Device

```bash
# Register device first (one time per device)
eas device:create

# Build for device
eas build --profile development --platform ios
```

#### Android

```bash
# Build APK for any Android device
eas build --profile development --platform android

# Download APK and install via:
# - ADB: adb install path/to/app.apk
# - Or transfer to device and open
```

### Using Development Build

```bash
# Start dev server
npm start

# Dev build connects automatically to local server
# Or scan QR with device camera
```

---

## Part 3: TestFlight Deployment (iOS)

### Prerequisites

| Requirement | How to Get |
|-------------|------------|
| Apple Developer Account | [developer.apple.com](https://developer.apple.com) ($99/year) |
| App Store Connect App | Create in [App Store Connect](https://appstoreconnect.apple.com) |
| EAS CLI | `npm install -g eas-cli` |
| Logged in | `eas login` |

### Current DANZ Configuration

```json
// eas.json - already configured
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "devenrathodrd@gmail.com",
        "ascAppId": "6751524027",
        "appleTeamId": "BH2A3MJ4CK"
      }
    }
  }
}
```

### Step 1: Build for iOS

```bash
cd flowbondtech-danz-app

# Production build for TestFlight/App Store
eas build --platform ios --profile production

# Or preview build (internal testing)
eas build --platform ios --profile preview
```

**Build Output:**
```
✔ Build finished
📱 Install: https://expo.dev/accounts/kohx/projects/flowbond-app/builds/xxx

Download IPA or submit directly to App Store Connect
```

### Step 2: Submit to TestFlight

#### Option A: Automatic Submit (Recommended)

```bash
# Submit latest build
eas submit --platform ios

# Or submit specific build
eas submit --platform ios --id BUILD_ID

# Or build and submit in one command
eas build --platform ios --auto-submit
```

#### Option B: Manual Submit (Transporter)

1. Download `.ipa` from EAS dashboard
2. Open **Transporter** app (Mac App Store)
3. Drag `.ipa` to Transporter
4. Click "Deliver"

### Step 3: Configure TestFlight

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app → **TestFlight** tab
3. Wait for processing (5-30 minutes)
4. Add compliance info if prompted

### Step 4: Add Testers

**Internal Testing** (up to 100 Apple Developer team members)
```
TestFlight → Internal Testing → Add testers
No review required - instant access
```

**External Testing** (up to 10,000 public testers)
```
TestFlight → External Testing → Create group
→ Add testers by email
→ Submit for Beta App Review (1-2 days)
```

### Step 5: Distribute

```bash
# Testers receive email invitation
# Or share public link (external groups)
```

### TestFlight Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing compliance" | Add export compliance in App Store Connect |
| Build stuck processing | Wait up to 30 min, or re-submit |
| "Invalid bundle" | Check bundle ID matches App Store Connect |
| Signing failed | Run `eas credentials` to fix |

---

## Part 4: Android APK Build

### Build APK for Testing

```bash
# Preview APK (internal testing)
eas build --profile preview-apk --platform android

# Or production APK
eas build --platform android --profile production
```

### Download & Install APK

```bash
# Download from EAS dashboard link
# Or use ADB
adb install path/to/danz.apk

# Install on device directly
# 1. Transfer APK to device
# 2. Open file manager
# 3. Tap APK → Install
# (Enable "Install unknown apps" in settings if needed)
```

### Local APK Build (No EAS)

```bash
# Generate native project
npx expo prebuild --platform android

# Build debug APK
cd android && ./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Build release APK
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

---

## Part 5: Google Play Store Deployment

### Prerequisites

| Requirement | How to Get |
|-------------|------------|
| Google Play Developer Account | [play.google.com/console](https://play.google.com/console) ($25 one-time) |
| App created in Play Console | Create new app in console |
| Signing key | EAS manages automatically |
| EAS CLI | `npm install -g eas-cli` |

### Step 1: Build Android App Bundle

```bash
# AAB format required for Play Store
eas build --platform android --profile production

# This creates .aab file (not .apk)
```

### Step 2: Configure Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create app or select existing
3. Complete store listing:
   - App name, description
   - Screenshots (phone, tablet, TV)
   - Feature graphic (1024x500)
   - App icon (512x512)

### Step 3: Submit to Play Store

#### Option A: Automatic Submit

```bash
# First time: Link Google service account
eas credentials --platform android

# Submit to internal testing
eas submit --platform android

# Or build and submit
eas build --platform android --auto-submit
```

#### Option B: Manual Upload

1. Download `.aab` from EAS dashboard
2. Play Console → Release → Internal testing
3. Create new release → Upload AAB
4. Complete release notes
5. Review and rollout

### Step 4: Testing Tracks

| Track | Audience | Review |
|-------|----------|--------|
| Internal | Up to 100 testers by email | No review |
| Closed | Invite-only groups | No review |
| Open | Public opt-in link | Light review |
| Production | Everyone | Full review |

### Promote Through Tracks

```
Internal Testing
      ↓
Closed Testing (optional)
      ↓
Open Testing (optional)
      ↓
Production Release
```

### Google Play Troubleshooting

| Issue | Solution |
|-------|----------|
| "Deobfuscation file" warning | Optional - ignore or upload mapping.txt |
| "Target API level" | Update `targetSdkVersion` in app.json |
| Signing key mismatch | Use same key or request reset (loses updates) |
| AAB too large | Enable proguard, remove unused assets |

---

## Part 6: Complete Deployment Workflow

### Development → Production Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                               │
├─────────────────────────────────────────────────────────────┤
│  Expo Go (instant)  →  Dev Build (native features)          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTERNAL TESTING                          │
├─────────────────────────────────────────────────────────────┤
│  iOS: TestFlight Internal  │  Android: Internal Testing     │
│  (100 team members)        │  (100 testers)                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    BETA TESTING                              │
├─────────────────────────────────────────────────────────────┤
│  iOS: TestFlight External  │  Android: Closed/Open Testing  │
│  (10,000 testers)          │  (unlimited testers)           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION                                │
├─────────────────────────────────────────────────────────────┤
│  iOS: App Store            │  Android: Play Store           │
│  Review: 1-3 days          │  Review: 1-3 days              │
└─────────────────────────────────────────────────────────────┘
```

### Quick Command Reference

```bash
# ===== TESTING =====

# Expo Go
npm start

# Development build (iOS)
eas build --profile development --platform ios

# Development build (Android)
eas build --profile development --platform android


# ===== INTERNAL RELEASE =====

# TestFlight (iOS)
eas build --platform ios && eas submit --platform ios

# Internal APK (Android)
eas build --profile preview-apk --platform android


# ===== PRODUCTION RELEASE =====

# App Store + Play Store
eas build --platform all --auto-submit

# iOS only
eas build --platform ios --profile production --auto-submit

# Android only
eas build --platform android --profile production --auto-submit
```

---

## Part 7: Environment Variables

### Configure for Different Environments

```bash
# .env.development
EXPO_PUBLIC_API_URL=https://dev-api.danz.now
EXPO_PUBLIC_PRIVY_APP_ID=dev_xxx

# .env.production
EXPO_PUBLIC_API_URL=https://api.danz.now
EXPO_PUBLIC_PRIVY_APP_ID=prod_xxx
```

### EAS Environment Variables

```bash
# Set secrets in EAS
eas secret:create --name PRIVY_APP_ID --value "xxx"
eas secret:create --name API_KEY --value "xxx"

# View secrets
eas secret:list
```

---

## Part 8: Version Management

### Increment Version

```javascript
// app.config.js
module.exports = {
  version: '1.0.1',           // User-facing version
  ios: {
    buildNumber: '2',         // iOS build number
  },
  android: {
    versionCode: 2,           // Android version code
  },
}
```

### Automatic Increment

```json
// eas.json
{
  "build": {
    "production": {
      "autoIncrement": true   // Auto-increment on each build
    }
  }
}
```

---

## Appendix: DANZ-Specific Configuration

### Current EAS Profiles

| Profile | Platform | Purpose | Output |
|---------|----------|---------|--------|
| `development` | iOS/Android | Dev testing with simulator | .app / .apk |
| `preview` | iOS/Android | Internal distribution | .ipa / .apk |
| `preview-apk` | Android | Quick APK testing | .apk |
| `production` | iOS/Android | Store release | .ipa / .aab |
| `development-simulator` | iOS | Simulator only | .app |

### Bundle Identifiers

```
iOS:     now.danz
Android: now.danz
```

### Required Permissions

```javascript
// app.config.js - already configured
ios: {
  infoPlist: {
    NSCameraUsageDescription: 'DANZ needs camera access to record your dance videos',
    NSMotionUsageDescription: 'DANZ needs motion access to track your dance movements',
    NSLocationWhenInUseUsageDescription: 'DANZ needs location to find events near you',
  },
},
android: {
  permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'VIBRATE'],
}
```

### Push to Both Remotes

```bash
# After any code changes
git add .
git commit -m "feat: your changes"
git push origin main && git push cryptokoh main
```
