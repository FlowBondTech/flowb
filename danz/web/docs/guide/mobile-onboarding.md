# Mobile App Developer Onboarding

Complete guide for getting access to the DANZ mobile apps, setting up your development environment, and deploying to TestFlight and Google Play.

## Overview

The DANZ platform has multiple mobile applications:

| App | Repo | Description |
|-----|------|-------------|
| **danz-app** | FlowBondTech/danz-app | Main React Native (Expo) app for iOS/Android |
| **danz-miniapp** | FlowBondTech/danz-miniapp | Telegram miniapp (Web-based) |
| **danz-backend** | FlowBondTech/danz-backend | GraphQL API server |
| **danz-web** | FlowBondTech/danz-web | Marketing site + docs |

---

## Part 1: Getting Repository Access

### Step 1: Request GitHub Access

1. **Create a GitHub account** (if you don't have one)
   - Go to [github.com](https://github.com)
   - Use your work email for the account

2. **Request access to FlowBondTech organization**
   - Contact the project lead with your GitHub username
   - You'll receive an invitation email
   - Accept the invitation to join the organization

3. **Verify access**
   ```bash
   # After accepting invitation, verify you can see the repos
   gh repo list FlowBondTech --limit 10
   ```

### Step 2: Configure Git

```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# (Recommended) Set up SSH keys
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add the public key to GitHub: Settings → SSH Keys → New SSH key
```

### Step 3: Clone the Repositories

```bash
# Create a DANZ workspace
mkdir -p ~/Documents/DANZ
cd ~/Documents/DANZ

# Clone all repos (SSH - recommended)
git clone git@github.com:FlowBondTech/danz-app.git
git clone git@github.com:FlowBondTech/danz-backend.git
git clone git@github.com:FlowBondTech/danz-web.git
git clone git@github.com:FlowBondTech/danz-miniapp.git

# Or clone with HTTPS
git clone https://github.com/FlowBondTech/danz-app.git
git clone https://github.com/FlowBondTech/danz-backend.git
git clone https://github.com/FlowBondTech/danz-web.git
git clone https://github.com/FlowBondTech/danz-miniapp.git
```

### Step 4: Set Up Dual Remotes

We maintain mirror repos for redundancy. Set up both remotes:

```bash
cd danz-app

# Add second remote (replace YOUR_GITHUB_USERNAME)
git remote add cryptokoh git@github.com:cryptokoh/danz-app.git

# Verify remotes
git remote -v
# Should show:
# origin     git@github.com:FlowBondTech/danz-app.git (fetch)
# origin     git@github.com:FlowBondTech/danz-app.git (push)
# cryptokoh  git@github.com:cryptokoh/danz-app.git (fetch)
# cryptokoh  git@github.com:cryptokoh/danz-app.git (push)
```

::: warning Always Push to Both Remotes
After any code changes:
```bash
git push origin main && git push cryptokoh main
```
:::

---

## Part 2: Development Environment Setup

### Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | v20+ | [nvm](https://github.com/nvm-sh/nvm) (recommended) |
| npm | v10+ | Comes with Node.js |
| Git | Latest | `apt install git` / `brew install git` |
| EAS CLI | Latest | `npm install -g eas-cli` |
| Expo CLI | Latest | `npm install -g expo-cli` (optional) |

### Step 1: Install Node.js (via nvm)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal, then:
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

### Step 2: Install Global Tools

```bash
# EAS CLI (required for building)
npm install -g eas-cli

# Expo CLI (optional, for local development)
npm install -g expo-cli

# Verify
eas --version
```

### Step 3: Login to Expo/EAS

```bash
# Login to your Expo account
eas login

# Verify login
eas whoami
```

::: info Expo Account
You need an Expo account to use EAS Build. Create one at [expo.dev](https://expo.dev) if you don't have one.
:::

### Step 4: Install Project Dependencies

```bash
cd ~/Documents/DANZ/danz-app

# Install dependencies
npm install

# If you encounter peer dependency issues:
npm install --legacy-peer-deps
```

### Step 5: Set Up Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

**Required environment variables:**
```bash
# .env
EXPO_PUBLIC_API_URL=https://danz-backend.fly.dev/graphql
EXPO_PUBLIC_PRIVY_APP_ID=your_privy_app_id
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

::: warning Sensitive Keys
Never commit `.env` files. Get the actual values from the project lead or team password manager.
:::

---

## Part 3: Running Locally

### Option 1: Expo Go (Quick Testing)

```bash
cd danz-app

# Start development server
npm start

# Scan QR code with:
# - iOS: Camera app
# - Android: Expo Go app
```

### Option 2: iOS Simulator (macOS only)

```bash
# Start with iOS simulator
npm run ios

# Or specify device
npx expo start --ios --device "iPhone 15 Pro"
```

### Option 3: Android Emulator

```bash
# Start Android emulator first (from Android Studio)
# Then:
npm run android
```

### Option 4: Development Build (Recommended)

For testing native features not in Expo Go:

```bash
# Build development client for iOS simulator
eas build --profile development --platform ios

# Build for Android
eas build --profile development --platform android

# After build completes, run:
npm start
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` again |
| Metro bundler stuck | `npx expo start --clear` |
| iOS build fails | Check Xcode is installed and updated |
| Android SDK not found | Set `ANDROID_HOME` environment variable |

---

## Part 4: Project Structure

```
danz-app/
├── App.tsx                 # Main entry point
├── app.config.js           # Expo configuration
├── eas.json                # EAS build profiles
├── package.json            # Dependencies
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Generic components
│   │   ├── events/        # Event-related
│   │   └── profile/       # Profile-related
│   ├── screens/           # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── ...
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── graphql/           # GraphQL definitions
│   │   ├── queries/       # .gql query files
│   │   ├── mutations/     # .gql mutation files
│   │   └── fragments/     # .gql fragments
│   ├── generated/         # Auto-generated GraphQL types
│   ├── hooks/             # Custom React hooks
│   ├── config/            # App configuration
│   ├── constants/         # Constants and enums
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── assets/                # Images, fonts, etc.
├── ios/                   # iOS native code
└── android/               # Android native code
```

### Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Navigation setup, providers |
| `app.config.js` | Expo config (app name, icons, permissions) |
| `eas.json` | Build profiles for EAS |
| `src/config/apollo.tsx` | GraphQL client setup |
| `src/contexts/AuthContext.tsx` | Authentication state |

---

## Part 5: Building for TestFlight (iOS)

### Prerequisites

- Apple Developer account ($99/year)
- App created in App Store Connect
- EAS CLI logged in

### Current DANZ iOS Configuration

```json
// eas.json
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

### Step 1: Build the IPA

```bash
cd danz-app

# Production build for TestFlight
eas build --platform ios --profile production

# This will:
# 1. Bundle JavaScript
# 2. Build native iOS app
# 3. Sign with distribution certificate
# 4. Upload to EAS servers
# 5. Return download link for .ipa
```

**Build takes 15-20 minutes.** You'll get a link when complete.

### Step 2: Submit to TestFlight

#### Option A: Automatic Submit (Recommended)

```bash
# Submit the latest build
eas submit --platform ios

# Or build and submit in one command
eas build --platform ios --auto-submit
```

#### Option B: Manual Submit with Transporter (macOS)

1. Download the `.ipa` from EAS dashboard
2. Open **Transporter** app (free from Mac App Store)
3. Sign in with Apple ID
4. Drag `.ipa` into Transporter
5. Click "Deliver"

#### Option C: Submit Specific IPA

```bash
# Submit a specific IPA file
eas submit -p ios --path ./path/to/app.ipa

# With API key authentication
eas submit -p ios \
  --path ./app.ipa \
  --api-key-path ./AuthKey_XXXXX.p8 \
  --api-key-id XXXXX \
  --api-key-issuer-id YOUR_ISSUER_ID
```

### Step 3: Configure TestFlight

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app → **TestFlight** tab
3. Wait for processing (5-30 minutes)
4. Complete "Export Compliance" if prompted
5. Add test notes

### Step 4: Add Testers

**Internal Testers** (Team members)
```
TestFlight → Internal Testing → Add testers
→ Select from Apple Developer team members
→ No review required
→ Instant access
```

**External Testers** (Public beta)
```
TestFlight → External Testing → Create Group
→ Add testers by email (up to 10,000)
→ Submit for Beta App Review (1-2 days)
→ Testers get invite email
```

### Step 5: Distribute

Testers receive an email with TestFlight link. They:
1. Install TestFlight app from App Store
2. Open invitation link
3. Install your app from TestFlight

---

## Part 6: Building for Google Play (Android)

### Prerequisites

- Google Play Developer account ($25 one-time)
- App created in Play Console
- EAS CLI logged in

### Step 1: Build the AAB

```bash
cd danz-app

# Production build for Play Store (AAB format)
eas build --platform android --profile production

# For testing: Build APK instead
eas build --platform android --profile preview-apk
```

### Step 2: Submit to Play Store

#### Option A: Automatic Submit

```bash
# First time: Set up service account
eas credentials --platform android

# Submit latest build
eas submit --platform android

# Or build and submit together
eas build --platform android --auto-submit
```

#### Option B: Manual Upload

1. Download `.aab` from EAS dashboard
2. Go to [Play Console](https://play.google.com/console)
3. Select app → Release → Internal testing
4. Create new release → Upload AAB
5. Add release notes → Review → Start rollout

### Step 3: Testing Tracks

| Track | Audience | Review Required |
|-------|----------|-----------------|
| Internal | 100 email-invited testers | No |
| Closed | Invite-only groups | No |
| Open | Public opt-in | Light review |
| Production | Everyone | Full review |

### Step 4: Promote Releases

```
Internal Testing → Closed Testing → Open Testing → Production
```

Promote through tracks as testing progresses.

---

## Part 7: Quick Reference

### Daily Development

```bash
# Start development
cd danz-app
npm start

# After GraphQL schema changes
npm run codegen

# Push changes (always both remotes!)
git add .
git commit -m "feat: your changes"
git push origin main && git push cryptokoh main
```

### Build Commands

```bash
# ===== DEVELOPMENT =====
npm start                                    # Expo Go
eas build --profile development --platform ios    # Dev build iOS
eas build --profile development --platform android # Dev build Android

# ===== TESTING =====
eas build --profile preview --platform ios        # TestFlight preview
eas build --profile preview-apk --platform android # APK for testing

# ===== PRODUCTION =====
eas build --platform ios --auto-submit            # Build + TestFlight
eas build --platform android --auto-submit        # Build + Play Store
eas build --platform all --auto-submit            # Both platforms
```

### Useful EAS Commands

```bash
eas whoami                  # Check logged-in account
eas build:list              # List recent builds
eas build:view BUILD_ID     # View build details
eas credentials             # Manage signing credentials
eas device:create           # Register iOS device for dev builds
eas secret:list             # View environment secrets
eas secret:create           # Add new secret
```

### Version Management

```javascript
// app.config.js
module.exports = {
  version: '1.0.1',           // User-facing version
  ios: {
    buildNumber: '2',         // Increment for each TestFlight build
  },
  android: {
    versionCode: 2,           // Increment for each Play Store build
  },
}
```

Or use auto-increment:
```json
// eas.json
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  }
}
```

---

## Part 8: Troubleshooting

### Build Failures

| Error | Solution |
|-------|----------|
| "Signing failed" | Run `eas credentials` to fix certificates |
| "Bundle ID mismatch" | Check `app.config.js` matches App Store Connect |
| "Provisioning profile" | EAS usually auto-fixes, or run `eas credentials` |
| "Build timeout" | Check EAS status page, retry later |

### Submission Failures

| Error | Solution |
|-------|----------|
| "Invalid IPA" | Ensure built with production profile |
| "Missing compliance" | Add export compliance in App Store Connect |
| "API key invalid" | Regenerate key in App Store Connect → Users → Keys |
| "Issuer ID missing" | Find in App Store Connect → Users → Keys (top of page) |

### Getting Help

- **EAS Documentation**: [docs.expo.dev](https://docs.expo.dev)
- **Expo Discord**: [chat.expo.dev](https://chat.expo.dev)
- **App Store Connect Help**: [developer.apple.com/help](https://developer.apple.com/help/app-store-connect/)
- **Play Console Help**: [support.google.com/googleplay](https://support.google.com/googleplay/android-developer/)

---

## Appendix: Credentials Reference

### iOS (App Store Connect)

| Item | Value |
|------|-------|
| Apple ID | devenrathodrd@gmail.com |
| Team ID | BH2A3MJ4CK |
| App ID | 6751524027 |
| Bundle ID | now.danz |
| API Key ID | 46CZNG247B |

### Android (Play Console)

| Item | Value |
|------|-------|
| Package Name | now.danz |
| Signing Key | Managed by EAS |

### Expo

| Item | Value |
|------|-------|
| Project Slug | flowbond-app |
| Owner | kohx |

::: danger Keep Credentials Secure
- Never commit API keys or certificates
- Use EAS secrets for sensitive values
- Rotate keys if compromised
:::
