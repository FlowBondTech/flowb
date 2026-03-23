'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
import { gql, useMutation, useQuery } from '@apollo/client'
import { useAuth } from '@/src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCode,
  FiDatabase,
  FiFolder,
  FiGitBranch,
  FiGitPullRequest,
  FiList,
  FiMessageSquare,
  FiPlus,
  FiRefreshCw,
  FiServer,
  FiSettings,
  FiSmartphone,
  FiTag,
  FiTrendingUp,
  FiUser,
  FiX,
  FiZap,
} from 'react-icons/fi'

// Manual GraphQL queries until codegen is updated with backend deployment
const GET_DEV_DASHBOARD_STATS = gql`
  query GetDevDashboardStats {
    devDashboardStats {
      total_feature_requests
      pending_requests
      in_progress_requests
      completed_requests
      total_tasks
      todo_tasks
      in_progress_tasks
      blocked_tasks
      total_changelog_entries
      latest_version
      github_open_prs
      github_open_issues
      github_rate_limit {
        limit
        remaining
        reset_at
        used
      }
    }
  }
`

const GET_SYSTEM_HEALTH = gql`
  query GetSystemHealth {
    systemHealth {
      service
      status
      response_time_ms
      last_checked
      error_message
    }
  }
`

const GET_DEV_TASKS = gql`
  query GetDevTasks($filter: DevTaskFilter, $limit: Int, $offset: Int) {
    devTasks(filter: $filter, limit: $limit, offset: $offset) {
      tasks {
        id
        title
        description
        task_type
        status
        priority
        assigned_to {
          id
          username
          display_name
          avatar_url
        }
        due_date
        estimated_hours
        sprint
        tags
        created_at
        updated_at
      }
      total_count
      has_more
    }
  }
`

const UPDATE_DEV_TASK = gql`
  mutation UpdateDevTask($id: ID!, $input: UpdateDevTaskInput!) {
    updateDevTask(id: $id, input: $input) {
      id
      status
      updated_at
    }
  }
`

const CREATE_DEV_TASK = gql`
  mutation CreateDevTask($input: CreateDevTaskInput!) {
    createDevTask(input: $input) {
      id
      title
      description
      task_type
      status
      priority
      sprint
      created_at
    }
  }
`

const GET_PROJECTS = gql`
  query GetProjects($include_archived: Boolean) {
    projects(include_archived: $include_archived) {
      id
      name
      slug
      description
      github_repo
      github_org
      project_type
      platform
      tech_stack
      is_active
      is_archived
      color
      icon
      display_order
      feature_count
      task_count
      open_task_count
      created_at
      updated_at
    }
  }
`

interface SystemHealth {
  service: string
  status: string
  response_time_ms: number | null
  last_checked: string
  error_message: string | null
}

interface DevTask {
  id: string
  title: string
  description: string | null
  task_type: string
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
  due_date: string | null
  estimated_hours: number | null
  sprint: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

interface DevTasksData {
  devTasks: {
    tasks: DevTask[]
    total_count: number
    has_more: boolean
  }
}

interface DevStats {
  total_feature_requests: number
  pending_requests: number
  in_progress_requests: number
  completed_requests: number
  total_tasks: number
  todo_tasks: number
  in_progress_tasks: number
  blocked_tasks: number
  total_changelog_entries: number
  latest_version: string | null
  github_open_prs: number | null
  github_open_issues: number | null
  github_rate_limit: {
    limit: number
    remaining: number
    reset_at: string
    used: number
  } | null
}

interface Project {
  id: string
  name: string
  slug: string
  description: string | null
  github_repo: string | null
  github_org: string | null
  project_type: string
  platform: string | null
  tech_stack: string[] | null
  is_active: boolean
  is_archived: boolean
  color: string | null
  icon: string | null
  display_order: number
  feature_count: number
  task_count: number
  open_task_count: number
  created_at: string
  updated_at: string
}

interface ProjectsData {
  projects: Project[]
}

// Task status columns for kanban
const TASK_COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'gray' },
  { id: 'in_progress', label: 'In Progress', color: 'blue' },
  { id: 'blocked', label: 'Blocked', color: 'red' },
  { id: 'done', label: 'Done', color: 'green' },
] as const

const PRIORITY_COLORS = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const TASK_TYPE_ICONS: Record<string, string> = {
  feature: '✨',
  bug: '🐛',
  improvement: '🔧',
  documentation: '📝',
  testing: '🧪',
  devops: '🚀',
  design: '🎨',
  other: '📋',
}

export default function DevPanelPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<
    'overview' | 'projects' | 'features' | 'tasks' | 'github' | 'system'
  >('overview')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<DevTask | null>(null)
  const [taskFilter, setTaskFilter] = useState<string>('all')
  const [showArchivedProjects, setShowArchivedProjects] = useState(false)

  const { data: profileData, loading: profileLoading } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })

  // Cast role to string since 'dev' may not be in generated types yet
  const userRole = (profileData?.me?.role as string) || ''

  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useQuery<{ devDashboardStats: DevStats }>(GET_DEV_DASHBOARD_STATS, {
    skip: !isAuthenticated || !['dev', 'admin'].includes(userRole),
  })

  const {
    data: healthData,
    loading: healthLoading,
    refetch: refetchHealth,
  } = useQuery<{ systemHealth: SystemHealth[] }>(GET_SYSTEM_HEALTH, {
    skip: !isAuthenticated || !['dev', 'admin'].includes(userRole),
  })

  const {
    data: tasksData,
    loading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery<DevTasksData>(GET_DEV_TASKS, {
    variables: { limit: 100 },
    skip: !isAuthenticated || !['dev', 'admin'].includes(userRole),
  })

  const {
    data: projectsData,
    loading: projectsLoading,
    refetch: refetchProjects,
  } = useQuery<ProjectsData>(GET_PROJECTS, {
    variables: { include_archived: showArchivedProjects },
    skip: !isAuthenticated || !['dev', 'admin'].includes(userRole),
  })

  const [updateTask] = useMutation(UPDATE_DEV_TASK, {
    onCompleted: () => refetchTasks(),
  })

  const [createTask] = useMutation(CREATE_DEV_TASK, {
    onCompleted: () => {
      refetchTasks()
      refetchStats()
      setShowCreateTask(false)
    },
  })


  useEffect(() => {
    // Redirect non-dev/admin users
    if (!isLoading && isAuthenticated && !profileLoading && !['dev', 'admin'].includes(userRole)) {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, userRole, profileLoading, router])

  const handleRefresh = () => {
    refetchStats()
    refetchHealth()
    refetchTasks()
    refetchProjects()
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask({
        variables: {
          id: taskId,
          input: { status: newStatus },
        },
      })
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  // Group tasks by status for kanban
  const tasksByStatus = TASK_COLUMNS.reduce(
    (acc, column) => {
      acc[column.id] =
        tasksData?.devTasks?.tasks?.filter(
          task =>
            task.status === column.id && (taskFilter === 'all' || task.priority === taskFilter),
        ) || []
      return acc
    },
    {} as Record<string, DevTask[]>,
  )

  if (isLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-primary text-2xl">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!['dev', 'admin'].includes(userRole)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-red-400 text-xl">Access Denied - Dev/Admin Only</div>
        </div>
      </DashboardLayout>
    )
  }

  const stats = statsData?.devDashboardStats
  const health = healthData?.systemHealth || []

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-400/20'
      case 'degraded':
        return 'text-yellow-400 bg-yellow-400/20'
      case 'down':
        return 'text-red-400 bg-red-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <FiCheckCircle className="text-green-400" size={16} />
      case 'degraded':
        return <FiAlertTriangle className="text-yellow-400" size={16} />
      case 'down':
        return <FiAlertTriangle className="text-red-400" size={16} />
      default:
        return <FiClock className="text-gray-400" size={16} />
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary">
              Dev Panel
            </h1>
            <p className="text-text-secondary mt-1 text-sm sm:text-base truncate">
              Development tools & features
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={handleRefresh}
              className="p-2.5 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-white/10"
              title="Refresh data"
            >
              <FiRefreshCw size={18} />
            </button>
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-3 sm:px-4 py-2 rounded-full">
              <span className="text-text-primary font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                <FiCode size={14} />
                <span className="hidden sm:inline">{userRole === 'admin' ? 'Admin' : 'Dev'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: FiTrendingUp },
            { id: 'projects', label: 'Projects', icon: FiFolder },
            { id: 'features', label: 'Features', icon: FiMessageSquare },
            { id: 'tasks', label: 'Tasks', icon: FiList },
            { id: 'github', label: 'GitHub', icon: FiGitBranch },
            { id: 'system', label: 'System', icon: FiServer },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/40'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === 'overview' ? 'Home' : tab.id === 'features' ? 'Feats' : tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            {statsLoading ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 animate-pulse"
                  >
                    <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
                    <div className="h-8 bg-white/10 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : stats ? (
              <>
                {/* Feature Request Stats */}
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <FiMessageSquare className="text-neon-purple" />
                    Feature Requests
                  </h2>
                  <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                    <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <FiMessageSquare className="text-neon-purple" size={20} />
                        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">
                          Total
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-text-primary">
                        {stats.total_feature_requests}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary mt-1">Requests</p>
                    </div>

                    <div className="bg-bg-secondary rounded-xl border border-yellow-400/20 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <FiClock className="text-yellow-400" size={20} />
                        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">
                          Pending
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-text-primary">
                        {stats.pending_requests}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary mt-1">Awaiting</p>
                    </div>

                    <div className="bg-bg-secondary rounded-xl border border-blue-400/20 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <FiActivity className="text-blue-400" size={20} />
                        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">
                          Active
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-text-primary">
                        {stats.in_progress_requests}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary mt-1">In Progress</p>
                    </div>

                    <div className="bg-bg-secondary rounded-xl border border-green-400/20 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <FiCheckCircle className="text-green-400" size={20} />
                        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">
                          Done
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-text-primary">
                        {stats.completed_requests}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary mt-1">Shipped</p>
                    </div>
                  </div>
                </div>

                {/* Dev Task Stats */}
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <FiList className="text-neon-pink" />
                    Dev Tasks
                  </h2>
                  <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                    <div className="bg-bg-secondary rounded-xl border border-neon-pink/20 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <FiList className="text-neon-pink" size={20} />
                        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">
                          Total
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-text-primary">
                        {stats.total_tasks}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary mt-1">Tasks</p>
                    </div>

                    <div className="bg-bg-secondary rounded-xl border border-gray-400/20 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <FiClock className="text-gray-400" size={20} />
                        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">
                          To Do
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-text-primary">
                        {stats.todo_tasks}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary mt-1">Not Started</p>
                    </div>

                    <div className="bg-bg-secondary rounded-xl border border-blue-400/20 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <FiZap className="text-blue-400" size={20} />
                        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">
                          Active
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-text-primary">
                        {stats.in_progress_tasks}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary mt-1">In Progress</p>
                    </div>

                    <div className="bg-bg-secondary rounded-xl border border-red-400/20 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <FiAlertTriangle className="text-red-400" size={20} />
                        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">
                          Blocked
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-text-primary">
                        {stats.blocked_tasks}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary mt-1">Attention</p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Changelog */}
                  <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="p-2.5 sm:p-3 bg-neon-purple/20 rounded-lg">
                        <FiTag className="text-neon-purple" size={20} />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                          Changelog
                        </h3>
                        <p className="text-text-secondary text-xs sm:text-sm">
                          {stats.total_changelog_entries} entries
                        </p>
                      </div>
                    </div>
                    {stats.latest_version && (
                      <div className="bg-bg-primary rounded-lg p-3">
                        <p className="text-xs text-text-secondary">Latest Version</p>
                        <p className="text-lg sm:text-xl font-bold text-neon-purple">
                          {stats.latest_version}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* GitHub */}
                  <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="p-2.5 sm:p-3 bg-neon-pink/20 rounded-lg">
                        <FiGitBranch className="text-neon-pink" size={20} />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                          GitHub
                        </h3>
                        <p className="text-text-secondary text-xs sm:text-sm">Repository Status</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="bg-bg-primary rounded-lg p-2.5 sm:p-3">
                        <p className="text-[10px] sm:text-xs text-text-secondary">Open PRs</p>
                        <p className="text-lg sm:text-xl font-bold text-green-400">
                          {stats.github_open_prs ?? '-'}
                        </p>
                      </div>
                      <div className="bg-bg-primary rounded-lg p-2.5 sm:p-3">
                        <p className="text-[10px] sm:text-xs text-text-secondary">Open Issues</p>
                        <p className="text-lg sm:text-xl font-bold text-yellow-400">
                          {stats.github_open_issues ?? '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* API Rate Limit */}
                  {stats.github_rate_limit && (
                    <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center gap-3 mb-3 sm:mb-4">
                        <div className="p-2.5 sm:p-3 bg-blue-400/20 rounded-lg">
                          <FiDatabase className="text-blue-400" size={20} />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                            API Rate
                          </h3>
                          <p className="text-text-secondary text-xs sm:text-sm">GitHub API</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-text-secondary">Remaining</span>
                          <span className="text-text-primary font-medium">
                            {stats.github_rate_limit.remaining} / {stats.github_rate_limit.limit}
                          </span>
                        </div>
                        <div className="w-full bg-bg-primary rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-neon-purple to-neon-pink h-2 rounded-full transition-all"
                            style={{
                              width: `${(stats.github_rate_limit.remaining / stats.github_rate_limit.limit) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-8 text-center">
                <FiAlertTriangle className="text-yellow-400 mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Unable to Load Stats
                </h3>
                <p className="text-text-secondary">The dev panel API may not be deployed yet.</p>
              </div>
            )}

            {/* System Health */}
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <FiServer className="text-green-400" />
                System Health
              </h2>
              {healthLoading ? (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-3 sm:p-4 animate-pulse"
                    >
                      <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                      <div className="h-6 bg-white/10 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : health.length > 0 ? (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                  {health.map(service => (
                    <div
                      key={service.service}
                      className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-3 sm:p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-text-primary font-medium capitalize text-sm sm:text-base truncate">
                          {service.service}
                        </span>
                        {getHealthIcon(service.status)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium ${getHealthStatusColor(service.status)}`}
                        >
                          {service.status}
                        </span>
                        {service.response_time_ms !== null && (
                          <span className="text-text-secondary text-[10px] sm:text-xs">
                            {service.response_time_ms}ms
                          </span>
                        )}
                      </div>
                      {service.error_message && (
                        <p
                          className="text-red-400 text-[10px] sm:text-xs mt-2 truncate"
                          title={service.error_message}
                        >
                          {service.error_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 text-center">
                  <p className="text-text-secondary">No health data available</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <FiSettings className="text-blue-400" />
                Quick Actions
              </h2>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  onClick={() => setActiveTab('features')}
                  className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6 hover:border-neon-purple/40 active:bg-white/5 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                    <div className="p-2.5 sm:p-3 bg-neon-purple/20 rounded-lg group-hover:bg-neon-purple/30 transition-colors">
                      <FiMessageSquare className="text-neon-purple" size={20} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                      Feature Requests
                    </h3>
                  </div>
                  <p className="text-text-secondary text-xs sm:text-sm">
                    View and manage feature requests from users
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6 hover:border-neon-purple/40 active:bg-white/5 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                    <div className="p-2.5 sm:p-3 bg-neon-pink/20 rounded-lg group-hover:bg-neon-pink/30 transition-colors">
                      <FiList className="text-neon-pink" size={20} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                      Dev Tasks
                    </h3>
                  </div>
                  <p className="text-text-secondary text-xs sm:text-sm">
                    Track development tasks and sprints
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('github')}
                  className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 sm:p-6 hover:border-neon-purple/40 active:bg-white/5 transition-colors text-left group sm:col-span-2 lg:col-span-1"
                >
                  <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                    <div className="p-2.5 sm:p-3 bg-blue-400/20 rounded-lg group-hover:bg-blue-400/30 transition-colors">
                      <FiGitPullRequest className="text-blue-400" size={20} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                      GitHub Activity
                    </h3>
                  </div>
                  <p className="text-text-secondary text-xs sm:text-sm">
                    View commits, PRs, and CI/CD status
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">DANZ Projects</h2>
                <p className="text-text-secondary text-sm">
                  Manage all projects across the DANZ ecosystem
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchivedProjects}
                  onChange={e => setShowArchivedProjects(e.target.checked)}
                  className="rounded border-white/20 bg-bg-primary text-neon-purple focus:ring-neon-purple"
                />
                Show archived
              </label>
            </div>

            {/* Projects Grid */}
            {projectsLoading ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 animate-pulse"
                  >
                    <div className="h-6 bg-white/10 rounded w-2/3 mb-4" />
                    <div className="h-4 bg-white/10 rounded w-full mb-2" />
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : projectsData?.projects && projectsData.projects.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {projectsData.projects.map(project => (
                  <div
                    key={project.id}
                    className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 hover:border-neon-purple/40 transition-colors"
                    style={{ borderLeftColor: project.color || '#8B5CF6', borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${project.color}20` }}
                        >
                          {project.icon === 'server' && (
                            <FiServer style={{ color: project.color || '#8B5CF6' }} />
                          )}
                          {project.icon === 'smartphone' && (
                            <FiSmartphone style={{ color: project.color || '#8B5CF6' }} />
                          )}
                          {project.icon === 'send' && (
                            <FiMessageSquare style={{ color: project.color || '#8B5CF6' }} />
                          )}
                          {project.icon === 'globe' && (
                            <FiGitBranch style={{ color: project.color || '#8B5CF6' }} />
                          )}
                          {project.icon === 'shield' && (
                            <FiSettings style={{ color: project.color || '#8B5CF6' }} />
                          )}
                          {project.icon === 'calendar' && (
                            <FiClock style={{ color: project.color || '#8B5CF6' }} />
                          )}
                          {!project.icon && (
                            <FiFolder style={{ color: project.color || '#8B5CF6' }} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-text-primary">{project.name}</h3>
                          <p className="text-xs text-text-secondary">{project.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            project.platform === 'api'
                              ? 'bg-green-500/20 text-green-400'
                              : project.platform === 'mobile'
                                ? 'bg-purple-500/20 text-purple-400'
                                : project.platform === 'telegram'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : project.platform === 'web'
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : project.platform === 'admin'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {project.platform || project.project_type}
                        </span>
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Tech Stack */}
                    {project.tech_stack && project.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {project.tech_stack.slice(0, 4).map(tech => (
                          <span
                            key={tech}
                            className="px-2 py-0.5 bg-white/5 text-text-secondary rounded text-xs"
                          >
                            {tech}
                          </span>
                        ))}
                        {project.tech_stack.length > 4 && (
                          <span className="px-2 py-0.5 bg-white/5 text-text-secondary rounded text-xs">
                            +{project.tech_stack.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
                      <div className="text-center">
                        <p className="text-lg font-bold text-text-primary">
                          {project.feature_count}
                        </p>
                        <p className="text-xs text-text-secondary">Features</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-text-primary">{project.task_count}</p>
                        <p className="text-xs text-text-secondary">Tasks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-neon-pink">
                          {project.open_task_count}
                        </p>
                        <p className="text-xs text-text-secondary">Open</p>
                      </div>
                    </div>

                    {/* GitHub Link */}
                    {project.github_repo && (
                      <a
                        href={`https://github.com/${project.github_org || 'FlowBondTech'}/${project.github_repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center gap-2 text-sm text-text-secondary hover:text-neon-purple transition-colors"
                      >
                        <FiGitBranch size={14} />
                        {project.github_org || 'FlowBondTech'}/{project.github_repo}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-8 text-center">
                <FiFolder className="text-neon-purple mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-text-primary mb-2">No Projects Found</h3>
                <p className="text-text-secondary">Projects will appear here once configured.</p>
              </div>
            )}
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-8 text-center">
            <FiMessageSquare className="text-neon-purple mx-auto mb-4" size={48} />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Feature Requests</h3>
            <p className="text-text-secondary mb-4">
              This section will display all feature requests with voting, filtering, and management
              capabilities.
            </p>
            <p className="text-text-secondary text-sm">Backend deployment required. Coming soon!</p>
          </div>
        )}

        {/* Tasks Tab - Kanban Board */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Header with filters and actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                <span className="text-text-secondary text-sm whitespace-nowrap">Filter:</span>
                {['all', 'urgent', 'high', 'medium', 'low'].map(priority => (
                  <button
                    key={priority}
                    onClick={() => setTaskFilter(priority)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      taskFilter === priority
                        ? 'bg-neon-purple text-text-primary'
                        : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-2 px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-text-primary rounded-lg transition-colors text-sm font-medium"
              >
                <FiPlus size={16} />
                New Task
              </button>
            </div>

            {/* Kanban Board */}
            {tasksLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {TASK_COLUMNS.map(column => (
                  <div
                    key={column.id}
                    className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-4 min-h-[300px]"
                  >
                    <div className="h-6 bg-white/10 rounded w-1/2 mb-4 animate-pulse" />
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bg-bg-primary rounded-lg p-4 animate-pulse">
                          <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-white/10 rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : tasksData?.devTasks?.tasks?.length === 0 && !tasksLoading ? (
              <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-8 text-center">
                <FiList className="text-neon-pink mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-text-primary mb-2">No Tasks Yet</h3>
                <p className="text-text-secondary mb-4">
                  Create your first task to get started with the kanban board.
                </p>
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-text-primary rounded-lg transition-colors"
                >
                  <FiPlus size={16} />
                  Create First Task
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {TASK_COLUMNS.map(column => (
                  <div
                    key={column.id}
                    className={`bg-bg-secondary rounded-xl border border-${column.color}-400/20 p-4 min-h-[400px]`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className={`font-semibold text-${column.color}-400 flex items-center gap-2`}
                      >
                        {column.id === 'todo' && <FiClock size={16} />}
                        {column.id === 'in_progress' && <FiZap size={16} />}
                        {column.id === 'blocked' && <FiAlertTriangle size={16} />}
                        {column.id === 'done' && <FiCheckCircle size={16} />}
                        {column.label}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full bg-${column.color}-400/20 text-${column.color}-400`}
                      >
                        {tasksByStatus[column.id]?.length || 0}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
                      {tasksByStatus[column.id]?.map(task => (
                        <div
                          key={task.id}
                          className="bg-bg-primary rounded-lg p-3 border border-white/5 hover:border-neon-purple/30 transition-colors cursor-pointer group"
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base">
                                {TASK_TYPE_ICONS[task.task_type] || TASK_TYPE_ICONS.other}
                              </span>
                              <h4 className="text-sm font-medium text-text-primary truncate">
                                {task.title}
                              </h4>
                            </div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-xs text-text-secondary line-clamp-2 mb-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-text-secondary">
                            <div className="flex items-center gap-2">
                              {task.assigned_to && (
                                <span className="flex items-center gap-1">
                                  <FiUser size={10} />
                                  {task.assigned_to.username ||
                                    task.assigned_to.display_name ||
                                    'Unassigned'}
                                </span>
                              )}
                              {task.sprint && (
                                <span className="px-1.5 py-0.5 bg-neon-purple/20 text-neon-purple rounded">
                                  {task.sprint}
                                </span>
                              )}
                            </div>
                            {task.estimated_hours && <span>{task.estimated_hours}h</span>}
                          </div>

                          {/* Quick status change buttons - visible on hover */}
                          <div className="hidden group-hover:flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
                            {TASK_COLUMNS.filter(c => c.id !== task.status).map(col => (
                              <button
                                key={col.id}
                                onClick={e => {
                                  e.stopPropagation()
                                  handleTaskStatusChange(task.id, col.id)
                                }}
                                className={`flex-1 text-[10px] py-1 rounded bg-${col.color}-400/10 text-${col.color}-400 hover:bg-${col.color}-400/20 transition-colors`}
                              >
                                → {col.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      {tasksByStatus[column.id]?.length === 0 && (
                        <div className="text-center py-8 text-text-secondary text-sm">No tasks</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create Task Modal */}
            {showCreateTask && (
              <CreateTaskModal
                onClose={() => setShowCreateTask(false)}
                onSubmit={async data => {
                  try {
                    await createTask({ variables: { input: data } })
                  } catch (error) {
                    console.error('Failed to create task:', error)
                  }
                }}
              />
            )}

            {/* Task Detail Modal */}
            {selectedTask && (
              <TaskDetailModal
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onStatusChange={handleTaskStatusChange}
              />
            )}
          </div>
        )}

        {/* GitHub Tab */}
        {activeTab === 'github' && (
          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-8 text-center">
            <FiGitBranch className="text-blue-400 mx-auto mb-4" size={48} />
            <h3 className="text-lg font-semibold text-text-primary mb-2">GitHub Integration</h3>
            <p className="text-text-secondary mb-4">
              This section will show commits, pull requests, actions, and releases from GitHub.
            </p>
            <p className="text-text-secondary text-sm">
              Requires GITHUB_TOKEN environment variable. Backend deployment required.
            </p>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <FiServer className="text-green-400" />
                Service Health
              </h3>
              {healthLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-bg-primary rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-white/10 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : health.length > 0 ? (
                <div className="space-y-3">
                  {health.map(service => (
                    <div
                      key={service.service}
                      className="bg-bg-primary rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getHealthIcon(service.status)}
                        <span className="text-text-primary font-medium capitalize">
                          {service.service}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {service.response_time_ms !== null && (
                          <span className="text-text-secondary text-sm">
                            {service.response_time_ms}ms
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(service.status)}`}
                        >
                          {service.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-center py-4">No health data available</p>
              )}
            </div>

            <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <FiDatabase className="text-blue-400" />
                Cache Management
              </h3>
              <p className="text-text-secondary mb-4">Manage GitHub API cache and system caches.</p>
              <button
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                onClick={() => alert('Cache clearing will be available after backend deployment')}
              >
                Clear GitHub Cache
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// Create Task Modal Component
function CreateTaskModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: {
    title: string
    description?: string
    task_type: string
    priority: string
    status: string
    sprint?: string
    estimated_hours?: number
  }) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'feature',
    priority: 'medium',
    status: 'todo',
    sprint: '',
    estimated_hours: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: formData.title,
        description: formData.description || undefined,
        task_type: formData.task_type,
        priority: formData.priority,
        status: formData.status,
        sprint: formData.sprint || undefined,
        estimated_hours: formData.estimated_hours
          ? Number.parseInt(formData.estimated_hours)
          : undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-text-primary">Create New Task</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-text-primary focus:border-neon-purple focus:outline-none"
              placeholder="Task title..."
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-text-primary focus:border-neon-purple focus:outline-none min-h-[100px]"
              placeholder="Task description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Type</label>
              <select
                value={formData.task_type}
                onChange={e => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-text-primary focus:border-neon-purple focus:outline-none"
              >
                <option value="feature">✨ Feature</option>
                <option value="bug">🐛 Bug</option>
                <option value="improvement">🔧 Improvement</option>
                <option value="documentation">📝 Documentation</option>
                <option value="testing">🧪 Testing</option>
                <option value="devops">🚀 DevOps</option>
                <option value="design">🎨 Design</option>
                <option value="other">📋 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-text-primary focus:border-neon-purple focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Sprint</label>
              <input
                type="text"
                value={formData.sprint}
                onChange={e => setFormData({ ...formData, sprint: e.target.value })}
                className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-text-primary focus:border-neon-purple focus:outline-none"
                placeholder="Sprint-1"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Est. Hours</label>
              <input
                type="number"
                value={formData.estimated_hours}
                onChange={e => setFormData({ ...formData, estimated_hours: e.target.value })}
                className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-text-primary focus:border-neon-purple focus:outline-none"
                placeholder="4"
                min="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-text-primary rounded-lg transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Task Detail Modal Component
function TaskDetailModal({
  task,
  onClose,
  onStatusChange,
}: {
  task: DevTask
  onClose: () => void
  onStatusChange: (taskId: string, status: string) => Promise<void>
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary rounded-xl border border-neon-purple/30 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {TASK_TYPE_ICONS[task.task_type] || TASK_TYPE_ICONS.other}
            </span>
            <h2 className="text-lg font-semibold text-text-primary">{task.title}</h2>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Status and Priority */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}
            >
              {task.priority.toUpperCase()}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                task.status === 'todo'
                  ? 'bg-gray-400/20 text-gray-400'
                  : task.status === 'in_progress'
                    ? 'bg-blue-400/20 text-blue-400'
                    : task.status === 'blocked'
                      ? 'bg-red-400/20 text-red-400'
                      : 'bg-green-400/20 text-green-400'
              }`}
            >
              {task.status.replace('_', ' ').toUpperCase()}
            </span>
            {task.sprint && (
              <span className="px-2 py-1 bg-neon-purple/20 text-neon-purple rounded text-xs">
                {task.sprint}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Description</h3>
              <p className="text-text-primary text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {task.assigned_to && (
              <div>
                <span className="text-text-secondary">Assigned to:</span>
                <p className="text-text-primary">
                  {task.assigned_to.display_name || task.assigned_to.username || 'Unknown'}
                </p>
              </div>
            )}
            {task.estimated_hours && (
              <div>
                <span className="text-text-secondary">Estimated:</span>
                <p className="text-text-primary">{task.estimated_hours} hours</p>
              </div>
            )}
            {task.due_date && (
              <div>
                <span className="text-text-secondary">Due date:</span>
                <p className="text-text-primary">{new Date(task.due_date).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <span className="text-text-secondary">Created:</span>
              <p className="text-text-primary">{new Date(task.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-white/10 text-text-primary rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status Change Actions */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Move to:</h3>
            <div className="flex flex-wrap gap-2">
              {TASK_COLUMNS.filter(col => col.id !== task.status).map(col => (
                <button
                  key={col.id}
                  onClick={() => onStatusChange(task.id, col.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${col.color === 'gray' ? 'bg-gray-400/20 text-gray-400 hover:bg-gray-400/30' : ''}
                    ${col.color === 'blue' ? 'bg-blue-400/20 text-blue-400 hover:bg-blue-400/30' : ''}
                    ${col.color === 'red' ? 'bg-red-400/20 text-red-400 hover:bg-red-400/30' : ''}
                    ${col.color === 'green' ? 'bg-green-400/20 text-green-400 hover:bg-green-400/30' : ''}
                  `}
                >
                  {col.id === 'todo' && <FiClock className="inline mr-1" size={14} />}
                  {col.id === 'in_progress' && <FiZap className="inline mr-1" size={14} />}
                  {col.id === 'blocked' && <FiAlertTriangle className="inline mr-1" size={14} />}
                  {col.id === 'done' && <FiCheckCircle className="inline mr-1" size={14} />}
                  {col.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
