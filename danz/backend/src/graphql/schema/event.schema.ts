import { gql } from 'graphql-tag'

export const eventTypeDefs = gql`
  type Event {
    id: ID!
    title: String!
    description: String
    category: EventCategory
    image_url: String
    location_name: String!
    location_address: String
    location_city: String
    location_latitude: Float
    location_longitude: Float
    facilitator_id: String
    facilitator: User
    max_capacity: Int
    current_capacity: Int
    price_usd: Float
    price_danz: Float
    is_featured: Boolean
    skill_level: SkillLevel
    is_virtual: Boolean
    virtual_link: String
    requirements: String
    tags: [String!]
    dance_styles: [String!]
    currency: String
    start_date_time: DateTime!
    end_date_time: DateTime!
    created_at: DateTime!
    updated_at: DateTime!
    status: EventStatus
    is_registered: Boolean
    user_registration_status: RegistrationStatus
    distance: Float
    registration_count: Int
    participants: [EventRegistration!]
    # Recurring event fields
    is_recurring: Boolean
    recurrence_type: RecurrenceType
    recurrence_end_date: DateTime
    recurrence_days: [String!]
    parent_event_id: ID
    parent_event: Event
    recurrence_count: Int
    recurring_instances: [Event!]
    # Check-in code for self-service check-in
    checkin_code: String
    # Public sharing fields
    slug: String
    is_public: Boolean
    # Sponsor fields (basic event settings - full sponsorship system in sponsor.schema.ts)
    allow_sponsors: Boolean
    sponsor_benefits: String
    sponsor_contact_email: String
    sponsor_tier_config: JSON
    # Note: sponsors and featured_sponsor now come from sponsor.schema.ts EventSponsorship type
    # Access via eventSponsors query or eventFlowPool query
    sponsor_count: Int
  }

  # ============================================================================
  # DEPRECATED: Old EventSponsor type - replaced by comprehensive sponsorship system
  # See: sponsor.schema.ts for new EventSponsorship, Sponsor, and related types
  # ============================================================================

  # type EventSponsor { ... } - REMOVED: Use EventSponsorship from sponsor.schema.ts
  # enum SponsorshipTier { ... } - REMOVED: Use SponsorTier from sponsor.schema.ts
  # enum SponsorStatus { ... } - REMOVED: Use SponsorshipStatus from sponsor.schema.ts

  enum RecurrenceType {
    none
    daily
    weekly
    biweekly
    monthly
  }

  type EventRegistration {
    id: ID!
    event_id: String!
    user_id: String!
    user: User
    event: Event
    status: RegistrationStatus
    registration_date: DateTime
    payment_status: PaymentStatus
    payment_amount: Float
    payment_date: DateTime
    checked_in: Boolean
    check_in_time: DateTime
    user_notes: String
    admin_notes: String
    created_at: DateTime
    updated_at: DateTime
  }

  enum EventStatus {
    upcoming
    ongoing
    past
    cancelled
  }

  extend type Query {
    # Single flexible event query that handles all cases
    events(
      filter: EventFilterInput
      pagination: PaginationInput
      sortBy: EventSortBy
    ): EventConnection!

    # Get single event by ID
    event(id: ID!): Event

    # Get registrations for an event (for organizers)
    eventRegistrations(
      eventId: ID!
      status: RegistrationStatus
    ): [EventRegistration!]!

    # Get event by check-in code (for self-check-in flow)
    eventByCheckinCode(code: String!): Event

    # Get public event by slug (for public event pages - no auth required)
    publicEvent(slug: String!): Event

    # Get list of public events (for public events discovery - no auth required)
    publicEvents(
      filter: EventFilterInput
      pagination: PaginationInput
      sortBy: EventSortBy
    ): EventConnection!
  }

  extend type Mutation {
    # Event mutations
    createEvent(input: CreateEventInput!): Event!
    updateEvent(id: ID!, input: UpdateEventInput!): Event!
    deleteEvent(id: ID!): MutationResponse!
    cancelEvent(id: ID!): Event!

    # Registration mutations
    registerForEvent(
      eventId: ID!
      notes: String
    ): EventRegistration!

    cancelEventRegistration(eventId: ID!): MutationResponse!

    checkInParticipant(
      eventId: ID!
      userId: String!
    ): EventRegistration!

    updateRegistrationStatus(
      eventId: ID!
      userId: String!
      status: RegistrationStatus!
      adminNotes: String
    ): EventRegistration!

    # Self-check-in using event code (for users to check themselves in)
    checkInWithCode(code: String!): CheckInResponse!

    # Regenerate check-in code (for organizers)
    regenerateCheckinCode(eventId: ID!): Event!
  }

  type CheckInResponse {
    success: Boolean!
    message: String!
    event: Event
    registration: EventRegistration
  }

  input CreateEventInput {
    title: String!
    description: String
    category: EventCategory
    image_url: String
    location_name: String!
    location_address: String
    location_city: String
    location_latitude: Float
    location_longitude: Float
    max_capacity: Int
    price_usd: Float
    price_danz: Float
    skill_level: SkillLevel
    is_virtual: Boolean
    virtual_link: String
    requirements: String
    tags: [String!]
    dance_styles: [String!]
    currency: String
    start_date_time: DateTime!
    end_date_time: DateTime!
    is_featured: Boolean
    # Recurring event fields
    is_recurring: Boolean
    recurrence_type: RecurrenceType
    recurrence_end_date: DateTime
    recurrence_days: [String!]
    recurrence_count: Int
    # Public sharing
    is_public: Boolean
    # Sponsor settings
    allow_sponsors: Boolean
    sponsor_benefits: String
    sponsor_contact_email: String
    sponsor_tier_config: JSON
  }

  input UpdateEventInput {
    title: String
    description: String
    category: EventCategory
    image_url: String
    location_name: String
    location_address: String
    location_city: String
    location_latitude: Float
    location_longitude: Float
    max_capacity: Int
    price_usd: Float
    price_danz: Float
    skill_level: SkillLevel
    is_virtual: Boolean
    virtual_link: String
    requirements: String
    tags: [String!]
    dance_styles: [String!]
    currency: String
    start_date_time: DateTime
    end_date_time: DateTime
    is_featured: Boolean
    # Recurring event fields
    is_recurring: Boolean
    recurrence_type: RecurrenceType
    recurrence_end_date: DateTime
    recurrence_days: [String!]
    recurrence_count: Int
    # Public sharing
    is_public: Boolean
    # Sponsor settings
    allow_sponsors: Boolean
    sponsor_benefits: String
    sponsor_contact_email: String
    sponsor_tier_config: JSON
  }

  # ============================================================================
  # DEPRECATED: Old Sponsor Management - replaced by comprehensive sponsorship system
  # See: sponsor.schema.ts for full sponsorship API including:
  #   - eventSponsors query (returns [EventSponsorship!]!)
  #   - createEventSponsorship, updateEventSponsorship mutations
  #   - reviewSponsorshipApproval for approval workflow
  #   - Full subscription sponsorship support
  # ============================================================================

  # Old queries/mutations REMOVED - use sponsor.schema.ts equivalents

  input EventFilterInput {
    # Basic filters
    category: EventCategory
    skill_level: SkillLevel
    city: String
    dance_style: String
    is_virtual: Boolean
    is_featured: Boolean

    # User-specific filters
    facilitator_id: String      # Events by specific organizer (deprecated, use created_by)
    created_by: String           # Events created by specific user ID
    registered_by: String        # Events that specific user is registered for
    created_by_me: Boolean       # Events created by current authenticated user (requires auth)
    registered_by_me: Boolean    # Events current authenticated user is registered for (requires auth)

    # Status and time filters
    status: EventStatus          # upcoming, ongoing, past, cancelled
    minPrice: Float
    maxPrice: Float
    startDate: DateTime
    endDate: DateTime

    # Location-based filtering
    nearLocation: LocationInput

    # Recurring event filters
    is_recurring: Boolean        # Filter for recurring events only
    exclude_instances: Boolean   # Exclude child instances, show only parent recurring events
  }

  input LocationInput {
    latitude: Float!
    longitude: Float!
    radius: Float               # Radius in km, default 50
  }

  enum EventSortBy {
    date_asc
    date_desc
    price_asc
    price_desc
    title_asc
    title_desc
    created_at_desc
  }

  type EventConnection {
    events: [Event!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }
`
