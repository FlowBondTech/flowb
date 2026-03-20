export const devTypeDefs = `#graphql
  # ==================== ENUMS ====================

  enum FeatureRequestCategory {
    enhancement
    bug
    performance
    security
    ux
    integration
  }

  enum FeatureRequestStatus {
    requested
    under_review
    planned
    in_progress
    testing
    completed
    rejected
    deferred
  }

  enum TaskPriority {
    critical
    high
    medium
    low
    nice_to_have
  }

  enum DevTaskType {
    task
    bug
    tech_debt
    hotfix
    research
    documentation
  }

  enum DevTaskStatus {
    todo
    in_progress
    review
    testing
    done
    blocked
  }

  enum ChangelogCategory {
    feature
    fix
    improvement
    breaking
    security
    performance
    deprecation
  }

  # ==================== Feature Inventory Enums ====================

  enum FeatureInventoryCategory {
    user_management
    events
    social
    payments
    referral
    dance_sessions
    notifications
    admin
    developer
    miniapps
    analytics
    integrations
  }

  enum FeatureImplementationStatus {
    not_started
    planned
    in_progress
    partially_implemented
    implemented
    needs_refactor
  }

  enum ComponentStatus {
    not_started
    partial
    complete
  }

  # ==================== Project Enums ====================

  enum ProjectType {
    app
    backend
    library
    docs
  }

  enum ProjectPlatform {
    web
    mobile
    telegram
    api
    admin
  }

  # ==================== Dev Alert Enums ====================

  enum DevAlertType {
    info
    warning
    error
    critical
    success
    system
  }

  enum DevAlertCategory {
    general
    deployment
    security
    performance
    database
    api
    payment
    user_report
    feature_request
    system
  }

  enum DevAlertPriority {
    low
    normal
    high
    urgent
  }

  # ==================== TYPES ====================

  type Project {
    id: ID!
    name: String!
    slug: String!
    description: String

    # Repository info
    github_repo: String
    github_org: String
    default_branch: String

    # Project type
    project_type: ProjectType!
    platform: ProjectPlatform

    # Tech stack
    tech_stack: [String!]

    # Status
    is_active: Boolean!
    is_archived: Boolean!

    # Display
    color: String
    icon: String
    display_order: Int

    # Stats (computed)
    feature_count: Int
    task_count: Int
    open_task_count: Int

    created_at: DateTime!
    updated_at: DateTime!
  }

  type FeatureRequest {
    id: ID!
    title: String!
    description: String
    category: FeatureRequestCategory!
    project: Project
    project_id: ID
    status: FeatureRequestStatus!
    priority: TaskPriority
    votes: Int!

    requested_by: User
    requested_at: DateTime!
    assigned_to: User
    assigned_at: DateTime

    estimated_hours: Int
    actual_hours: Int
    target_version: String
    completed_at: DateTime

    github_issue_url: String
    github_pr_url: String
    tags: [String!]

    comments: [FeatureRequestComment!]
    user_vote: String

    created_at: DateTime!
    updated_at: DateTime!
  }

  type FeatureRequestComment {
    id: ID!
    content: String!
    user: User
    is_internal: Boolean!
    created_at: DateTime!
  }

  type FeatureRequestConnection {
    requests: [FeatureRequest!]!
    total_count: Int!
    has_more: Boolean!
  }

  type DevTask {
    id: ID!
    title: String!
    description: String
    task_type: DevTaskType!
    status: DevTaskStatus!
    priority: TaskPriority!
    project: Project
    project_id: ID

    assigned_to: User
    created_by: User

    due_date: String
    estimated_hours: Int
    actual_hours: Int
    started_at: DateTime
    completed_at: DateTime

    feature_request: FeatureRequest
    parent_task: DevTask
    subtasks: [DevTask!]

    github_issue_url: String
    github_pr_url: String
    tags: [String!]
    sprint: String

    created_at: DateTime!
    updated_at: DateTime!
  }

  type DevTaskConnection {
    tasks: [DevTask!]!
    total_count: Int!
    has_more: Boolean!
  }

  type ChangelogEntry {
    id: ID!
    version: String!
    title: String!
    description: String
    category: ChangelogCategory!
    project: Project
    project_id: ID

    feature_request: FeatureRequest
    github_pr_url: String
    github_commit_sha: String

    is_public: Boolean!
    is_highlighted: Boolean!

    created_by: User
    created_at: DateTime!
  }

  type ChangelogVersion {
    version: String!
    release_date: DateTime!
    entries: [ChangelogEntry!]!
    is_current: Boolean!
  }

  # GitHub Types
  type GitHubCommit {
    sha: String!
    message: String!
    author: String!
    author_avatar: String
    date: DateTime!
    url: String!
    additions: Int
    deletions: Int
  }

  type GitHubPullRequest {
    number: Int!
    title: String!
    state: String!
    author: String!
    author_avatar: String
    created_at: DateTime!
    merged_at: DateTime
    closed_at: DateTime
    url: String!
    additions: Int
    deletions: Int
    changed_files: Int
    labels: [String!]
    draft: Boolean
  }

  type GitHubAction {
    id: ID!
    name: String!
    status: String!
    conclusion: String
    workflow_name: String!
    branch: String!
    commit_sha: String!
    started_at: DateTime!
    completed_at: DateTime
    url: String!
    duration_seconds: Int
  }

  type GitHubRelease {
    id: ID!
    tag_name: String!
    name: String!
    body: String
    published_at: DateTime!
    author: String!
    author_avatar: String
    url: String!
    prerelease: Boolean!
    draft: Boolean!
  }

  type GitHubRepo {
    name: String!
    full_name: String!
    description: String
    stars: Int!
    forks: Int!
    open_issues: Int!
    open_prs: Int
    last_push: DateTime!
    default_branch: String!
    url: String!
  }

  type GitHubRateLimit {
    limit: Int!
    remaining: Int!
    reset_at: DateTime!
    used: Int!
  }

  type SystemHealth {
    service: String!
    status: String!
    response_time_ms: Int
    last_checked: DateTime!
    error_message: String
    details: JSON
  }

  type DevDashboardStats {
    # Feature Requests
    total_feature_requests: Int!
    pending_requests: Int!
    in_progress_requests: Int!
    completed_requests: Int!

    # Dev Tasks
    total_tasks: Int!
    todo_tasks: Int!
    in_progress_tasks: Int!
    blocked_tasks: Int!

    # Changelog
    total_changelog_entries: Int!
    latest_version: String

    # GitHub (if available)
    github_open_prs: Int
    github_open_issues: Int
    github_rate_limit: GitHubRateLimit

    # Feature Inventory
    total_features: Int
    implemented_features: Int
    in_progress_features: Int
    planned_features: Int

    # Dev Alerts
    unread_alerts: Int
    critical_alerts: Int
  }

  # ==================== Feature Inventory Types ====================

  type FeatureInventory {
    id: ID!
    name: String!
    slug: String!
    description: String
    category: FeatureInventoryCategory!
    status: FeatureImplementationStatus!
    completion_percentage: Int!
    priority: TaskPriority
    project: Project
    project_id: ID

    # Component status
    backend_status: ComponentStatus!
    frontend_status: ComponentStatus!
    database_status: ComponentStatus!

    # Documentation
    api_docs_url: String
    related_files: [String!]
    dependencies: [String!]
    notes: String

    # Miniapp relevance
    is_miniapp_ready: Boolean!
    miniapp_api_available: Boolean!

    # Metadata
    estimated_hours: Int
    actual_hours: Int
    target_version: String

    created_at: DateTime!
    updated_at: DateTime!
  }

  type FeatureInventoryConnection {
    features: [FeatureInventory!]!
    total_count: Int!
    has_more: Boolean!
  }

  type FeatureInventoryStats {
    total: Int!
    by_status: JSON!
    by_category: JSON!
    miniapp_ready_count: Int!
    average_completion: Float!
  }

  # ==================== Dev Alert Types ====================

  type DevAlert {
    id: ID!
    title: String!
    message: String!
    alert_type: DevAlertType!
    category: DevAlertCategory!
    priority: DevAlertPriority!
    project: Project
    project_id: ID

    # Targeting
    target_roles: [String!]
    target_users: [String!]

    # Status
    is_read: Boolean!
    is_dismissed: Boolean!
    is_actionable: Boolean!
    action_url: String
    action_label: String

    # Expiration
    expires_at: DateTime

    # Source tracking
    source_type: String
    source_id: String
    metadata: JSON

    created_at: DateTime!
  }

  type DevAlertConnection {
    alerts: [DevAlert!]!
    total_count: Int!
    unread_count: Int!
    has_more: Boolean!
  }

  # ==================== INPUTS ====================

  input CreateFeatureRequestInput {
    title: String!
    description: String
    category: FeatureRequestCategory!
    priority: TaskPriority
    tags: [String!]
    project_id: ID
  }

  input UpdateFeatureRequestInput {
    title: String
    description: String
    category: FeatureRequestCategory
    status: FeatureRequestStatus
    priority: TaskPriority
    assigned_to: String
    estimated_hours: Int
    actual_hours: Int
    target_version: String
    github_issue_url: String
    github_pr_url: String
    tags: [String!]
    project_id: ID
  }

  input CreateDevTaskInput {
    title: String!
    description: String
    task_type: DevTaskType!
    priority: TaskPriority!
    assigned_to: String
    due_date: String
    estimated_hours: Int
    feature_request_id: String
    parent_task_id: String
    github_issue_url: String
    tags: [String!]
    sprint: String
    project_id: ID
  }

  input UpdateDevTaskInput {
    title: String
    description: String
    task_type: DevTaskType
    status: DevTaskStatus
    priority: TaskPriority
    assigned_to: String
    due_date: String
    estimated_hours: Int
    actual_hours: Int
    github_issue_url: String
    github_pr_url: String
    tags: [String!]
    sprint: String
    project_id: ID
  }

  input CreateChangelogEntryInput {
    version: String!
    title: String!
    description: String
    category: ChangelogCategory!
    feature_request_id: String
    github_pr_url: String
    github_commit_sha: String
    is_public: Boolean
    is_highlighted: Boolean
    project_id: ID
  }

  input UpdateChangelogEntryInput {
    version: String
    title: String
    description: String
    category: ChangelogCategory
    feature_request_id: String
    github_pr_url: String
    github_commit_sha: String
    is_public: Boolean
    is_highlighted: Boolean
    project_id: ID
  }

  input FeatureRequestFilter {
    status: [FeatureRequestStatus!]
    category: [FeatureRequestCategory!]
    priority: [TaskPriority!]
    assigned_to: String
    requested_by: String
    search: String
    project_id: ID
  }

  input DevTaskFilter {
    status: [DevTaskStatus!]
    task_type: [DevTaskType!]
    priority: [TaskPriority!]
    assigned_to: String
    sprint: String
    search: String
    project_id: ID
  }

  # ==================== Feature Inventory Inputs ====================

  input FeatureInventoryFilter {
    category: [FeatureInventoryCategory!]
    status: [FeatureImplementationStatus!]
    priority: [TaskPriority!]
    is_miniapp_ready: Boolean
    miniapp_api_available: Boolean
    search: String
    project_id: ID
  }

  input CreateFeatureInventoryInput {
    name: String!
    slug: String!
    description: String
    category: FeatureInventoryCategory!
    status: FeatureImplementationStatus
    completion_percentage: Int
    priority: TaskPriority
    backend_status: ComponentStatus
    frontend_status: ComponentStatus
    database_status: ComponentStatus
    api_docs_url: String
    related_files: [String!]
    dependencies: [String!]
    notes: String
    is_miniapp_ready: Boolean
    miniapp_api_available: Boolean
    estimated_hours: Int
    target_version: String
    project_id: ID
  }

  input UpdateFeatureInventoryInput {
    name: String
    description: String
    category: FeatureInventoryCategory
    status: FeatureImplementationStatus
    completion_percentage: Int
    priority: TaskPriority
    backend_status: ComponentStatus
    frontend_status: ComponentStatus
    database_status: ComponentStatus
    api_docs_url: String
    related_files: [String!]
    dependencies: [String!]
    notes: String
    is_miniapp_ready: Boolean
    miniapp_api_available: Boolean
    estimated_hours: Int
    actual_hours: Int
    target_version: String
    project_id: ID
  }

  # ==================== Dev Alert Inputs ====================

  input DevAlertFilter {
    alert_type: [DevAlertType!]
    category: [DevAlertCategory!]
    priority: [DevAlertPriority!]
    is_read: Boolean
    is_dismissed: Boolean
    project_id: ID
  }

  input CreateDevAlertInput {
    title: String!
    message: String!
    alert_type: DevAlertType!
    category: DevAlertCategory
    priority: DevAlertPriority
    target_roles: [String!]
    target_users: [String!]
    is_actionable: Boolean
    action_url: String
    action_label: String
    expires_at: DateTime
    source_type: String
    source_id: String
    metadata: JSON
    project_id: ID
  }

  # ==================== Project Inputs ====================

  input CreateProjectInput {
    name: String!
    slug: String!
    description: String
    github_repo: String
    github_org: String
    default_branch: String
    project_type: ProjectType!
    platform: ProjectPlatform
    tech_stack: [String!]
    color: String
    icon: String
    display_order: Int
  }

  input UpdateProjectInput {
    name: String
    description: String
    github_repo: String
    github_org: String
    default_branch: String
    project_type: ProjectType
    platform: ProjectPlatform
    tech_stack: [String!]
    is_active: Boolean
    is_archived: Boolean
    color: String
    icon: String
    display_order: Int
  }

  # ==================== QUERIES ====================

  extend type Query {
    # Projects
    projects(include_archived: Boolean): [Project!]!
    project(id: ID!): Project
    projectBySlug(slug: String!): Project

    # Dev Dashboard (dev/admin only)
    devDashboardStats: DevDashboardStats
    systemHealth: [SystemHealth!]!

    # Feature Requests
    featureRequests(
      filter: FeatureRequestFilter
      limit: Int
      offset: Int
      sort_by: String
    ): FeatureRequestConnection!

    featureRequest(id: ID!): FeatureRequest
    topVotedFeatures(limit: Int): [FeatureRequest!]!

    # Dev Tasks (dev/admin only)
    devTasks(
      filter: DevTaskFilter
      limit: Int
      offset: Int
      sort_by: String
    ): DevTaskConnection!

    devTask(id: ID!): DevTask
    myDevTasks: [DevTask!]!
    sprintTasks(sprint: String!): [DevTask!]!

    # Changelog (public for is_public entries)
    changelog(limit: Int, offset: Int, include_private: Boolean): [ChangelogVersion!]!
    latestChangelog: ChangelogVersion
    changelogEntry(id: ID!): ChangelogEntry

    # GitHub Integration (dev/admin only)
    githubCommits(repo: String!, branch: String, limit: Int): [GitHubCommit!]!
    githubPullRequests(repo: String!, state: String, limit: Int): [GitHubPullRequest!]!
    githubActions(repo: String!, limit: Int): [GitHubAction!]!
    githubReleases(repo: String!, limit: Int): [GitHubRelease!]!
    githubRepos: [GitHubRepo!]!
    githubRateLimit: GitHubRateLimit

    # Feature Inventory (dev/admin only)
    featureInventory(
      filter: FeatureInventoryFilter
      limit: Int
      offset: Int
      sort_by: String
    ): FeatureInventoryConnection!
    featureInventoryItem(id: ID!): FeatureInventory
    featureInventoryBySlug(slug: String!): FeatureInventory
    featureInventoryStats: FeatureInventoryStats!
    miniappReadyFeatures: [FeatureInventory!]!

    # Dev Alerts (dev/admin only)
    devAlerts(
      filter: DevAlertFilter
      limit: Int
      offset: Int
    ): DevAlertConnection!
    devAlert(id: ID!): DevAlert
    myDevAlerts(limit: Int, include_dismissed: Boolean): DevAlertConnection!
  }

  # ==================== MUTATIONS ====================

  extend type Mutation {
    # Projects (admin only)
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!

    # Feature Requests
    createFeatureRequest(input: CreateFeatureRequestInput!): FeatureRequest!
    updateFeatureRequest(id: ID!, input: UpdateFeatureRequestInput!): FeatureRequest!
    deleteFeatureRequest(id: ID!): Boolean!

    voteFeatureRequest(id: ID!, vote: String!): FeatureRequest!
    removeFeatureRequestVote(id: ID!): FeatureRequest!

    addFeatureRequestComment(
      feature_request_id: ID!
      content: String!
      is_internal: Boolean
    ): FeatureRequestComment!
    deleteFeatureRequestComment(id: ID!): Boolean!

    # Dev Tasks (dev/admin only)
    createDevTask(input: CreateDevTaskInput!): DevTask!
    updateDevTask(id: ID!, input: UpdateDevTaskInput!): DevTask!
    deleteDevTask(id: ID!): Boolean!

    startTask(id: ID!): DevTask!
    completeTask(id: ID!, actual_hours: Int): DevTask!
    blockTask(id: ID!, reason: String): DevTask!

    # Changelog (dev/admin only)
    createChangelogEntry(input: CreateChangelogEntryInput!): ChangelogEntry!
    updateChangelogEntry(id: ID!, input: UpdateChangelogEntryInput!): ChangelogEntry!
    deleteChangelogEntry(id: ID!): Boolean!

    # GitHub Actions (admin only)
    triggerGitHubAction(repo: String!, workflow_id: String!, ref: String): Boolean!

    # System (admin only)
    checkSystemHealth: [SystemHealth!]!
    clearGitHubCache(cache_key: String): Boolean!

    # Feature Inventory (dev/admin only)
    createFeatureInventory(input: CreateFeatureInventoryInput!): FeatureInventory!
    updateFeatureInventory(id: ID!, input: UpdateFeatureInventoryInput!): FeatureInventory!
    deleteFeatureInventory(id: ID!): Boolean!

    # Dev Alerts (dev/admin only)
    createDevAlert(input: CreateDevAlertInput!): DevAlert!
    markAlertRead(id: ID!): DevAlert!
    markAlertDismissed(id: ID!): DevAlert!
    markAllAlertsRead: Boolean!
    deleteDevAlert(id: ID!): Boolean!
  }
`
