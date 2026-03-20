# Stripe Setup Guide for DANZ NOW

## Current Status
✅ Stripe keys added to `.env` file
✅ Stripe SDK installed (`@stripe/stripe-js`)
✅ Stripe configuration file created
✅ Purchase flow integrated with Stripe (ready for price IDs)
⏳ Price IDs need to be created in Stripe Dashboard
⏳ Backend API endpoints need to be deployed

## Next Steps

### 1. Create Products and Prices in Stripe Dashboard

Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/test/products) and create:

#### FlowBond Device
1. **Product Name**: FlowBond Device
2. **Description**: DANZ NOW movement tracking bracelet
3. Create two prices:
   - **One-time**: $199.99 (payment mode)
   - **Monthly**: $19.99/month (subscription mode)

#### DANZ NOW App Premium
1. **Product Name**: DANZ NOW App Premium
2. **Description**: Premium app features and rewards
3. Create two prices:
   - **Monthly**: $9.99/month (subscription)
   - **Yearly**: $99.99/year (subscription)

### 2. Update Price IDs

Once created, copy the price IDs (format: `price_xxxxx`) and update:

```javascript
// src/config/stripe.js
priceIds: {
  deviceOneTime: 'price_xxxxx',  // Replace with actual
  deviceMonthly: 'price_xxxxx',  // Replace with actual
  appMonthly: 'price_xxxxx',     // Replace with actual
  appYearly: 'price_xxxxx',      // Replace with actual
}
```

### 3. Set Up Webhook Endpoint

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Add endpoint: `https://yourdomain.com/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret
5. Add to your production environment:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### 4. Deploy Backend API

The API endpoints in `/api` folder need to be deployed to:
- **Vercel**: Deploy as API routes
- **Netlify**: Deploy as Netlify Functions
- **Custom Server**: Integrate into your Node.js backend

### 5. Environment Variables for Production

Add these to your hosting provider (Netlify/Vercel):
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx (backend only)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx (backend only)
SUPABASE_SERVICE_ROLE_KEY=xxxxx (backend only, for admin access)
```

### 6. Test the Integration

#### Test Mode Checklist:
- [ ] Products created in Stripe Dashboard
- [ ] Price IDs updated in config
- [ ] Test purchase with card: 4242 4242 4242 4242
- [ ] Webhook events received
- [ ] Database updated with purchase records

#### Going Live:
1. Switch to live keys (remove 'test' from key prefix)
2. Create live products and prices
3. Update webhook endpoint for production
4. Test with real payment method

## Database Tables Needed

Run `setup-purchase-table.sql` to create:
- `purchase_intents` - Track purchase attempts
- `orders` - Completed orders
- `subscriptions` - Active subscriptions

## Security Notes

⚠️ **NEVER expose the secret key (`sk_`) in frontend code**
- Secret key is only for backend/server use
- Publishable key (`pk_`) is safe for frontend
- Always verify webhook signatures
- Use HTTPS in production
- Enable CORS only for your domain

## Support Resources

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Test Cards](https://stripe.com/docs/testing#cards)
- [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard)