import { gql } from 'graphql-tag'

export const eventManagerTypeDefs = gql`
  # ========================================
  # EVENT MANAGER TYPES
  # ========================================

  type EventManager {
    id: ID!
    event_id: ID!
    user_id: String!
    role: EventManagerRole!

    # Permissions
    can_edit_details: Boolean!
    can_manage_registrations: Boolean!
    can_send_broadcasts: Boolean!
    can_manage_posts: Boolean!
    can_invite_managers: Boolean!
    can_delete_event: Boolean!

    # Invitation status
    status: EventManagerStatus!
    invited_by: String
    invited_at: DateTime
    accepted_at: DateTime

    # Metadata
    created_at: DateTime!
    updated_at: DateTime

    # Relationships
    event: Event
    user: User
    inviter: User
  }

  type EventManagerConnection {
    managers: [EventManager!]!
    total_count: Int!
  }

  type EventManagerPermissions {
    can_edit_details: Boolean!
    can_manage_registrations: Boolean!
    can_send_broadcasts: Boolean!
    can_manage_posts: Boolean!
    can_invite_managers: Boolean!
    can_delete_event: Boolean!
  }

  # ========================================
  # ENUMS
  # ========================================

  enum EventManagerRole {
    creator
    manager
    moderator
  }

  enum EventManagerStatus {
    pending
    active
    declined
    removed
  }

  # ========================================
  # INPUTS
  # ========================================

  input InviteEventManagerInput {
    event_id: ID!
    user_id: String!
    role: EventManagerRole = manager
    can_edit_details: Boolean = true
    can_manage_registrations: Boolean = true
    can_send_broadcasts: Boolean = true
    can_manage_posts: Boolean = false
    can_invite_managers: Boolean = false
  }

  input UpdateEventManagerInput {
    manager_id: ID!
    role: EventManagerRole
    can_edit_details: Boolean
    can_manage_registrations: Boolean
    can_send_broadcasts: Boolean
    can_manage_posts: Boolean
    can_invite_managers: Boolean
  }

  # ========================================
  # QUERIES
  # ========================================

  extend type Query {
    # Get all managers for an event
    eventManagers(event_id: ID!): EventManagerConnection!

    # Get single manager by ID
    eventManager(id: ID!): EventManager

    # Get current user's manager role for an event
    myEventManagerRole(event_id: ID!): EventManager

    # Get all events where current user is a manager
    myManagedEvents: [Event!]!

    # Check if current user has specific permission for an event
    checkEventPermission(
      event_id: ID!
      permission: String!
    ): Boolean!
  }

  # ========================================
  # MUTATIONS
  # ========================================

  extend type Mutation {
    # Invite a user to be an event manager
    inviteEventManager(input: InviteEventManagerInput!): EventManager!

    # Accept manager invitation
    acceptManagerInvitation(manager_id: ID!): EventManager!

    # Decline manager invitation
    declineManagerInvitation(manager_id: ID!): EventManager!

    # Update manager permissions
    updateEventManager(input: UpdateEventManagerInput!): EventManager!

    # Remove a manager from an event
    removeEventManager(manager_id: ID!): MutationResponse!

    # Leave as manager (self-remove)
    leaveEventAsManager(event_id: ID!): MutationResponse!

    # Transfer creator role to another manager
    transferEventOwnership(
      event_id: ID!
      new_creator_id: String!
    ): EventManager!
  }
`
