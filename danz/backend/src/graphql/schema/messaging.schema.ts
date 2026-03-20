export const messagingTypeDefs = `#graphql
  # ==================== ENUMS ====================

  enum MessageContentType {
    text
    image
    file
    system
  }

  enum ConversationParticipantRole {
    admin
    member
  }

  # ==================== TYPES ====================

  type Conversation {
    id: ID!
    title: String
    is_group: Boolean!

    # Participants
    participants: [ConversationParticipant!]!
    participant_count: Int!

    # Last message info
    last_message_at: DateTime
    last_message_preview: String
    last_message: Message

    # Current user's context
    my_unread_count: Int!
    is_muted: Boolean!
    is_archived: Boolean!

    # Metadata
    created_at: DateTime!
    updated_at: DateTime
    created_by: User
  }

  type ConversationParticipant {
    id: ID!
    user: User!
    nickname: String
    is_muted: Boolean!
    is_archived: Boolean!
    role: ConversationParticipantRole!
    unread_count: Int!
    last_read_at: DateTime
    joined_at: DateTime!
  }

  type Message {
    id: ID!
    conversation_id: ID!
    sender: User!

    # Content
    content: String!
    content_type: MessageContentType!

    # Media
    media_url: String
    media_type: String
    media_metadata: JSON

    # Threading
    reply_to: Message

    # Status
    is_edited: Boolean!
    edited_at: DateTime
    is_deleted: Boolean!

    # Engagement
    reactions: [MessageReaction!]!
    reaction_counts: JSON
    read_by_count: Int!
    is_read_by_me: Boolean!

    # Metadata
    created_at: DateTime!
  }

  type MessageReaction {
    id: ID!
    emoji: String!
    user: User!
    created_at: DateTime!
  }

  type UserBlock {
    id: ID!
    blocked_user: User!
    reason: String
    created_at: DateTime!
  }

  # ==================== CONNECTIONS ====================

  type ConversationConnection {
    conversations: [Conversation!]!
    total_count: Int!
    unread_conversations: Int!
    has_more: Boolean!
  }

  type MessageConnection {
    messages: [Message!]!
    total_count: Int!
    has_more: Boolean!
    oldest_message_id: ID
    newest_message_id: ID
  }

  # ==================== INPUTS ====================

  input StartConversationInput {
    "User ID to start conversation with (for DMs)"
    recipient_id: String

    "User IDs for group conversations"
    participant_ids: [String!]

    "Optional title for group conversations"
    title: String

    "Initial message content"
    initial_message: String
  }

  input SendMessageInput {
    conversation_id: ID!
    content: String!
    content_type: MessageContentType
    media_url: String
    media_type: String
    reply_to_id: ID
    metadata: JSON
  }

  input UpdateMessageInput {
    content: String!
  }

  input ConversationFilter {
    is_archived: Boolean
    is_muted: Boolean
    is_group: Boolean
    has_unread: Boolean
    search: String
  }

  input AddParticipantsInput {
    conversation_id: ID!
    user_ids: [String!]!
  }

  input UpdateConversationInput {
    title: String
    is_muted: Boolean
    is_archived: Boolean
    nickname: String
  }

  # ==================== QUERIES ====================

  extend type Query {
    # Conversations
    myConversations(
      filter: ConversationFilter
      limit: Int
      offset: Int
    ): ConversationConnection!

    conversation(id: ID!): Conversation

    "Get or create a DM conversation with a user"
    dmConversation(user_id: String!): Conversation

    # Messages
    messages(
      conversation_id: ID!
      limit: Int
      before_id: ID
      after_id: ID
    ): MessageConnection!

    message(id: ID!): Message

    # Search
    searchMessages(
      query: String!
      conversation_id: ID
      limit: Int
    ): MessageConnection!

    # Blocks
    myBlockedUsers: [UserBlock!]!
    isUserBlocked(user_id: String!): Boolean!

    # Stats
    unreadMessageCount: Int!
  }

  # ==================== MUTATIONS ====================

  extend type Mutation {
    # Conversations
    startConversation(input: StartConversationInput!): Conversation!
    updateConversation(id: ID!, input: UpdateConversationInput!): Conversation!
    leaveConversation(id: ID!): Boolean!
    deleteConversation(id: ID!): Boolean!

    # Group management
    addParticipants(input: AddParticipantsInput!): Conversation!
    removeParticipant(conversation_id: ID!, user_id: String!): Conversation!
    promoteToAdmin(conversation_id: ID!, user_id: String!): Conversation!

    # Messages
    sendMessage(input: SendMessageInput!): Message!
    updateMessage(id: ID!, input: UpdateMessageInput!): Message!
    deleteMessage(id: ID!): Boolean!

    # Read status
    markConversationRead(conversation_id: ID!): Conversation!
    markMessageRead(message_id: ID!): Message!

    # Reactions
    addReaction(message_id: ID!, emoji: String!): Message!
    removeReaction(message_id: ID!, emoji: String!): Message!

    # Blocking
    blockUser(user_id: String!, reason: String): UserBlock!
    unblockUser(user_id: String!): Boolean!
  }

  # ==================== SUBSCRIPTIONS ====================

  extend type Subscription {
    "New message in any of user's conversations"
    messageReceived: Message!

    "Message updated or deleted"
    messageUpdated(conversation_id: ID!): Message!

    "Conversation updated (new participant, title change, etc)"
    conversationUpdated: Conversation!

    "Typing indicator"
    userTyping(conversation_id: ID!): TypingIndicator!
  }

  type TypingIndicator {
    conversation_id: ID!
    user: User!
    is_typing: Boolean!
  }
`
