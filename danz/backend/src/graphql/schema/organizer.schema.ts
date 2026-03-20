export const organizerTypeDefs = `#graphql
  type OrganizerApplication {
    id: ID!
    user_id: String!
    user: User

    # Application details
    reason: String!
    experience: String
    venue_name: String
    venue_address: String
    venue_city: String
    venue_capacity: Int
    dance_styles: [String!]
    website_url: String
    social_media: String
    additional_info: String

    # Status
    status: ApplicationStatus!
    admin_notes: String
    reviewed_by: String
    reviewer: User
    reviewed_at: String

    # Timestamps
    created_at: String!
    updated_at: String!
  }

  enum ApplicationStatus {
    pending
    approved
    rejected
  }

  input SubmitOrganizerApplicationInput {
    reason: String!
    experience: String
    venue_name: String
    venue_address: String
    venue_city: String
    venue_capacity: Int
    dance_styles: [String!]
    website_url: String
    social_media: String
    additional_info: String
  }

  input ReviewApplicationInput {
    application_id: ID!
    status: ApplicationStatus!
    admin_notes: String
  }

  type OrganizerApplicationsResponse {
    applications: [OrganizerApplication!]!
    totalCount: Int!
  }

  extend type Query {
    # Get current user's organizer application
    myOrganizerApplication: OrganizerApplication

    # Admin: Get all pending applications
    pendingOrganizerApplications(limit: Int, offset: Int): OrganizerApplicationsResponse!

    # Admin: Get all applications with optional status filter
    organizerApplications(status: ApplicationStatus, limit: Int, offset: Int): OrganizerApplicationsResponse!

    # Admin: Get single application
    organizerApplication(id: ID!): OrganizerApplication
  }

  extend type Mutation {
    # Submit organizer application
    submitOrganizerApplication(input: SubmitOrganizerApplicationInput!): OrganizerApplication!

    # Admin: Review application (approve/reject)
    reviewOrganizerApplication(input: ReviewApplicationInput!): OrganizerApplication!
  }
`
