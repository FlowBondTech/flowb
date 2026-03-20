# DANZ Mobile App - Claude Code Instructions

> Last updated: 2025-12-24

## Project Overview
DANZ Mobile App is a React Native Expo application for iOS, Android, and Web platforms. It's the main mobile client for the DANZ social dance platform.

## Tech Stack
- **Framework**: React Native with Expo SDK 53
- **Language**: TypeScript
- **Navigation**: React Navigation v7
- **State Management**: Zustand + React Context
- **API**: Apollo Client (GraphQL)
- **Authentication**: Privy (Web3 auth)
- **Styling**: Custom theming system with responsive design
- **Code Quality**: Biome

## Project Structure
```
danz-app/
├── App.tsx                 # Main entry with navigation setup
├── App.web.tsx            # Web-specific entry point
├── index.ts               # App registry
├── app.config.js          # Expo configuration
├── codegen.ts             # GraphQL codegen config
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Generic UI components
│   │   ├── events/       # Event-specific components
│   │   ├── profile/      # Profile components
│   │   ├── onboarding/   # Onboarding flow components
│   │   └── responsive/   # Responsive design components
│   ├── config/           # App configuration
│   │   ├── apollo.tsx    # Apollo GraphQL client setup
│   │   ├── privy.tsx     # Privy authentication
│   │   └── stripe.tsx    # Stripe payment setup
│   ├── constants/        # App constants
│   ├── contexts/         # React contexts
│   │   ├── AuthContext.tsx       # User authentication
│   │   ├── ThemeContext.tsx      # Theme management
│   │   └── AccessibilityContext.tsx
│   ├── generated/        # GraphQL generated types
│   ├── graphql/          # GraphQL definitions
│   │   ├── fragments/    # Reusable fragments
│   │   ├── mutations/    # Mutation definitions
│   │   └── queries/      # Query definitions
│   ├── hooks/            # Custom React hooks
│   │   └── graphql/      # GraphQL hooks
│   ├── providers/        # React providers
│   ├── screens/          # Screen components (30+ screens)
│   ├── services/         # External services
│   ├── styles/           # Styling system
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── assets/               # Images, fonts, etc.
├── android/             # Android native code
├── ios/                 # iOS native code
└── web/                 # Web-specific files
```

## Key Libraries
### Core
- `expo`: SDK 53 - Core Expo framework
- `react-native`: React Native framework
- `react`: v18.3.1
- `typescript`: Type safety

### Navigation & UI
- `@react-navigation/native`: Main navigation
- `@react-navigation/stack`: Stack navigator
- `@react-navigation/bottom-tabs`: Tab navigator
- `@expo/vector-icons`: Icon library (DO NOT install other icon libraries)
- `expo-linear-gradient`: Gradient effects
- `expo-blur`: Blur effects
- `react-native-toast-message`: Toast notifications

### State & Data
- `@apollo/client`: GraphQL client
- `zustand`: State management
- `@react-native-async-storage/async-storage`: Local storage
- `@supabase/supabase-js`: Database client (being phased out for GraphQL)

### Authentication & Security
- `@privy-io/expo`: Web3 authentication
- `expo-secure-store`: Secure storage
- `expo-crypto`: Cryptographic operations
- `react-native-passkeys`: Passkey authentication

### Media & Device
- `expo-av`: Audio/video playback
- `expo-image-picker`: Image selection
- `expo-camera`: Camera access
- `expo-location`: Geolocation
- `expo-notifications`: Push notifications

### Payments
- `@stripe/stripe-react-native`: Stripe payments

## GraphQL Integration

### Important: GraphQL Workflow
1. **Schema Changes**: When backend GraphQL schema changes, you MUST:
   - Update corresponding `.gql` files in `src/graphql/`
   - Run `npm run codegen` to regenerate types
   - Update any affected components/hooks

2. **File Organization**:
   - Queries: `src/graphql/queries/*.gql`
   - Mutations: `src/graphql/mutations/*.gql`
   - Fragments: `src/graphql/fragments/*.gql`
   - Generated types: `src/generated/graphql.tsx`

3. **Usage Pattern**:
   ```typescript
   // Import generated hooks
   import { useGetEventsQuery, useCreateEventMutation } from '@/generated/graphql'

   // Use in components
   const { data, loading, error } = useGetEventsQuery()
   const [createEvent] = useCreateEventMutation()
   ```

## Development Commands
```bash
# Install dependencies
npm install

# Start development
npm start                # Start Expo
npm run ios             # Run on iOS
npm run android         # Run on Android
npm run web             # Run on web

# GraphQL
npm run codegen         # Generate GraphQL types (REQUIRED after schema changes)

# Code quality
npm run lint            # Run Biome linter
npm run format          # Format code
npm run check           # Check and fix issues

# Build
npm run build:ios       # Build iOS
npm run build:android   # Build Android
```

## Important Conventions

### Import Paths
Always use absolute imports with @ prefix:
```typescript
import { Component } from '@/components/Component'
import { useAuth } from '@/contexts/AuthContext'
import { useGetEventsQuery } from '@/generated/graphql'
```

### Authentication
Always use AuthContext for user data:
```typescript
import { useAuth } from '@/contexts/AuthContext'
const { user, isAuthenticated } = useAuth()
```

### Icons
ONLY use @expo/vector-icons:
```typescript
import { Feather, Ionicons } from '@expo/vector-icons'
// DO NOT install react-native-vector-icons or other icon libraries
```

### Styling
Use the theming system:
```typescript
import { useThemedStyles } from '@/hooks/useThemedStyles'
const { styles, colors, theme } = useThemedStyles()
```

### GraphQL Best Practices
1. Define queries/mutations in `.gql` files
2. Run codegen after any GraphQL changes
3. Use generated hooks, not raw queries
4. Handle loading/error states properly
5. Use fragments for reusable fields

## Platform-Specific Code
```typescript
import { Platform } from 'react-native'

if (Platform.OS === 'ios') {
  // iOS specific code
} else if (Platform.OS === 'android') {
  // Android specific code
} else if (Platform.OS === 'web') {
  // Web specific code
}
```

## Git Push Rules
**IMPORTANT**: Always push to BOTH remotes to keep repos in sync:
```bash
git push origin main && git push cryptokoh main
```
- `origin` → FlowBondTech/danz-app
- `cryptokoh` → cryptokoh/danz-app

## Core Features

### FlowBond System (Social Bonding)
The FlowBond system enables users to form social connections through dance:

- **Bond Requests**: Two-way acceptance system where both parties must agree
  - `BondRequestsScreen.tsx` - View and manage pending requests
  - `UserDiscoveryScreen.tsx` - Discover and send bond requests
  - GraphQL: `bondRequests.gql` (queries/mutations)

- **Similarity Matching**: Users are matched based on:
  - Mutual bonds (shared connections)
  - Same events attended
  - Music preferences overlap
  - Dance style compatibility
  - Geographic proximity

- **Privacy Controls**: Users control who can send them bond requests
  - Everyone, Mutual Events Only, or No One

### Key Screens
- `HomeScreen` - Main dashboard with dance stats
- `EventsScreen` - Event discovery and registration
- `FeedScreen` - Social feed with posts from bonds
- `UserScreen` - User profile and settings
- `DanceScreen` / `FreestyleSessionScreen` - Dance tracking
- `BondRequestsScreen` - Manage bond requests
- `UserDiscoveryScreen` - Find and connect with dancers
- `PrivacySettingsScreen` - Privacy and visibility settings
- `ReferralScreen` - Referral program and rewards

## DO NOT
- Install new icon libraries (use @expo/vector-icons)
- Use fetch/axios directly (use GraphQL)
- Access user from AppContext (use AuthContext)
- Hardcode strings (use constants files)
- Create files over 200 lines
- Leave unused imports/variables
- Use console.log in production code
- Push to only one remote (always push to both origin AND cryptokoh)