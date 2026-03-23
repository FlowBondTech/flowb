# Events API

GraphQL operations for event management.

## Types

### Event Type

```graphql
type Event {
  id: ID!
  title: String!
  description: String
  category: EventCategory
  imageUrl: String

  # Location
  locationName: String!
  locationAddress: String
  locationCity: String
  locationLatitude: Float
  locationLongitude: Float
  isVirtual: Boolean!
  virtualLink: String

  # Organizer
  facilitator: User
  facilitatorId: String

  # Capacity
  maxCapacity: Int!
  currentCapacity: Int!
  spotsAvailable: Int!  # Computed

  # Pricing
  priceUsd: Float
  priceDanz: Float
  currency: String!
  isFree: Boolean!  # Computed

  # Schedule
  startDateTime: DateTime!
  endDateTime: DateTime!
  duration: Int!  # Computed (minutes)

  # Metadata
  skillLevel: SkillLevel
  requirements: String
  tags: [String!]
  danceStyles: [String!]
  isFeatured: Boolean!

  # User Context
  isRegistered: Boolean  # Current user registered?
  registration: EventRegistration  # Current user's registration

  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum EventCategory {
  salsa
  hip_hop
  contemporary
  ballet
  jazz
  ballroom
  street
  cultural
  fitness
  class
  social
  battle
  workshop
  performance
  other
}

type EventRegistration {
  id: ID!
  event: Event!
  user: User!
  status: RegistrationStatus!
  paymentStatus: PaymentStatus!
  paymentAmount: Float
  paymentDate: DateTime
  checkedIn: Boolean!
  checkInTime: DateTime
  userNotes: String
  registrationDate: DateTime!
}

enum RegistrationStatus {
  registered
  waitlisted
  cancelled
  attended
  no_show
}

enum PaymentStatus {
  pending
  paid
  refunded
  free
}
```

## Queries

### List Events

<div class="api-method query">QUERY</div>

```graphql
query GetEvents($filters: EventFilters, $limit: Int, $offset: Int) {
  events(filters: $filters, limit: $limit, offset: $offset) {
    id
    title
    category
    imageUrl
    startDateTime
    endDateTime
    locationName
    locationCity
    isVirtual
    facilitator {
      displayName
      avatarUrl
    }
    currentCapacity
    maxCapacity
    spotsAvailable
    priceUsd
    isFree
    isFeatured
    isRegistered
  }
}

input EventFilters {
  category: EventCategory
  city: String
  startDateFrom: DateTime
  startDateTo: DateTime
  skillLevel: SkillLevel
  danceStyles: [String!]
  isVirtual: Boolean
  isFeatured: Boolean
  isFree: Boolean
  facilitatorId: String
  search: String
}
```

**Variables:**

```json
{
  "filters": {
    "category": "salsa",
    "city": "New York",
    "startDateFrom": "2024-01-01T00:00:00Z",
    "isFree": false
  },
  "limit": 20,
  "offset": 0
}
```

### Get Single Event

<div class="api-method query">QUERY</div>

```graphql
query GetEvent($id: ID!) {
  event(id: $id) {
    id
    title
    description
    category
    imageUrl
    startDateTime
    endDateTime
    duration
    locationName
    locationAddress
    locationCity
    locationLatitude
    locationLongitude
    isVirtual
    virtualLink
    facilitator {
      privyId
      displayName
      avatarUrl
      bio
    }
    maxCapacity
    currentCapacity
    spotsAvailable
    priceUsd
    priceDanz
    currency
    isFree
    skillLevel
    requirements
    tags
    danceStyles
    isRegistered
    registration {
      id
      status
      paymentStatus
      checkedIn
      registrationDate
    }
  }
}
```

### Get Featured Events

<div class="api-method query">QUERY</div>

```graphql
query GetFeaturedEvents($limit: Int) {
  featuredEvents(limit: $limit) {
    id
    title
    imageUrl
    startDateTime
    locationCity
    priceUsd
    isFree
  }
}
```

### Get Upcoming Events

<div class="api-method query">QUERY</div>

```graphql
query GetUpcomingEvents($limit: Int) {
  upcomingEvents(limit: $limit) {
    id
    title
    startDateTime
    locationName
    spotsAvailable
  }
}
```

### Get My Registrations

<div class="api-method query">QUERY</div>

```graphql
query GetMyRegistrations($status: RegistrationStatus) {
  myRegistrations(status: $status) {
    id
    status
    paymentStatus
    registrationDate
    checkedIn
    event {
      id
      title
      startDateTime
      endDateTime
      locationName
      imageUrl
    }
  }
}
```

### Get Event Registrations (Organizer)

<div class="api-method query">QUERY</div>

Requires facilitator or admin role.

```graphql
query GetEventRegistrations($eventId: ID!, $status: RegistrationStatus) {
  eventRegistrations(eventId: $eventId, status: $status) {
    id
    status
    paymentStatus
    checkedIn
    checkInTime
    registrationDate
    userNotes
    user {
      privyId
      displayName
      avatarUrl
      email
    }
  }
}
```

## Mutations

### Create Event

<div class="api-method mutation">MUTATION</div>

Requires organizer role.

```graphql
mutation CreateEvent($input: CreateEventInput!) {
  createEvent(input: $input) {
    id
    title
    startDateTime
    locationName
  }
}

input CreateEventInput {
  title: String!
  description: String
  category: EventCategory!
  imageUrl: String
  locationName: String!
  locationAddress: String
  locationCity: String
  locationLatitude: Float
  locationLongitude: Float
  isVirtual: Boolean
  virtualLink: String
  startDateTime: DateTime!
  endDateTime: DateTime!
  maxCapacity: Int
  priceUsd: Float
  priceDanz: Float
  currency: String
  skillLevel: SkillLevel
  requirements: String
  tags: [String!]
  danceStyles: [String!]
}
```

**Variables:**

```json
{
  "input": {
    "title": "Salsa Social Night",
    "description": "Join us for a fun evening of salsa dancing!",
    "category": "social",
    "locationName": "Dance Studio NYC",
    "locationAddress": "123 Dance St",
    "locationCity": "New York",
    "startDateTime": "2024-02-15T19:00:00Z",
    "endDateTime": "2024-02-15T23:00:00Z",
    "maxCapacity": 50,
    "priceUsd": 15.00,
    "skillLevel": "all",
    "danceStyles": ["salsa", "bachata"]
  }
}
```

### Update Event

<div class="api-method mutation">MUTATION</div>

```graphql
mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
  updateEvent(id: $id, input: $input) {
    id
    title
    description
    updatedAt
  }
}

input UpdateEventInput {
  title: String
  description: String
  category: EventCategory
  imageUrl: String
  locationName: String
  locationAddress: String
  locationCity: String
  isVirtual: Boolean
  virtualLink: String
  startDateTime: DateTime
  endDateTime: DateTime
  maxCapacity: Int
  priceUsd: Float
  skillLevel: SkillLevel
  requirements: String
  tags: [String!]
  danceStyles: [String!]
  isFeatured: Boolean
}
```

### Delete Event

<div class="api-method mutation">MUTATION</div>

```graphql
mutation DeleteEvent($id: ID!) {
  deleteEvent(id: $id) {
    success
    message
  }
}
```

### Register for Event

<div class="api-method mutation">MUTATION</div>

```graphql
mutation RegisterForEvent($eventId: ID!, $notes: String) {
  registerForEvent(eventId: $eventId, notes: $notes) {
    id
    status
    paymentStatus
    paymentIntent  # Stripe payment intent for paid events
    event {
      id
      title
      spotsAvailable
    }
  }
}
```

**Response for Paid Event:**

```json
{
  "data": {
    "registerForEvent": {
      "id": "reg-123",
      "status": "registered",
      "paymentStatus": "pending",
      "paymentIntent": {
        "clientSecret": "pi_xxx_secret_xxx",
        "amount": 1500
      }
    }
  }
}
```

### Cancel Registration

<div class="api-method mutation">MUTATION</div>

```graphql
mutation CancelRegistration($registrationId: ID!) {
  cancelRegistration(registrationId: $registrationId) {
    id
    status
    event {
      id
      spotsAvailable
    }
  }
}
```

### Check In Attendee (Organizer)

<div class="api-method mutation">MUTATION</div>

```graphql
mutation CheckInAttendee($registrationId: ID!) {
  checkInAttendee(registrationId: $registrationId) {
    id
    checkedIn
    checkInTime
    status
  }
}
```

### Bulk Check In

<div class="api-method mutation">MUTATION</div>

```graphql
mutation BulkCheckIn($registrationIds: [ID!]!) {
  bulkCheckIn(registrationIds: $registrationIds) {
    success
    checkedInCount
    failedIds
  }
}
```

## Computed Fields

```graphql
type Event {
  # Available spots
  spotsAvailable: Int!  # maxCapacity - currentCapacity

  # Is free event
  isFree: Boolean!  # priceUsd == null || priceUsd == 0

  # Duration in minutes
  duration: Int!  # endDateTime - startDateTime

  # Is past event
  isPast: Boolean!  # endDateTime < now

  # Is happening now
  isLive: Boolean!  # startDateTime <= now <= endDateTime
}
```

## Error Handling

| Error Code | Description |
|------------|-------------|
| `EVENT_NOT_FOUND` | Event doesn't exist |
| `EVENT_FULL` | No spots available |
| `ALREADY_REGISTERED` | User already registered |
| `NOT_REGISTERED` | User not registered |
| `EVENT_PAST` | Cannot register for past event |
| `PAYMENT_REQUIRED` | Payment not completed |
| `NOT_ORGANIZER` | Not the event organizer |

## Examples

### Event Discovery Page

```typescript
import { useGetEventsQuery } from '@/generated/graphql'

function EventsPage() {
  const [filters, setFilters] = useState<EventFilters>({})

  const { data, loading, fetchMore } = useGetEventsQuery({
    variables: {
      filters,
      limit: 20,
      offset: 0,
    },
  })

  const loadMore = () => {
    fetchMore({
      variables: {
        offset: data?.events.length || 0,
      },
    })
  }

  return (
    <div>
      <EventFilters onChange={setFilters} />
      <EventGrid events={data?.events} loading={loading} />
      <LoadMoreButton onClick={loadMore} />
    </div>
  )
}
```

### Registration with Payment

```typescript
import { useRegisterForEventMutation } from '@/generated/graphql'
import { loadStripe } from '@stripe/stripe-js'

async function handleRegister(eventId: string) {
  const { data } = await registerForEvent({
    variables: { eventId },
  })

  const registration = data?.registerForEvent

  if (registration?.paymentIntent) {
    // Paid event - redirect to payment
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!)
    await stripe.confirmPayment({
      clientSecret: registration.paymentIntent.clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/events/${eventId}/success`,
      },
    })
  } else {
    // Free event - registration complete
    router.push(`/events/${eventId}/success`)
  }
}
```

## Next Steps

- [Achievements API](/api/achievements) - Achievement system
- [Social API](/api/social) - Social features
- [Database: Events](/database/events) - Events schema
