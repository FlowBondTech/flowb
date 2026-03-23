# DANZ Mobile App

Move. Connect. Earn. - The first move-to-earn platform that rewards you for dancing.

## Features

- 💃 **Waitlist & Early Access**: Join the movement and get exclusive founder benefits
- 🔔 **Push Notifications**: Stay updated on rewards, challenges, and events
- 💳 **Dual Payment System**: Pay with credit card (Stripe) or cryptocurrency (NOWPayments)
- 💎 **Subscription Tiers**: Monthly, Yearly, and Lifetime Founder options
- 🎨 **Beautiful UI**: Neon aesthetic with purple/pink gradients

## Tech Stack

- **Framework**: React Native with Expo SDK
- **Language**: TypeScript
- **Navigation**: React Navigation
- **State Management**: Zustand
- **API Calls**: TanStack Query (React Query)
- **GraphQL**: Apollo Client v3 (kept at v3 for @graphql-codegen/typescript-react-apollo compatibility to generate type-safe hooks)
- **Payments**: Stripe & NOWPayments.io
- **Styling**: Custom theme system with neon aesthetics

### Important: Apollo Client Version
We are intentionally keeping Apollo Client at v3 to maintain compatibility with `@graphql-codegen/typescript-react-apollo` which generates type-safe React hooks from our GraphQL schema. Apollo Client v4 has breaking changes that are not yet fully supported by the codegen tool.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app on your physical device (optional)

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npx expo start --clear

# Or use the start script
./start.sh

# Run on specific platform (after Expo starts):
# Press 'i' for iOS simulator (Mac only)
# Press 'a' for Android emulator
# Press 'w' for Web browser
# Or scan QR code with Expo Go app on your phone
```

### Environment Setup

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_API_URL=https://api.danz.app
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_KEY
EXPO_PUBLIC_NOWPAYMENTS_API_KEY=YOUR_NOWPAYMENTS_KEY
```

## Project Structure

```
danz-mobile/
├── src/
│   ├── components/        # Reusable components
│   │   └── LoadingScreen.tsx  # $DANZ spinner loading
│   ├── screens/           # App screens
│   │   ├── WaitlistScreen.tsx
│   │   ├── NotificationPermissionScreen.tsx
│   │   └── SubscriptionScreen.tsx
│   ├── services/          # API services
│   │   └── payment.ts     # Payment integrations
│   ├── styles/            # Theme and styling
│   │   └── theme.ts       # Color palette and design tokens
│   └── types/             # TypeScript definitions
├── App.tsx               # Main app entry point
└── app.json             # Expo configuration
```

## App Flow

1. **Loading Screen**: Shows $DANZ spinner logo with animations
2. **Waitlist Screen**: Collects user name and email for early access
3. **Notification Permission**: Requests push notification permissions
4. **Subscription Screen**: Offers three tiers with card/crypto payment options

## Payment Integration

### Stripe (Credit/Debit Cards) - Coming Soon!
- Will be integrated in the next update
- Will support all major card networks
- PCI compliant payment flow

### NOWPayments (Cryptocurrency)
- Supports 100+ cryptocurrencies
- BTC, ETH, USDT, and more
- Real-time exchange rates


## Building for Production

### Prerequisites
- **iOS**: Apple Developer Account ($99/year)
- **Android**: Google Play Developer Account ($25 one-time)
- EAS CLI installed (`npm install -g eas-cli`)
- Configured `eas.json` file

### iOS Build & Submission

```bash
# Install EAS CLI (if not already installed)
npm install -g eas-cli

# Configure your project (first time only)
eas build:configure

# Build for different environments
eas build --platform ios --profile development    # Development build
eas build --platform ios --profile preview       # TestFlight/Preview build
eas build --platform ios --profile production    # Production App Store build

# Build with cache cleared (useful for resolving build issues)
eas build --platform ios --clear-cache

# Build and auto-submit to App Store in one command
eas build --platform ios --profile production --auto-submit
```

#### Submitting to App Store

```bash
# Submit the latest build to App Store Connect
eas submit --platform ios --latest

# Submit a specific build by ID
eas submit --platform ios --id=<build-id>

# Submit with a specific Apple ID
eas submit --platform ios --apple-id=your@email.com
```

#### Complete iOS Workflow

```bash
# 1. Update version in app.json
# 2. Build for production
eas build --platform ios --profile production

# 3. Submit to App Store Connect
eas submit --platform ios --latest

# Or do both in one command
eas build --platform ios --profile production --auto-submit
```

### Android Build & Submission

#### EAS Cloud Build
```bash
# Build for different environments
eas build --platform android --profile development    # Development APK
eas build --platform android --profile preview       # Internal testing
eas build --platform android --profile production    # Production AAB for Play Store

# Build with cache cleared
eas build --platform android --clear-cache

# Submit to Google Play Store
eas submit --platform android --latest
```

#### Local APK Build
Build Android APK locally without using EAS cloud services:

```bash
# Prerequisites: Android Studio, Java 17+, Android SDK installed

# First time setup - generate Android project
npm run prebuild:android

# Build Debug APK (for testing)
npm run build:android:apk:debug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Build Release APK (optimized)
npm run build:android:apk
# Output: android/app/build/outputs/apk/release/app-release.apk

# Build AAB for Play Store
npm run build:android:bundle
# Output: android/app/build/outputs/bundle/release/app-release.aab

# Clean build artifacts
npm run build:android:clean

# Install APK on connected device
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Note:** For release builds, you'll need to configure signing keys in `android/app/keystore.properties`

## Testing

### Running on iOS

```bash
# Start the iOS simulator properly
npm run simulator:start

# Run the app on iOS
npm run ios

# If you encounter cached device ID issues, clean and restart
npm run simulator:clean
npm run ios:clean

# Stop the simulator properly (instead of Cmd+Q)
npm run simulator:stop
```

#### iOS Simulator Commands
- `npm run simulator:start` - Starts the iOS simulator
- `npm run simulator:stop` - Properly shuts down the simulator (prevents cached device ID issues)
- `npm run simulator:clean` - Cleans simulator cache and derived data
- `npm run ios:clean` - Runs Expo with cleared Metro bundler cache

**Note:** Always use `npm run simulator:stop` instead of quitting the Simulator app with Cmd+Q to avoid device ID caching issues.

### Running on Android

```bash
# Run on Android Emulator
npm run android

# Run on physical device
# 1. Install Expo Go app
# 2. Scan QR code from terminal
```

## Deployment

1. Update version in `app.json`
2. Build production version with EAS
3. Submit to App Store / Google Play
4. Monitor with Expo Updates

## Color Palette

- **Primary**: `#ff6ec7` (Neon Pink)
- **Secondary**: `#b967ff` (Neon Purple)
- **Background**: `#1a1a2e` (Dark)
- **Surface**: `#16213e` (Card Background)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

Copyright © 2024 DANZ. All rights reserved.