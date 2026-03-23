# Security Architecture

Security measures and best practices implemented in the DANZ platform.

## Authentication

### Privy Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LAYERS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Client    │────▶│   Privy     │────▶│  Backend    │   │
│  │   (React)   │     │   Service   │     │  (Express)  │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│        │                   │                   │           │
│        │    Login Modal    │                   │           │
│        │◀─────────────────▶│                   │           │
│        │                   │                   │           │
│        │    JWT Token      │                   │           │
│        │◀──────────────────│                   │           │
│        │                   │                   │           │
│        │    GraphQL + JWT  │                   │           │
│        │──────────────────────────────────────▶│           │
│        │                   │                   │           │
│        │                   │    Verify JWT     │           │
│        │                   │◀──────────────────│           │
│        │                   │    Valid ✓        │           │
│        │                   │──────────────────▶│           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### JWT Verification

```typescript
// Backend middleware
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(appId, appSecret)

async function verifyAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const claims = await privy.verifyAuthToken(token)
    req.user = {
      privyId: claims.userId,
      // ... other claims
    }
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

## Authorization

### Role-Based Access Control

| Role | Permissions |
|------|------------|
| **user** | Read own profile, register for events, create posts |
| **organizer** | Create/manage events, view registrations |
| **manager** | Approve organizers, moderate content |
| **admin** | Full system access |

### GraphQL Authorization

```typescript
// Resolver-level authorization
const resolvers = {
  Mutation: {
    createEvent: async (_, args, context) => {
      // Check user is authenticated
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      // Check user is an approved organizer
      const user = await getUser(context.user.privyId)
      if (user.role !== 'organizer' || !user.is_organizer_approved) {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' }
        })
      }

      // Proceed with event creation
      return createEvent(args)
    }
  }
}
```

## Database Security

### Row Level Security (RLS)

Supabase provides Row Level Security for fine-grained access control:

```sql
-- Users can only read their own data
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (privy_id = current_setting('app.current_user')::text);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (privy_id = current_setting('app.current_user')::text);

-- Anyone can read public events
CREATE POLICY "Public events are readable"
ON events FOR SELECT
USING (true);

-- Only facilitators can update their events
CREATE POLICY "Facilitators can update events"
ON events FOR UPDATE
USING (facilitator_id = current_setting('app.current_user')::text);
```

### Service Key Security

::: danger Critical
The Supabase service key bypasses RLS. It should:
- **NEVER** be exposed to the client
- Only be used on the backend
- Be stored securely in environment variables
:::

```typescript
// Backend only - service key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
```

## Input Validation

### GraphQL Input Validation

```typescript
// Schema-level validation
const typeDefs = gql`
  input CreateEventInput {
    title: String! @constraint(minLength: 3, maxLength: 200)
    description: String @constraint(maxLength: 5000)
    maxCapacity: Int @constraint(min: 1, max: 10000)
    priceUsd: Float @constraint(min: 0)
    startDateTime: DateTime!
    endDateTime: DateTime!
  }
`

// Resolver validation
const resolvers = {
  Mutation: {
    createEvent: async (_, { input }, context) => {
      // Additional validation
      if (new Date(input.endDateTime) <= new Date(input.startDateTime)) {
        throw new GraphQLError('End time must be after start time')
      }

      // Sanitize text inputs
      const sanitizedInput = {
        ...input,
        title: sanitizeHtml(input.title),
        description: input.description
          ? sanitizeHtml(input.description)
          : null,
      }

      return createEvent(sanitizedInput)
    }
  }
}
```

### SQL Injection Prevention

All database queries use parameterized queries via Supabase client:

```typescript
// Safe - parameterized query
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('privy_id', privyId)  // Automatically parameterized
  .single()

// Never do this:
// const { data } = await supabase.rpc('raw_query',
//   { query: `SELECT * FROM users WHERE privy_id = '${privyId}'` }
// )
```

## API Security

### Express Security Middleware

```typescript
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'

const app = express()

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://danz.xyz',
    'https://miniapp.danz.xyz',
  ],
  credentials: true,
}))

// Compression
app.use(compression())
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

// General rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests',
})

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts
  message: 'Too many auth attempts',
})

app.use('/graphql', limiter)
```

## Webhook Security

### Stripe Webhook Verification

```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

app.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )

      // Process verified event
      switch (event.type) {
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object)
          break
        // ... other events
      }

      res.json({ received: true })
    } catch (err) {
      console.error('Webhook signature verification failed')
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }
  }
)
```

## File Upload Security

### S3 Presigned URLs

```typescript
// Generate presigned URL for upload
async function getUploadUrl(filename: string, contentType: string) {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(contentType)) {
    throw new Error('Invalid file type')
  }

  // Validate filename
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

  // Generate unique key
  const key = `uploads/${Date.now()}-${sanitizedFilename}`

  // Create presigned URL (expires in 5 minutes)
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Conditions: [
      ['content-length-range', 0, 10 * 1024 * 1024], // Max 10MB
      ['eq', '$Content-Type', contentType],
    ],
    Expires: 300,
  })

  return { url, fields, key }
}
```

## Environment Security

### Environment Variables

::: warning Never Commit Secrets
All sensitive values must be stored in environment variables, never in code.
:::

```bash
# .env.example (safe to commit)
PORT=8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-secret

# .env (never commit)
PORT=8080
SUPABASE_URL=https://actual-project.supabase.co
SUPABASE_SERVICE_KEY=actual-secret-key
PRIVY_APP_ID=actual-app-id
PRIVY_APP_SECRET=actual-secret
```

### .gitignore

```gitignore
# Environment files
.env
.env.local
.env.production

# Secrets
*.pem
*.key
credentials.json
```

## Security Checklist

### Development
- [ ] Never log sensitive data
- [ ] Use parameterized queries
- [ ] Validate all inputs
- [ ] Sanitize HTML output
- [ ] Use HTTPS everywhere

### Deployment
- [ ] Rotate secrets regularly
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set security headers
- [ ] Monitor for anomalies

### Code Review
- [ ] Check for hardcoded secrets
- [ ] Verify authorization checks
- [ ] Review SQL queries
- [ ] Check file upload handling
- [ ] Verify webhook signatures

## Next Steps

- [Database Schema](/database/schema) - Table definitions
- [API Reference](/api/graphql) - GraphQL documentation
- [Deployment](/deployment/infrastructure) - Production setup
