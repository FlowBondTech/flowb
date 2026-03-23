// Stripe Configuration
export const stripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  
  // Product Price IDs - Update these with your actual Stripe Price IDs
  priceIds: {
    // FlowBond Device
    deviceOneTime: 'price_device_onetime', // $199.99 one-time
    deviceMonthly: 'price_device_monthly', // $19.99/month
    
    // DANZ NOW App Premium
    appMonthly: 'price_app_monthly', // $9.99/month
    appYearly: 'price_app_yearly', // $99.99/year
  },
  
  // Stripe checkout configuration
  checkoutConfig: {
    mode: 'payment', // or 'subscription' for recurring
    successUrl: `${window.location.origin}/reservation-success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${window.location.origin}`,
    billingAddressCollection: 'required',
    shippingAddressCollection: {
      allowedCountries: ['US', 'CA', 'GB', 'AU', 'EU'],
    },
  },
  
  // Payment method types
  paymentMethodTypes: ['card'],
}

// Validate configuration
if (!stripeConfig.publishableKey) {
  console.warn('Stripe publishable key not found. Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env file')
}