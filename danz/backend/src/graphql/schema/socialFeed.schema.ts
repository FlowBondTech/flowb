import { gql } from 'graphql-tag'

export const socialFeedTypeDefs = gql`
  enum MediaType {
    image
    video
  }

  type Post {
    id: ID!
    user_id: String!
    user: User!
    content: String!
    media_url: String
    media_type: MediaType
    event_id: ID
    event: Event
    location: String
    is_public: Boolean!
    likes_count: Int!
    comments_count: Int!
    is_liked_by_me: Boolean!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type PostWithDetails {
    id: ID!
    user_id: String!
    user: User!
    content: String!
    media_url: String
    media_type: MediaType
    event_id: ID
    event: Event
    location: String
    is_public: Boolean!
    likes: [PostLike!]!
    comments: [PostComment!]!
    likes_count: Int!
    comments_count: Int!
    is_liked_by_me: Boolean!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type PostLike {
    id: ID!
    post_id: ID!
    user_id: String!
    user: User!
    created_at: DateTime!
  }

  type PostComment {
    id: ID!
    post_id: ID!
    user_id: String!
    user: User!
    content: String!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type DanceBond {
    id: ID!
    user_id_1: String!
    user_id_2: String!
    user1: User!
    user2: User!
    bond_level: Int!
    shared_events_count: Int!
    total_dances: Int!
    last_dance_date: DateTime
    created_at: DateTime!
    updated_at: DateTime!
  }

  type FeedResponse {
    posts: [Post!]!
    has_more: Boolean!
    cursor: String
  }

  input CreatePostInput {
    content: String!
    media_url: String
    media_type: MediaType
    event_id: ID
    location: String
    is_public: Boolean
  }

  input UpdatePostInput {
    content: String
    media_url: String
    media_type: MediaType
    location: String
    is_public: Boolean
  }

  input CreateCommentInput {
    post_id: ID!
    content: String!
  }

  input CreateDanceBondInput {
    user_id: String!
  }

  extend type Query {
    # Get feed with pagination
    getFeed(limit: Int, cursor: String): FeedResponse!

    # Get a single post with full details
    getPost(id: ID!): PostWithDetails

    # Get user's own posts
    getMyPosts(limit: Int, offset: Int): [Post!]!

    # Get another user's public posts
    getUserPosts(userId: String!, limit: Int, offset: Int): [Post!]!

    # Get posts for a specific event
    getEventPosts(eventId: ID!, limit: Int, offset: Int): [Post!]!

    # Get my dance bonds
    getMyDanceBonds: [DanceBond!]!

    # Get dance bond with specific user
    getDanceBond(userId: String!): DanceBond
  }

  extend type Mutation {
    # Post operations
    createPost(input: CreatePostInput!): Post!
    updatePost(postId: ID!, input: UpdatePostInput!): Post!
    deletePost(postId: ID!): MutationResponse!

    # Like operations
    likePost(postId: ID!): MutationResponse!
    unlikePost(postId: ID!): MutationResponse!

    # Comment operations
    createComment(input: CreateCommentInput!): PostComment!
    updateComment(commentId: ID!, content: String!): PostComment!
    deleteComment(commentId: ID!): MutationResponse!

    # Dance bond operations
    createDanceBond(input: CreateDanceBondInput!): DanceBond!
    deleteDanceBond(bondId: ID!): MutationResponse!
  }
`
