# Stripe Test Suite - DANZ NOW

## 🚀 Test Environment Setup

### Prerequisites Checklist
- [x] Stripe Test Keys configured in `.env`
- [x] Local test server running on port 3001
- [x] Frontend dev server running on port 5173
- [x] Products created in Stripe Dashboard
- [x] Price IDs integrated

### Test Server Status
```bash
# Check server status
curl http://localhost:3001/api/test-connection

# Expected response:
{
  "status": "connected",
  "server": "running",
  "stripe": {
    "connected": true,
    "accountId": "acct_1RxyyVPhVlDr0T8W",
    "testMode": true
  }
}
```

## 📝 Test Scenarios

### 1. Product Loading Tests

#### Test 1.1: Load Products from Stripe
**Steps:**
1. Open app at http://localhost:5173
2. Click "Get FlowBond Now" button
3. Observe console for product loading

**Expected:**
- Products load from local test server
- Console shows: "Loaded products from Stripe"
- Modal displays 2 products with correct prices

**Actual Result:** [ ] Pass [ ] Fail
**Notes:** _______________

#### Test 1.2: Product Caching
**Steps:**
1. Open modal
2. Close modal
3. Open modal again within 5 minutes

**Expected:**
- Second load uses cached data (faster)
- No additional API calls

**Actual Result:** [ ] Pass [ ] Fail

### 2. Authentication Flow Tests

#### Test 2.1: Unauthenticated Purchase Attempt
**Steps:**
1. Open purchase modal (not logged in)
2. Select a product
3. Click "Login to Purchase"

**Expected:**
- Privy login modal appears
- After login, returns to purchase flow
- User data saved to localStorage

**Actual Result:** [ ] Pass [ ] Fail

#### Test 2.2: Authenticated Purchase
**Steps:**
1. Login with Privy first
2. Open purchase modal
3. Select product

**Expected:**
- Button shows "Continue to Payment"
- User email populated

**Actual Result:** [ ] Pass [ ] Fail

### 3. Checkout Flow Tests

#### Test 3.1: One-Time Payment (Device)
**Steps:**
1. Select "FlowBond Device" ($99)
2. Click "Continue to Payment"
3. Complete Stripe checkout

**Test Data:**
- Card: 4242 4242 4242 4242
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Expected:**
- Redirects to Stripe Checkout
- Shows $99.00 total
- Success redirects to /reservation-success

**Actual Result:** [ ] Pass [ ] Fail

#### Test 3.2: One-Time Payment (Device + Premium)
**Steps:**
1. Select "Device + 1 Year Premium" ($149)
2. Complete checkout

**Expected:**
- Redirects to Stripe Checkout
- Shows $149.00 total

**Actual Result:** [ ] Pass [ ] Fail

#### Test 3.3: Monthly Subscription
**Steps:**
1. Select "Flow Subscription"
2. Choose "$9.90/month"
3. Complete checkout

**Expected:**
- Stripe shows subscription mode
- Recurring payment indicated

**Actual Result:** [ ] Pass [ ] Fail

#### Test 3.4: Annual Subscription
**Steps:**
1. Select "Flow Subscription"
2. Choose "$77/year"
3. Complete checkout

**Expected:**
- Shows annual billing
- Displays savings badge

**Actual Result:** [ ] Pass [ ] Fail

### 4. Error Handling Tests

#### Test 4.1: Declined Card
**Test Card:** 4000 0000 0000 0002

**Expected:**
- Payment fails
- Returns to app with error message

**Actual Result:** [ ] Pass [ ] Fail

#### Test 4.2: 3D Secure Required
**Test Card:** 4000 0025 0000 3155

**Expected:**
- 3D Secure challenge appears
- After completion, payment succeeds

**Actual Result:** [ ] Pass [ ] Fail

#### Test 4.3: Network Error
**Steps:**
1. Stop test server
2. Try to purchase

**Expected:**
- Falls back to mock products
- Shows appropriate error message

**Actual Result:** [ ] Pass [ ] Fail

### 5. Webhook Tests

#### Test 5.1: Successful Payment Webhook
**Steps:**
1. Complete a purchase
2. Check server logs

**Expected:**
- Server receives checkout.session.completed
- Logs show payment details

**Actual Result:** [ ] Pass [ ] Fail

### 6. Mobile Responsiveness Tests

#### Test 6.1: Mobile Purchase Flow
**Steps:**
1. Open on mobile viewport (375px)
2. Complete purchase flow

**Expected:**
- Modal responsive
- All elements accessible
- Touch interactions work

**Actual Result:** [ ] Pass [ ] Fail

## 🎯 Test Cards Reference

| Scenario | Card Number | Description |
|----------|-------------|-------------|
| Success | 4242 4242 4242 4242 | Always succeeds |
| Decline | 4000 0000 0000 0002 | Always declines |
| Insufficient Funds | 4000 0000 0000 9995 | Decline: insufficient_funds |
| 3D Secure Required | 4000 0025 0000 3155 | Requires authentication |
| 3D Secure Optional | 4000 0027 6000 3184 | Optional authentication |

## 📊 Test Results Summary

**Date:** _______________
**Tester:** _______________

### Overall Results:
- [ ] All tests passing
- [ ] Some tests failing (see notes)
- [ ] Blocked by: _______________

### Performance Metrics:
- Product load time: _____ms
- Checkout redirect time: _____ms
- Success page load: _____ms

### Issues Found:
1. _______________
2. _______________
3. _______________

### Recommendations:
1. _______________
2. _______________
3. _______________

## 🚨 Common Issues & Solutions

### Issue: "Failed to fetch products"
**Solution:** Ensure test server is running on port 3001

### Issue: "Payment method not available"
**Solution:** Check Stripe Dashboard settings for payment methods

### Issue: "Webhook signature verification failed"
**Solution:** Update STRIPE_WEBHOOK_SECRET in .env

### Issue: "CORS error"
**Solution:** Check server CORS configuration includes your frontend URL

## 📝 Deployment Checklist

Before going to production:
- [ ] Switch to live Stripe keys
- [ ] Update success/cancel URLs
- [ ] Configure production webhook endpoint
- [ ] Set up webhook secret
- [ ] Enable all required payment methods
- [ ] Test with real payment method
- [ ] Configure tax settings if needed
- [ ] Set up customer portal
- [ ] Configure email receipts
- [ ] Review and test refund process