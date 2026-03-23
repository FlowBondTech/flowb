# Session Management Documentation

## Overview

The DANZ NOW landing page includes a comprehensive session management system that handles authentication state, multi-tab synchronization, session persistence, timeout management, and protected routes.

## Architecture

### Core Components

1. **SessionManager** (`src/utils/SessionManager.js`)
   - Singleton service managing session lifecycle
   - Handles multi-tab sync via BroadcastChannel API
   - Automatic session refresh and timeout
   - Activity tracking and inactivity detection

2. **useSession Hook** (`src/hooks/useSession.js`)
   - React integration for SessionManager
   - Synchronizes with Privy authentication
   - Provides session state and actions to components
   - Includes utility hooks for common patterns

3. **SessionProvider** (`src/components/SessionProvider.jsx`)
   - Context provider wrapping the app
   - Session expiry and inactivity warnings
   - Global session state management
   - Session status indicator component

4. **ProtectedRoute** (`src/components/ProtectedRoute.jsx`)
   - Route protection component
   - Authentication and permission checks
   - Premium and device owner routes
   - Guest-only route support

## Features

### 1. Session Lifecycle Management

**Session Creation**
```javascript
// Automatically created on successful Privy login
const session = {
  id: 'session_1234_abc',
  userId: 'user_123',
  email: 'user@example.com',
  name: 'John Doe',
  provider: 'google',
  createdAt: Date.now(),
  expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
  lastActivity: Date.now()
}
```

**Session Configuration**
- **Session Timeout**: 30 minutes (configurable)
- **Refresh Interval**: 5 minutes before expiry
- **Inactivity Timeout**: 15 minutes
- **Storage Key**: `danz_session`

### 2. Multi-Tab Synchronization

Sessions automatically sync across browser tabs using the BroadcastChannel API:

- Login in one tab → All tabs authenticated
- Logout in one tab → All tabs logged out
- Session refresh → All tabs updated
- Activity in one tab → Resets inactivity timer in all tabs

### 3. Session Persistence

Sessions persist across page refreshes:
- Stored in localStorage
- Validated on page load
- Expired sessions automatically cleaned
- Secure session restoration

### 4. Activity Tracking

User activity automatically extends sessions:
- Mouse movements
- Keyboard input
- Scrolling
- Touch events

### 5. Session Warnings

Two types of warnings:

**Expiry Warning**
- Shows when < 5 minutes remain
- Offers to refresh session
- Countdown timer display

**Inactivity Warning**
- Shows after 10 minutes of inactivity
- Prompts user to continue
- Auto-logout option

## Usage

### Basic Session Access

```jsx
import { useSession } from '../hooks/useSession'

function MyComponent() {
  const { 
    isAuthenticated,
    user,
    email,
    sessionStatus,
    login,
    logout
  } = useSession()

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {email}!</p>
      ) : (
        <button onClick={login}>Login</button>
      )}
    </div>
  )
}
```

### Protected Routes

```jsx
import ProtectedRoute from './components/ProtectedRoute'

// Basic authentication required
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute requireAuth={true}>
      <Dashboard />
    </ProtectedRoute>
  } 
/>

// Premium subscription required
<Route 
  path="/premium-features" 
  element={
    <ProtectedRoute requireAuth={true} requirePremium={true}>
      <PremiumFeatures />
    </ProtectedRoute>
  } 
/>

// Device reservation required
<Route 
  path="/device-settings" 
  element={
    <ProtectedRoute requireAuth={true} requireDevice={true}>
      <DeviceSettings />
    </ProtectedRoute>
  } 
/>
```

### Session Status Indicator

```jsx
import { SessionStatusIndicator } from './components/SessionProvider'

function Navbar() {
  return (
    <nav>
      <SessionStatusIndicator />
    </nav>
  )
}
```

### Premium Access Check

```jsx
import { usePremiumAccess } from '../hooks/useSession'

function FeatureGate() {
  const { hasPremium, isChecking } = usePremiumAccess()
  
  if (isChecking) return <Loading />
  
  return hasPremium ? <PremiumFeature /> : <UpgradePrompt />
}
```

### Session Countdown

```jsx
import { useSessionCountdown } from '../hooks/useSession'

function SessionTimer() {
  const countdown = useSessionCountdown()
  
  return countdown && (
    <div>Session: {countdown}</div>
  )
}
```

## Session States

| Status | Description | Visual |
|--------|-------------|---------|
| `loading` | Session initializing | Gray indicator |
| `unauthenticated` | No active session | Hidden |
| `active` | Session valid and active | Green dot |
| `expiring_soon` | < 5 minutes remaining | Orange dot + countdown |
| `inactive` | User inactive > 10 min | Orange dot |
| `expired` | Session expired | Red dot |

## Security Considerations

1. **Token Storage**: Auth tokens stored securely in memory
2. **Session Validation**: Sessions validated on every check
3. **Automatic Cleanup**: Expired sessions automatically removed
4. **XSS Protection**: No sensitive data in localStorage
5. **CSRF Protection**: Session IDs regenerated on login

## API Reference

### SessionManager Methods

```javascript
// Create new session
sessionManager.createSession(user, authToken)

// Refresh session
await sessionManager.refreshSession()

// Destroy session
sessionManager.destroySession(reason)

// Check validity
sessionManager.isValid()

// Get session info
sessionManager.getInfo()

// Update metadata
sessionManager.updateMetadata({ key: value })

// Add listener
const unsubscribe = sessionManager.addListener((event, data) => {
  // Handle session events
})
```

### useSession Hook Returns

```javascript
{
  // Session state
  session: Object,
  sessionInfo: Object,
  sessionStatus: String,
  isLoading: Boolean,
  
  // User info
  isAuthenticated: Boolean,
  userId: String,
  email: String,
  name: String,
  provider: String,
  
  // Actions
  login: Function,
  logout: Function,
  refreshSession: Function,
  updateSessionMetadata: Function,
  checkPremiumAccess: Function,
  checkDeviceReservation: Function,
  
  // Privy state
  user: Object,
  ready: Boolean,
  authenticated: Boolean
}
```

### Session Events

| Event | Description | Data |
|-------|-------------|------|
| `session_created` | New session created | Session object |
| `session_restored` | Session restored from storage | Session object |
| `session_refreshed` | Session refreshed | Session object |
| `session_synced` | Session synced from another tab | Session object |
| `session_destroyed` | Session destroyed | { sessionId, reason } |
| `session_inactive` | User inactive warning | { inactiveTime, session } |

## Configuration

Edit `SessionManager.js` constructor to modify defaults:

```javascript
this.config = {
  sessionTimeout: 30 * 60 * 1000,      // 30 minutes
  refreshInterval: 5 * 60 * 1000,      // 5 minutes
  inactivityTimeout: 15 * 60 * 1000,   // 15 minutes
  storageKey: 'danz_session',
  syncChannelName: 'danz_session_sync'
}
```

## Troubleshooting

### Session Not Persisting
- Check localStorage is enabled
- Verify session creation after login
- Check for session expiry

### Multi-Tab Sync Not Working
- BroadcastChannel API may not be supported
- Check browser compatibility
- Falls back to storage events

### Premature Logout
- Check session timeout settings
- Verify activity tracking is working
- Check for network issues

### Protected Routes Not Working
- Ensure SessionProvider wraps routes
- Check authentication state
- Verify permission checks

## Testing

### Manual Testing
1. Login and verify session creation
2. Open multiple tabs and test sync
3. Wait for expiry warning (set shorter timeout for testing)
4. Test inactivity detection
5. Test protected route access
6. Test session persistence across refreshes

### Automated Testing
```javascript
// Test session creation
const session = sessionManager.createSession(mockUser)
expect(session.userId).toBe(mockUser.id)

// Test expiry
session.expiresAt = Date.now() - 1000
expect(sessionManager.isValid()).toBe(false)

// Test multi-tab sync
sessionManager.broadcastSession('refresh')
// Verify other tabs receive update
```

## Best Practices

1. **Always use hooks**: Don't access SessionManager directly in components
2. **Handle loading states**: Show appropriate UI during session checks
3. **Provide fallbacks**: Use fallback props in ProtectedRoute
4. **Test edge cases**: Expired sessions, network failures, etc.
5. **Monitor performance**: Session checks should be fast
6. **Log session events**: Track user session patterns

## Migration Guide

If upgrading from basic auth to session management:

1. Wrap app with `SessionProvider`
2. Replace auth checks with `useSession` hook
3. Update protected routes to use `ProtectedRoute`
4. Test multi-tab behavior
5. Configure session timeouts
6. Add session status indicators

## Support

For issues or questions:
- Check browser console for session events
- Review session state in React DevTools
- Check localStorage for `danz_session`
- Monitor BroadcastChannel messages