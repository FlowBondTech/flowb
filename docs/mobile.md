---
title: Mobile App
---

# Mobile App (iOS)

The FlowB mobile app is built with Expo (React Native) and available on TestFlight.

## Stack

- **Framework**: Expo SDK + React Native
- **Bundle ID**: `me.flowb.app`
- **EAS Project**: `@kohx/flowb-app`
- **Auth**: Hardcoded demo users for EthDenver (native app auth)

## Features

The mobile app shares the same API as the mini apps and provides:

- Event browsing and RSVP
- Crew management
- Points and leaderboard
- Push notifications (via Expo)

## Building

```bash
cd mobile
npm install
eas build --platform ios --profile development
```

## Distribution

Currently distributed via TestFlight for EthDenver attendees.

| Config | Value |
|--------|-------|
| Apple Team ID | `BH2A3MJ4CK` |
| ASC App ID | `6759241038` |
| EAS Owner | `kohx` |
