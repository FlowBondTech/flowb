# PAYMENT.md - DANZ NOW Payment Integration Guide

## Overview
Complete payment system integrating Stripe for payments and Privy for Web3/Web2 authentication.

## Architecture

### Payment Flow
```
User Journey:
1. Browse Products → 2. Select Option → 3. Authenticate (Privy) → 4. Checkout (Stripe) → 5. Confirmation

Technical Flow:
1. Load Products (Stripe API)
2. User Selection (React State)
3. Authentication Check (Privy)
4. Create Checkout Session (Stripe)
5. Process Payment (Stripe Checkout)
6. Webhook Confirmation (Stripe → Supabase)
7. Order Fulfillment
```

### Components

#### 1. **PurchaseFlow Component** (`src/components/PurchaseFlow.jsx`)
- Main purchase modal interface
- Dynamically loads products from Stripe
- Handles authentication via Privy
- Initiates Stripe checkout

#### 2. **DeviceReservation Component** (`src/components/DeviceReservation.jsx`)
- Pre-order interface for FlowBond device
- Package selection (Device only vs Device + Premium)
- Integrates with PurchaseFlow for checkout

#### 3. **Products Configuration** (`src/config/products.js`)
- Static product definitions (fallback)
- Payment option structures
- Pricing tiers

## Stripe Integration

### Products & Prices
We have 2 main products with multiple payment options:

1. **FlowBond Device**
   - One-time: $199.99
   - Monthly: $19.99/month

2. **DANZ NOW App Premium**
   - Monthly: $9.99/month
   - Yearly: $99.99/year

### API Endpoints

#### `/api/stripe-products` - Fetch Products
```javascript
// Fetches all active products and prices from Stripe
GET /api/stripe-products
Response: {
  products: [{
    id: "prod_xxx",
    name: "FlowBond Device",
    prices: [{
      id: "price_xxx",
      unit_amount: 19999,
      currency: "usd",
      type: "one_time"
    }]
  }]
}
```

#### `/api/create-checkout-session` - Create Checkout
```javascript
POST /api/create-checkout-session
Body: {
  priceId: "price_xxx",
  quantity: 1,
  mode: "payment", // or "subscription"
  customerEmail: "user@example.com",
  metadata: { userId, productId }
}
Response: {
  sessionId: "cs_xxx",
  url: "https://checkout.stripe.com/..."
}
```

#### `/api/stripe-webhook` - Handle Events
Processes Stripe webhook events:
- `checkout.session.completed`
- `payment_intent.payment_failed`
- `customer.subscription.created/updated/deleted`

### Environment Variables
```bash
# Frontend (safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Backend only (keep secret)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Privy Authentication

### Configuration (`src/config/privy.js`)
```javascript
{
  appId: 'clxxx',
  loginMethods: ['email', 'wallet', 'google', 'twitter'],
  appearance: {
    theme: 'dark',
    accentColor: '#ff6ec7'
  }
}
```

### Authentication Flow
1. User clicks purchase → Check authentication
2. If not authenticated → Privy login modal
3. After login → Continue to Stripe checkout
4. User data saved to localStorage and Supabase

### User Data Management
```javascript
// After successful Privy auth
localStorage.setItem('userEmail', email)
localStorage.setItem('userName', name)
localStorage.setItem('userId', userId)

// Supabase user profile
{
  id: privyUserId,
  email: email,
  name: name,
  wallet_address: walletAddress,
  auth_provider: 'privy'
}
```

## Database Schema (Supabase)

### Tables

#### `purchase_intents`
- Tracks all purchase attempts
- Status: pending → completed/failed
- Links to Stripe session

#### `orders`
- Completed purchases
- Links to user, product, and Stripe data
- Status: processing → shipped → delivered

#### `subscriptions`
- Active subscriptions
- Stripe subscription ID
- Renewal dates and status

#### `device_reservations`
- Pre-order specific data
- Package selection
- Shipping information

## Testing

### Test Cards (Stripe Test Mode)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Test Flow
1. Open purchase modal
2. Select product and payment option
3. Login with Privy (email/wallet)
4. Continue to Stripe Checkout
5. Use test card
6. Verify webhook received
7. Check database updates

## Deployment

### Netlify
1. Move API files to `/netlify/functions/`
2. Add environment variables in Netlify dashboard
3. Set up webhook endpoint: `https://yourdomain.netlify.app/.netlify/functions/stripe-webhook`

### Vercel
1. Keep API files in `/api/`
2. Add environment variables in Vercel dashboard
3. Webhook endpoint: `https://yourdomain.vercel.app/api/stripe-webhook`

## Security Considerations

1. **Never expose secret keys** in frontend code
2. **Validate webhook signatures** to prevent fake events
3. **Use HTTPS** in production
4. **Implement rate limiting** on API endpoints
5. **Sanitize user inputs** before database storage
6. **Use Stripe's built-in fraud detection**

## Error Handling

### Common Issues
1. **"Products not loading"** - Check API endpoint deployment
2. **"Payment failed"** - Verify card details and funds
3. **"Webhook not received"** - Check webhook URL and secret
4. **"User not authenticated"** - Ensure Privy is properly configured

### Debugging
```javascript
// Enable debug logging
localStorage.setItem('debug', 'stripe:*')
localStorage.setItem('debug', 'privy:*')

// Check network tab for API calls
// Monitor console for errors
// Verify environment variables are loaded
```

## Support Resources

- [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard)
- [Privy Dashboard](https://dashboard.privy.io)
- [Supabase Dashboard](https://app.supabase.com)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Privy Docs](https://docs.privy.io)