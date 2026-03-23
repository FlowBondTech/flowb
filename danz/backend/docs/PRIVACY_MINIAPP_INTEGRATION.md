# Privacy & User Discovery - Mini-App Integration Plan

## Overview

This document outlines the integration plan for the Privacy Settings and User Discovery features into the DANZ Telegram Mini-App ecosystem.

## Current Implementation Status

### Backend (Completed)
- [x] Database schema (Migration 046)
  - `user_privacy_settings` table with 25+ privacy controls
  - `user_suggestions` table for pre-computed suggestions
  - `user_search_history` table for search analytics
- [x] GraphQL Schema (`privacy.schema.ts`)
  - Privacy settings types and enums
  - User suggestion and search result types
  - Privacy presets (open, social, selective, private, ghost)
- [x] Resolvers (`privacy.resolvers.ts`)
  - Full CRUD for privacy settings
  - Privacy-aware user search and discovery
  - Suggestion algorithm with multiple sources

### Mobile App (Completed)
- [x] GraphQL operations (`privacy.gql`)
- [x] Privacy Settings Screen
- [x] User Discovery Screen

## Mini-App Integration Strategy

### Phase 1: Privacy Settings Widget (Week 1)

#### 1.1 Quick Privacy Toggle Component
```tsx
// components/PrivacyQuickToggle.tsx
// Simplified privacy control for mini-app header/profile
- Ghost Mode toggle (one-tap privacy)
- Current visibility indicator
- Link to full settings
```

#### 1.2 Privacy Settings Page
```
/miniapps/privacy (new route)
- Mirror mobile app privacy presets
- Collapsible sections for detailed settings
- Telegram-native styling
```

### Phase 2: User Discovery Integration (Week 2)

#### 2.1 Discover Tab in Mini-App
```
/miniapps/discover (new route)
- Suggested users carousel/list
- Search functionality
- Bond request integration
```

#### 2.2 Profile Privacy Indicators
- Show privacy status on user profiles
- "Can message" / "Can view profile" badges
- Mutual bonds indicator

### Phase 3: Telegram-Specific Features (Week 3)

#### 3.1 Telegram Sharing Integration
```typescript
// Share profile with privacy context
const shareProfile = () => {
  const tg = window.Telegram?.WebApp
  tg.openTelegramLink(`https://t.me/share/url?url=...&text=Check out ${username} on DANZ!`)
}
```

#### 3.2 Telegram Contact Integration
- Import Telegram contacts (with permission)
- Match with existing DANZ users
- Privacy-aware friend suggestions

#### 3.3 Mini-App Notifications
```typescript
// Privacy-respecting notifications via Telegram
const notifyBondsOfCheckIn = async () => {
  // Only notify bonds who have:
  // 1. notify_bonds_on_check_in = true
  // 2. User has show_check_ins = true
}
```

## Technical Implementation

### GraphQL Integration

```typescript
// Mini-app GraphQL client configuration
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  headers: {
    // Include Telegram init data for auth
    'x-telegram-init-data': window.Telegram?.WebApp?.initData,
  },
})

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
})
```

### Privacy-Aware API Calls

```typescript
// hooks/usePrivacySettings.ts
import { useGetMyPrivacySettingsQuery, useApplyPrivacyPresetMutation } from '@/generated/graphql'

export function usePrivacySettings() {
  const { data, loading, refetch } = useGetMyPrivacySettingsQuery()
  const [applyPreset] = useApplyPrivacyPresetMutation()

  const enableGhostMode = async () => {
    await applyPreset({ variables: { preset: 'ghost' } })
    refetch()
  }

  return {
    settings: data?.myPrivacySettings,
    loading,
    enableGhostMode,
    refetch,
  }
}
```

### User Discovery in Mini-App

```typescript
// hooks/useUserDiscovery.ts
import { useGetSuggestedUsersQuery, useSearchUsersLazyQuery } from '@/generated/graphql'

export function useUserDiscovery() {
  const { data: suggestions, loading, refetch } = useGetSuggestedUsersQuery({
    variables: { limit: 20 },
  })

  const [searchUsers, { data: searchResults }] = useSearchUsersLazyQuery()

  return {
    suggestions: suggestions?.suggestedUsers?.suggestions || [],
    searchResults: searchResults?.searchUsers?.results || [],
    loading,
    search: (query: string) => searchUsers({
      variables: { input: { query, limit: 20 } }
    }),
    refresh: refetch,
  }
}
```

## UI Components for Mini-App

### 1. Privacy Preset Card
```tsx
interface PrivacyPresetCardProps {
  preset: 'open' | 'social' | 'selective' | 'private_mode' | 'ghost'
  isActive: boolean
  onSelect: () => void
}

// Telegram-native styling with mini-app theme support
// tg.themeParams for colors
```

### 2. User Suggestion Card
```tsx
interface UserSuggestionCardProps {
  user: UserSuggestion
  onBond: () => void
  onDismiss: () => void
  onViewProfile: () => void
}

// Match mobile app design but adapted for mini-app constraints
```

### 3. Privacy Status Badge
```tsx
// Shows current privacy level in mini-app header
<PrivacyBadge
  visibility={settings.profile_visibility}
  onPress={() => router.push('/miniapps/privacy')}
/>
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Mini-App                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Privacy    │  │   Discover   │  │      Profile     │   │
│  │   Settings   │  │     Tab      │  │      Page        │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                  │                   │             │
│         └──────────────────┼───────────────────┘             │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  Apollo Client │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │
                     ┌───────▼────────┐
                     │  GraphQL API   │
                     │  /graphql      │
                     └───────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐       ┌─────▼────┐       ┌─────▼─────┐
    │ Privacy  │       │  Users   │       │ Suggest-  │
    │ Settings │       │  Table   │       │   ions    │
    └──────────┘       └──────────┘       └───────────┘
```

## Security Considerations

1. **Telegram Init Data Validation**
   - Always validate `initData` on backend
   - Use `initDataUnsafe` only for UI display

2. **Privacy Enforcement**
   - All privacy checks happen on backend
   - Never trust client-side privacy data for access control
   - Use database functions (`can_view_profile`, `can_message_user`)

3. **Rate Limiting**
   - Search: 10 requests/minute
   - Profile views: 30 requests/minute
   - Suggestion refresh: 5 requests/minute

## Timeline

| Week | Milestone |
|------|-----------|
| 1 | Privacy Settings page in mini-app |
| 2 | User Discovery tab integration |
| 3 | Telegram-specific features |
| 4 | Testing & polish |

## Files to Create

```
danz-web/
├── app/miniapps/
│   ├── privacy/
│   │   └── page.tsx          # Privacy settings page
│   ├── discover/
│   │   └── page.tsx          # User discovery page
│   └── components/
│       ├── PrivacyPresetCard.tsx
│       ├── PrivacyQuickToggle.tsx
│       ├── UserSuggestionCard.tsx
│       ├── UserSearchResults.tsx
│       └── PrivacyBadge.tsx
├── hooks/
│   ├── usePrivacySettings.ts
│   └── useUserDiscovery.ts
└── graphql/
    └── privacy.graphql       # Copy from mobile app
```

## Next Steps

1. Run GraphQL codegen in danz-web to generate types
2. Create privacy settings page in mini-app
3. Add discover tab to mini-app navigation
4. Test privacy enforcement across platforms
5. Add Telegram-specific sharing features

## Related Files

- Backend Schema: `src/graphql/schema/privacy.schema.ts`
- Backend Resolvers: `src/graphql/resolvers/privacy.resolvers.ts`
- Migration: `migrations/046_privacy_and_user_discovery.sql`
- Mobile Screens: `PrivacySettingsScreen.tsx`, `UserDiscoveryScreen.tsx`
