# DANZ Backend

Express.js backend for DANZ app using Node.js/TypeScript, Privy authentication, and Supabase database.

## Features

- **Privy Authentication**: Email (OTP) and Google OAuth
- **Supabase Database**: User profile management
- **JWT Token Verification**: Secure API endpoints
- **Environment-based Configuration**: Local, Development, Production

## Setup

### Prerequisites

- Node.js 18+ and pnpm installed
- Supabase project
- Privy app account

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your credentials:
```
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

4. Run database migration in Supabase:
```sql
-- Execute the SQL in migrations/001_privy_auth.sql
```

## Development

Start development server with hot reload:
```bash
pnpm run dev
```

Server runs on http://localhost:8080

### Testing Stripe Webhooks Locally

When developing Stripe integration locally, you need to forward webhooks from Stripe to your local server:

1. **Install Stripe CLI** (if not already installed):
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

2. **Login to Stripe**:
```bash
stripe login
```

3. **Forward webhooks to local server**:
```bash
stripe listen --forward-to http://localhost:8080/api/stripe/webhook
```

4. **Test webhook events** (in another terminal):
```bash
# Trigger specific events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
```

The Stripe CLI will display the webhook signing secret when you start listening. Add this to your `.env` file:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Stripe Configuration

### Test Environment Setup

1. **Create Products and Prices** (https://dashboard.stripe.com/test/products)
   - Create "Monthly Flow" product:
     - Price: $9.99/month
     - Recurring billing
     - Note the price ID (e.g., `price_1234...`)
   - Create "Annual Flow" product:
     - Price: $99/year
     - Recurring billing
     - Note the price ID

2. **Configure Customer Portal** (https://dashboard.stripe.com/test/settings/billing/portal)
   - Enable the Customer Portal
   - Settings to enable:
     - ✅ Customers can update payment methods
     - ✅ Customers can update billing address
     - ✅ Customers can cancel subscriptions
     - ✅ Customers can switch plans (optional for upgrades/downgrades)
   - Set default redirect URL:
     ```
     http://localhost:3000/dashboard/subscription?portal=success
     ```
   - Save configuration

3. **Configure Webhooks** (https://dashboard.stripe.com/test/webhooks)
   - Add endpoint URL:
     ```
     http://localhost:8080/api/stripe/webhook (for local testing with Stripe CLI)
     ```
   - Select events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the signing secret and add to `.env`:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```

4. **Add Environment Variables** to `.env`:
   ```bash
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_MONTHLY=price_...
   STRIPE_PRICE_ID_YEARLY=price_...
   ```

### Production Environment Setup

1. **Switch to Live Mode** in Stripe Dashboard

2. **Create Products and Prices** (https://dashboard.stripe.com/products)
   - Same as test but in live mode
   - Note the live price IDs

3. **Configure Customer Portal** (https://dashboard.stripe.com/settings/billing/portal)
   - Same settings as test
   - Set production redirect URL:
     ```
     https://yourdomain.com/dashboard/subscription?portal=success
     ```

4. **Configure Production Webhook** (https://dashboard.stripe.com/webhooks)
   - Add endpoint URL:
     ```
     https://api.yourdomain.com/api/stripe/webhook
     ```
   - Select same events as test environment
   - Copy the live signing secret

5. **Set Production Environment Variables**:
   ```bash
   # Production Stripe Configuration
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_MONTHLY=price_...
   STRIPE_PRICE_ID_YEARLY=price_...
   ```

### Important Notes

- **Test Mode**: Always use test keys (starting with `sk_test_`) during development
- **Live Mode**: Only use live keys (starting with `sk_live_`) in production
- **Security**: Never commit API keys to version control
- **Portal Settings**: Must be configured separately for test and live modes
- **Webhook Endpoints**: Test and production webhooks are managed separately
- **Price IDs**: Test and live price IDs are different - update accordingly

### Testing Checklist

Before going live, ensure:
- [ ] Customer Portal is configured in both test and live modes
- [ ] Webhook endpoints are set up for production
- [ ] All environment variables are updated for production
- [ ] Test complete checkout flow in test mode
- [ ] Test subscription management (upgrade/downgrade/cancel)
- [ ] Verify webhook processing for all events
- [ ] Test with Stripe test cards before going live

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login/register user (requires Privy token)
- `POST /api/auth/verify` - Verify token validity
- `POST /api/auth/logout` - Logout user

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `DELETE /api/users/account` - Delete account
- `GET /api/users/username/:username/check` - Check username availability
- `GET /api/users/username/:username` - Get user by username

### Subscription/Stripe
- `POST /api/stripe/create-checkout-session` - Create Stripe checkout session
- `POST /api/stripe/create-portal-session` - Create customer portal session
- `POST /api/stripe/webhook` - Stripe webhook endpoint (raw body required)

### Health Check
- `GET /health` - Server health status

## Authentication Flow

1. **Client (React Native)**:
   - User logs in via Privy (Email/Google)
   - Receives Privy access token

2. **Backend Verification**:
   - Verifies Privy token
   - Creates/updates user in Supabase
   - Returns user profile

3. **Protected Routes**:
   - All `/api/users/*` routes require valid Privy token
   - Token sent via `Authorization: Bearer <token>` header

## Database Schema

```sql
users
├── id (UUID, primary key)
├── privy_id (string, unique, required)
├── email (string, optional)
├── wallet_address (string, optional)
├── google_id (string, optional)
├── username (string, unique, optional)
├── display_name (string)
├── bio (text)
├── avatar_url (text)
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── env.ts       # Environment config
│   ├── privy.ts     # Privy client setup
│   └── supabase.ts  # Supabase client
├── controllers/     # Route controllers
│   ├── authController.ts
│   └── userController.ts
├── middleware/      # Express middleware
│   └── auth.ts      # Token verification
├── routes/          # API routes
│   ├── authRoutes.ts
│   └── userRoutes.ts
├── services/        # Business logic
│   └── userService.ts
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Production Deployment

### Local Production Testing

1. Build for production:
```bash
pnpm run build
```

2. Run production server locally:
```bash
NODE_ENV=production PORT=8080 npm run start
```

### Deploy to Fly.io

#### Prerequisites
- Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
- Authenticate with Fly: `fly auth login`

#### Initial Setup (First Time Only)
```bash
# Create a new Fly app
fly launch --name your-app-name

# Set environment variables (secrets)
fly secrets set PRIVY_APP_ID="your_privy_app_id"
fly secrets set PRIVY_APP_SECRET="your_privy_app_secret"
fly secrets set SUPABASE_URL="your_supabase_url"
fly secrets set SUPABASE_SERVICE_KEY="your_supabase_service_key"
fly secrets set SUPABASE_BUCKET_NAME="your_bucket_name"
```

#### Deployment Methods

##### Method 1: Direct Deployment (Recommended)
Uses Fly's remote builders for faster deployments:

```bash
# Deploy directly to Fly.io
fly deploy

# Deploy with specific app name
fly deploy --app your-app-name
```

##### Method 2: Local Docker Build
Build Docker image locally before deploying (useful for debugging):

```bash
# Build and deploy using local Docker
fly deploy --local-only

# Or build Docker image separately
docker build -t danz-backend .

# Test locally
docker run -p 8080:8080 --env-file .env danz-backend

# Then deploy
fly deploy --local-only
```

#### Monitoring & Management

```bash
# Check deployment status
fly status

# View logs
fly logs

# SSH into running container
fly ssh console

# Restart app
fly apps restart

# Scale machines
fly scale count 2  # Run 2 instances
```

#### Important Configuration Files

1. **fly.toml** - Fly.io configuration:
   - Internal port: 8080
   - Health check endpoint: /health
   - Auto stop/start settings

2. **Dockerfile** - Container configuration:
   - Node.js 20.18.0
   - Port 8080
   - pnpm for package management

3. **tsconfig.json** - TypeScript configuration:
   - ES modules with .js extensions
   - Module resolution: Node

#### Troubleshooting

If deployment fails:

1. Check logs: `fly logs --app your-app-name`
2. Verify environment variables: `fly secrets list`
3. Test build locally: `npm run build`
4. Ensure all imports use .js extensions for ES modules
5. Verify PORT environment variable is set to 8080

## Security Considerations

- Never commit `.env` file
- Use environment-specific API URLs
- Implement rate limiting for production
- Enable CORS for specific origins only
- Use HTTPS in production
- Rotate Privy app secret regularly

## Future Enhancements

- [ ] Wallet connection support
- [ ] Rate limiting
- [ ] Request logging
- [ ] Error tracking (Sentry)
- [ ] API documentation (Swagger)
- [ ] Testing suite
- [ ] CI/CD pipeline