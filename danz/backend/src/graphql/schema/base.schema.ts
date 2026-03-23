import { gql } from 'graphql-tag'

export const baseTypeDefs = gql`
  scalar DateTime
  scalar JSON

  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }

  type Subscription {
    _empty: String
  }

  enum UserRole {
    user
    organizer
    manager
    dev
    admin
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

  enum SkillLevel {
    all
    beginner
    intermediate
    advanced
  }

  enum PaymentStatus {
    pending
    paid
    refunded
    free
  }

  enum RegistrationStatus {
    registered
    cancelled
    attended
    no_show
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  input PaginationInput {
    limit: Int
    offset: Int
    cursor: String
  }

  type MutationResponse {
    success: Boolean!
    message: String
    code: String
  }
`
