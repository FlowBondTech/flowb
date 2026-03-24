---
name: flowb-stripe
description: Stripe payment management for FlowB EC sites - orders, refunds, checkout, revenue
---

# Stripe Payment Manager

Manage Stripe payments for FlowB EC websites.

## Capabilities
- Create checkout sessions and shareable payment links
- List and search orders by status, date, customer
- Process full or partial refunds
- View revenue reports (daily, weekly, monthly)
- Sync products between site DB and Stripe catalog
- Monitor failed payments and subscription issues

## Usage
Uses FlowB API endpoints for all Stripe operations.
Default site: nored-farms

## Commands

### List products on Stripe
```bash
bash ../flowb-biz/scripts/stripe.sh products
```

### View revenue
```bash
bash ../flowb-biz/scripts/stripe.sh revenue monthly
```

### Create checkout link
```bash
bash ../flowb-biz/scripts/stripe.sh checkout price_xxx 1
```

### Process refund
```bash
bash ../flowb-biz/scripts/stripe.sh refund pi_xxx [amount]
```

## Important
- Always confirm refunds with the user before processing
- Monitor for failed payments proactively
- When revenue is asked for, default to monthly unless specified
