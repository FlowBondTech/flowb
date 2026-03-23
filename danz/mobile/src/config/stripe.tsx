import type React from 'react'
import { Platform, View } from 'react-native'

// Only import Stripe native SDK on mobile platforms
const StripeProvider =
  Platform.OS === 'web'
    ? ({ children }: { children: React.ReactNode }) => <>{children}</>
    : require('@stripe/stripe-react-native').StripeProvider

// Stripe configuration for React Native
export const stripeConfig = {
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  merchantIdentifier: 'merchant.com.danz.app', // For Apple Pay
  urlScheme: 'danz', // For returning from payment screens
  setReturnUrlSchemeOnAndroid: true, // Android deep linking
}

// Stripe theme configuration to match DANZ branding
export const stripeTheme = {
  colors: {
    primary: '#FF6EC7', // DANZ pink
    background: '#0a0a0f', // Dark background
    componentBackground: '#1a0a1a',
    componentBorder: 'rgba(255, 110, 199, 0.2)',
    componentDivider: 'rgba(255, 110, 199, 0.1)',
    primaryText: '#ffffff',
    secondaryText: '#b8b8b8',
    componentText: '#ffffff',
    placeholderText: '#666666',
    icon: '#FF6EC7',
    error: '#ff6b6b',
    success: '#4caf50',
  },
  shapes: {
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryButton: {
    colors: {
      background: '#FF6EC7',
      text: '#ffffff',
      border: '#FF6EC7',
    },
  },
}

// Export a configured StripeProvider component
export const StripeProviderWrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <StripeProvider
      publishableKey={stripeConfig.publishableKey}
      merchantIdentifier={stripeConfig.merchantIdentifier}
      urlScheme={stripeConfig.urlScheme}
      setReturnUrlSchemeOnAndroid={stripeConfig.setReturnUrlSchemeOnAndroid}
    >
      {(children as React.ReactElement) || <></>}
    </StripeProvider>
  )
}

// Subscription tier configuration
export const subscriptionTiers = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: ['Join 3 events/month', 'Earn up to 100 DANZ/month', 'Community access'],
  },
  monthly: {
    name: 'Pro Monthly',
    price: 9.99,
    priceId: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'standard_monthly',
    features: [
      'Unlimited events',
      'Unlimited DANZ earning',
      '2x reward multiplier',
      'Priority booking',
      'Exclusive challenges',
      'Pro badge',
    ],
  },
  yearly: {
    name: 'Pro Yearly',
    price: 99,
    priceId: process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID || 'standard_yearly',
    features: [
      'Unlimited events',
      'Unlimited DANZ earning',
      '2x reward multiplier',
      'Priority booking',
      'Exclusive challenges',
      'Pro badge',
      '2 months free (save $20)',
    ],
  },
}
