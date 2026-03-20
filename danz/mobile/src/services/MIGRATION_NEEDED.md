# Payment Services Migration Needed

The following payment services still reference REST API endpoints that have been removed. These need to be migrated to GraphQL:

## Files requiring migration:
- `stripePayments.ts` - Stripe integration

## Required GraphQL mutations/queries:

### Stripe
- `mutation CreatePaymentIntent`
- `mutation ConfirmPayment`
- `mutation CreateSubscription`
- `mutation CancelSubscription`
- `query GetSubscriptionStatus`

## Webhooks
Webhooks endpoints also need to be implemented:
- `/webhooks/stripe`

Note: These can either be:
1. Implemented as GraphQL mutations
2. Kept as minimal REST endpoints specifically for payment processing
3. Implemented as separate serverless functions
