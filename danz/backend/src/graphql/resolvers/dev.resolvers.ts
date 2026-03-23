import { GraphQLError } from 'graphql'
import { supabase } from '../../config/supabase.js'
import { discord } from '../../services/discord.js'

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_ORG = process.env.GITHUB_ORG || 'FlowBondTech'
const GITHUB_REPOS = (process.env.GITHUB_REPOS || 'danz-web,danz-backend').split(',')

// Helper to check dev/admin access
const requireDevAccess = async (userId: string) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !user || (user.role !== 'dev' && user.role !== 'admin')) {
    throw new GraphQLError('Access denied. Dev or Admin role required.', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return user
}

// Helper to check admin-only access
const requireAdminAccess = async (userId: string) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !user || user.role !== 'admin') {
    throw new GraphQLError('Access denied. Admin role required.', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return user
}

// GitHub API helper
const githubFetch = async (endpoint: string, options: RequestInit = {}) => {
  if (!GITHUB_TOKEN) {
    throw new GraphQLError('GitHub integration not configured', {
      extensions: { code: 'CONFIGURATION_ERROR' },
    })
  }

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new GraphQLError(`GitHub API error: ${error.message || response.statusText}`, {
      extensions: { code: 'GITHUB_ERROR', status: response.status },
    })
  }

  return response.json()
}

// Cache GitHub responses
const getCachedOrFetch = async (cacheKey: string, fetcher: () => Promise<any>, ttlMinutes = 5) => {
  // Check cache
  const { data: cached } = await supabase
    .from('github_cache')
    .select('data, expires_at')
    .eq('cache_key', cacheKey)
    .single()

  if (cached && new Date(cached.expires_at) > new Date()) {
    return cached.data
  }

  // Fetch fresh data
  const data = await fetcher()

  // Update cache
  await supabase.from('github_cache').upsert(
    {
      cache_key: cacheKey,
      data,
      expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    },
    { onConflict: 'cache_key' },
  )

  return data
}

export const devResolvers = {
  Query: {
    // ==================== Projects ====================
    projects: async (_: any, { include_archived = false }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      let query = supabase.from('projects').select('*').eq('is_active', true)

      if (!include_archived) {
        query = query.eq('is_archived', false)
      }

      query = query.order('display_order', { ascending: true })

      const { data, error } = await query

      if (error) {
        throw new GraphQLError(`Failed to fetch projects: ${error.message}`)
      }

      return data || []
    },

    project: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()

      if (error) {
        throw new GraphQLError('Project not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return data
    },

    projectBySlug: async (_: any, { slug }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase.from('projects').select('*').eq('slug', slug).single()

      if (error) {
        throw new GraphQLError('Project not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return data
    },

    // ==================== Dev Dashboard ====================
    devDashboardStats: async (_: any, __: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      // Parallel queries for stats
      const [featureStats, taskStats, changelogStats, inventoryStats, alertStats] =
        await Promise.all([
          supabase.from('feature_requests').select('status', { count: 'exact' }),
          supabase.from('dev_tasks').select('status', { count: 'exact' }),
          supabase
            .from('changelog_entries')
            .select('version', { count: 'exact' })
            .order('created_at', { ascending: false }),
          supabase.from('feature_inventory').select('status', { count: 'exact' }),
          supabase.from('dev_alerts').select('alert_type, priority', { count: 'exact' }),
        ])

      const features = featureStats.data || []
      const tasks = taskStats.data || []
      const changelog = changelogStats.data || []
      const inventory = inventoryStats.data || []
      const alerts = alertStats.data || []

      // Calculate feature stats
      const pendingStatuses = ['requested', 'under_review']
      const inProgressStatuses = ['planned', 'in_progress', 'testing']
      const completedStatuses = ['completed']

      // Calculate task stats
      const todoStatuses = ['todo']
      const taskInProgressStatuses = ['in_progress', 'review', 'testing']
      const blockedStatuses = ['blocked']

      // Try to get GitHub stats (cached)
      interface GitHubRateLimit {
        limit: number
        remaining: number
        reset_at: string
        used: number
      }
      const githubStats: {
        open_prs: number
        open_issues: number
        rate_limit: GitHubRateLimit | null
      } = { open_prs: 0, open_issues: 0, rate_limit: null }
      if (GITHUB_TOKEN) {
        try {
          const rateLimitResponse = (await getCachedOrFetch('github_rate_limit', async () => {
            const response = (await githubFetch('/rate_limit')) as {
              rate: { limit: number; remaining: number; reset: number; used: number }
            }
            return response.rate
          })) as { limit: number; remaining: number; reset: number; used: number }
          const rateLimit = rateLimitResponse
          githubStats.rate_limit = {
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
            reset_at: new Date(rateLimit.reset * 1000).toISOString(),
            used: rateLimit.used,
          }

          // Get open PRs count
          let totalOpenPrs = 0
          for (const repo of GITHUB_REPOS) {
            const prs = await getCachedOrFetch(`github_prs_open_${repo}`, () =>
              githubFetch(`/repos/${GITHUB_ORG}/${repo}/pulls?state=open&per_page=1`),
            )
            // This is a rough count, GitHub doesn't return total in list endpoint easily
            totalOpenPrs += prs.length > 0 ? 1 : 0
          }
          githubStats.open_prs = totalOpenPrs
        } catch (e) {
          console.error('Failed to fetch GitHub stats:', e)
        }
      }

      return {
        total_feature_requests: featureStats.count || 0,
        pending_requests: features.filter(f => pendingStatuses.includes(f.status)).length,
        in_progress_requests: features.filter(f => inProgressStatuses.includes(f.status)).length,
        completed_requests: features.filter(f => completedStatuses.includes(f.status)).length,

        total_tasks: taskStats.count || 0,
        todo_tasks: tasks.filter(t => todoStatuses.includes(t.status)).length,
        in_progress_tasks: tasks.filter(t => taskInProgressStatuses.includes(t.status)).length,
        blocked_tasks: tasks.filter(t => blockedStatuses.includes(t.status)).length,

        total_changelog_entries: changelogStats.count || 0,
        latest_version: changelog[0]?.version || null,

        github_open_prs: githubStats.open_prs,
        github_open_issues: githubStats.open_issues,
        github_rate_limit: githubStats.rate_limit,

        // Feature Inventory stats
        total_features: inventoryStats.count || 0,
        implemented_features: inventory.filter((i: any) => i.status === 'implemented').length,
        in_progress_features: inventory.filter((i: any) =>
          ['in_progress', 'partially_implemented'].includes(i.status),
        ).length,
        planned_features: inventory.filter((i: any) => i.status === 'planned').length,

        // Dev Alerts stats
        unread_alerts: alertStats.count || 0, // Would need per-user tracking for accurate count
        critical_alerts: alerts.filter(
          (a: any) => a.priority === 'urgent' || a.alert_type === 'critical',
        ).length,
      }
    },

    systemHealth: async (_: any, __: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const healthChecks = []

      // Check API (self)
      healthChecks.push({
        service: 'API Server',
        status: 'healthy',
        response_time_ms: 1,
        last_checked: new Date().toISOString(),
        error_message: null,
      })

      // Check Database
      const dbStart = Date.now()
      try {
        await supabase.from('users').select('id').limit(1)
        healthChecks.push({
          service: 'Database',
          status: 'healthy',
          response_time_ms: Date.now() - dbStart,
          last_checked: new Date().toISOString(),
          error_message: null,
        })
      } catch (e: any) {
        healthChecks.push({
          service: 'Database',
          status: 'down',
          response_time_ms: Date.now() - dbStart,
          last_checked: new Date().toISOString(),
          error_message: e.message,
        })
      }

      // Check GitHub API
      if (GITHUB_TOKEN) {
        const ghStart = Date.now()
        try {
          const rateLimit = (await githubFetch('/rate_limit')) as {
            rate: { remaining: number; limit: number }
          }
          const remaining = rateLimit.rate.remaining
          healthChecks.push({
            service: 'GitHub API',
            status: remaining > 100 ? 'healthy' : remaining > 10 ? 'degraded' : 'down',
            response_time_ms: Date.now() - ghStart,
            last_checked: new Date().toISOString(),
            error_message: remaining < 100 ? `Rate limit: ${remaining} remaining` : null,
            details: { remaining, limit: rateLimit.rate.limit },
          })
        } catch (e: any) {
          healthChecks.push({
            service: 'GitHub API',
            status: 'down',
            response_time_ms: Date.now() - ghStart,
            last_checked: new Date().toISOString(),
            error_message: e.message,
          })
        }
      }

      return healthChecks
    },

    // ==================== Feature Requests ====================
    featureRequests: async (
      _: any,
      { filter, limit = 20, offset = 0, sort_by = 'votes' }: any,
      context: any,
    ) => {
      let query = supabase.from('feature_requests').select('*', { count: 'exact' })

      // Apply filters
      if (filter?.status?.length) {
        query = query.in('status', filter.status)
      }
      if (filter?.category?.length) {
        query = query.in('category', filter.category)
      }
      if (filter?.priority?.length) {
        query = query.in('priority', filter.priority)
      }
      if (filter?.assigned_to) {
        query = query.eq('assigned_to', filter.assigned_to)
      }
      if (filter?.requested_by) {
        query = query.eq('requested_by', filter.requested_by)
      }
      if (filter?.search) {
        query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`)
      }
      if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
      }

      // Sorting
      switch (sort_by) {
        case 'votes':
          query = query.order('votes', { ascending: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'priority':
          query = query.order('priority', { ascending: true })
          break
        default:
          query = query.order('votes', { ascending: false })
      }

      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw new GraphQLError(`Failed to fetch feature requests: ${error.message}`)
      }

      return {
        requests: data || [],
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      }
    },

    featureRequest: async (_: any, { id }: any, context: any) => {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new GraphQLError('Feature request not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return data
    },

    topVotedFeatures: async (_: any, { limit = 10 }: any) => {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .in('status', ['requested', 'under_review', 'planned'])
        .order('votes', { ascending: false })
        .limit(limit)

      if (error) {
        throw new GraphQLError(`Failed to fetch top features: ${error.message}`)
      }

      return data || []
    },

    // ==================== Dev Tasks ====================
    devTasks: async (
      _: any,
      { filter, limit = 20, offset = 0, sort_by = 'priority' }: any,
      context: any,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      let query = supabase.from('dev_tasks').select('*', { count: 'exact' })

      // Apply filters
      if (filter?.status?.length) {
        query = query.in('status', filter.status)
      }
      if (filter?.task_type?.length) {
        query = query.in('task_type', filter.task_type)
      }
      if (filter?.priority?.length) {
        query = query.in('priority', filter.priority)
      }
      if (filter?.assigned_to) {
        query = query.eq('assigned_to', filter.assigned_to)
      }
      if (filter?.sprint) {
        query = query.eq('sprint', filter.sprint)
      }
      if (filter?.search) {
        query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`)
      }
      if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
      }

      // Sorting
      const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 }
      switch (sort_by) {
        case 'priority':
          query = query.order('priority', { ascending: true })
          break
        case 'due_date':
          query = query.order('due_date', { ascending: true, nullsFirst: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        default:
          query = query.order('priority', { ascending: true })
      }

      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw new GraphQLError(`Failed to fetch dev tasks: ${error.message}`)
      }

      return {
        tasks: data || [],
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      }
    },

    devTask: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase.from('dev_tasks').select('*').eq('id', id).single()

      if (error) {
        throw new GraphQLError('Task not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return data
    },

    myDevTasks: async (_: any, __: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('dev_tasks')
        .select('*')
        .eq('assigned_to', context.userId)
        .neq('status', 'done')
        .order('priority', { ascending: true })

      if (error) {
        throw new GraphQLError(`Failed to fetch tasks: ${error.message}`)
      }

      return data || []
    },

    sprintTasks: async (_: any, { sprint }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('dev_tasks')
        .select('*')
        .eq('sprint', sprint)
        .order('priority', { ascending: true })

      if (error) {
        throw new GraphQLError(`Failed to fetch sprint tasks: ${error.message}`)
      }

      return data || []
    },

    // ==================== Changelog ====================
    changelog: async (
      _: any,
      { limit = 10, offset = 0, include_private = false }: any,
      context: any,
    ) => {
      let query = supabase.from('changelog_entries').select('*')

      // Only show public entries unless user is dev/admin and requests private
      if (!include_private || !context.userId) {
        query = query.eq('is_public', true)
      } else {
        try {
          await requireDevAccess(context.userId)
        } catch {
          query = query.eq('is_public', true)
        }
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw new GraphQLError(`Failed to fetch changelog: ${error.message}`)
      }

      // Group by version
      const versionMap = new Map<string, any[]>()
      for (const entry of data || []) {
        if (!versionMap.has(entry.version)) {
          versionMap.set(entry.version, [])
        }
        versionMap.get(entry.version)!.push(entry)
      }

      const versions = Array.from(versionMap.entries())
        .map(([version, entries]) => ({
          version,
          release_date: entries[0].created_at,
          entries,
          is_current: version === Array.from(versionMap.keys())[0],
        }))
        .slice(offset, offset + limit)

      return versions
    },

    latestChangelog: async () => {
      const { data, error } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error || !data?.length) {
        return null
      }

      const latestVersion = data[0].version
      const entries = data.filter(e => e.version === latestVersion)

      return {
        version: latestVersion,
        release_date: entries[0].created_at,
        entries,
        is_current: true,
      }
    },

    changelogEntry: async (_: any, { id }: any) => {
      const { data, error } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new GraphQLError('Changelog entry not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return data
    },

    // ==================== GitHub Integration ====================
    githubCommits: async (_: any, { repo, branch = 'main', limit = 20 }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const cacheKey = `github_commits_${repo}_${branch}`
      const commits = await getCachedOrFetch(cacheKey, () =>
        githubFetch(`/repos/${GITHUB_ORG}/${repo}/commits?sha=${branch}&per_page=${limit}`),
      )

      return commits.map((c: any) => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        author_avatar: c.author?.avatar_url,
        date: c.commit.author.date,
        url: c.html_url,
        additions: c.stats?.additions,
        deletions: c.stats?.deletions,
      }))
    },

    githubPullRequests: async (_: any, { repo, state = 'open', limit = 20 }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const cacheKey = `github_prs_${repo}_${state}`
      const prs = await getCachedOrFetch(cacheKey, () =>
        githubFetch(`/repos/${GITHUB_ORG}/${repo}/pulls?state=${state}&per_page=${limit}`),
      )

      return prs.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        author_avatar: pr.user.avatar_url,
        created_at: pr.created_at,
        merged_at: pr.merged_at,
        closed_at: pr.closed_at,
        url: pr.html_url,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
        labels: pr.labels?.map((l: any) => l.name) || [],
        draft: pr.draft,
      }))
    },

    githubActions: async (_: any, { repo, limit = 20 }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const cacheKey = `github_actions_${repo}`
      const response = await getCachedOrFetch(cacheKey, () =>
        githubFetch(`/repos/${GITHUB_ORG}/${repo}/actions/runs?per_page=${limit}`),
      )

      return (
        response.workflow_runs?.map((run: any) => ({
          id: run.id.toString(),
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          workflow_name: run.workflow_id.toString(),
          branch: run.head_branch,
          commit_sha: run.head_sha,
          started_at: run.run_started_at,
          completed_at: run.updated_at,
          url: run.html_url,
          duration_seconds:
            run.run_started_at && run.updated_at
              ? Math.floor(
                  (new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()) /
                    1000,
                )
              : null,
        })) || []
      )
    },

    githubReleases: async (_: any, { repo, limit = 10 }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const cacheKey = `github_releases_${repo}`
      const releases = await getCachedOrFetch(cacheKey, () =>
        githubFetch(`/repos/${GITHUB_ORG}/${repo}/releases?per_page=${limit}`),
      )

      return releases.map((r: any) => ({
        id: r.id.toString(),
        tag_name: r.tag_name,
        name: r.name,
        body: r.body,
        published_at: r.published_at,
        author: r.author.login,
        author_avatar: r.author.avatar_url,
        url: r.html_url,
        prerelease: r.prerelease,
        draft: r.draft,
      }))
    },

    githubRepos: async (_: any, __: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const repos = await Promise.all(
        GITHUB_REPOS.map(async repo => {
          const cacheKey = `github_repo_${repo}`
          return getCachedOrFetch(cacheKey, () => githubFetch(`/repos/${GITHUB_ORG}/${repo}`))
        }),
      )

      return repos.map((r: any) => ({
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        stars: r.stargazers_count,
        forks: r.forks_count,
        open_issues: r.open_issues_count,
        last_push: r.pushed_at,
        default_branch: r.default_branch,
        url: r.html_url,
      }))
    },

    githubRateLimit: async (_: any, __: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const rateLimit = (await githubFetch('/rate_limit')) as {
        rate: { limit: number; remaining: number; reset: number; used: number }
      }

      return {
        limit: rateLimit.rate.limit,
        remaining: rateLimit.rate.remaining,
        reset_at: new Date(rateLimit.rate.reset * 1000).toISOString(),
        used: rateLimit.rate.used,
      }
    },

    // ==================== Feature Inventory Queries ====================
    featureInventory: async (
      _: any,
      { filter, limit = 50, offset = 0, sort_by = 'category' }: any,
      context: any,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      let query = supabase.from('feature_inventory').select('*', { count: 'exact' })

      if (filter?.category?.length) {
        query = query.in('category', filter.category)
      }
      if (filter?.status?.length) {
        query = query.in('status', filter.status)
      }
      if (filter?.priority?.length) {
        query = query.in('priority', filter.priority)
      }
      if (filter?.is_miniapp_ready !== undefined) {
        query = query.eq('is_miniapp_ready', filter.is_miniapp_ready)
      }
      if (filter?.miniapp_api_available !== undefined) {
        query = query.eq('miniapp_api_available', filter.miniapp_api_available)
      }
      if (filter?.search) {
        query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`)
      }
      if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
      }

      switch (sort_by) {
        case 'completion':
          query = query.order('completion_percentage', { ascending: false })
          break
        case 'priority':
          query = query.order('priority', { ascending: true })
          break
        case 'name':
          query = query.order('name', { ascending: true })
          break
        case 'status':
          query = query.order('status', { ascending: true })
          break
        default:
          query = query.order('category', { ascending: true }).order('name', { ascending: true })
      }

      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw new GraphQLError(`Failed to fetch feature inventory: ${error.message}`)
      }

      return {
        features: data || [],
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      }
    },

    featureInventoryItem: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('feature_inventory')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new GraphQLError('Feature not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return data
    },

    featureInventoryBySlug: async (_: any, { slug }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('feature_inventory')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) {
        throw new GraphQLError('Feature not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return data
    },

    featureInventoryStats: async (_: any, __: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase.from('feature_inventory').select('*')

      if (error) {
        throw new GraphQLError(`Failed to fetch feature inventory: ${error.message}`)
      }

      const features = data || []

      const byStatus: Record<string, number> = {}
      const byCategory: Record<string, number> = {}

      for (const f of features) {
        byStatus[f.status] = (byStatus[f.status] || 0) + 1
        byCategory[f.category] = (byCategory[f.category] || 0) + 1
      }

      const totalCompletion = features.reduce((sum, f) => sum + (f.completion_percentage || 0), 0)

      return {
        total: features.length,
        by_status: byStatus,
        by_category: byCategory,
        miniapp_ready_count: features.filter(f => f.is_miniapp_ready).length,
        average_completion: features.length > 0 ? totalCompletion / features.length : 0,
      }
    },

    miniappReadyFeatures: async (_: any, __: any, context: any) => {
      const { data, error } = await supabase
        .from('feature_inventory')
        .select('*')
        .eq('is_miniapp_ready', true)
        .order('category', { ascending: true })

      if (error) {
        throw new GraphQLError(`Failed to fetch miniapp features: ${error.message}`)
      }

      return data || []
    },

    // ==================== Dev Alert Queries ====================
    devAlerts: async (_: any, { filter, limit = 50, offset = 0 }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      let query = supabase.from('dev_alerts').select('*', { count: 'exact' })

      if (filter?.alert_type?.length) {
        query = query.in('alert_type', filter.alert_type)
      }
      if (filter?.category?.length) {
        query = query.in('category', filter.category)
      }
      if (filter?.priority?.length) {
        query = query.in('priority', filter.priority)
      }
      if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
      }

      // Filter out expired alerts
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw new GraphQLError(`Failed to fetch dev alerts: ${error.message}`)
      }

      // Get read status for current user
      const alertIds = (data || []).map(a => a.id)
      const { data: readStatuses } = await supabase
        .from('dev_alert_reads')
        .select('alert_id, dismissed_at')
        .eq('user_id', context.userId)
        .in('alert_id', alertIds)

      const readMap = new Map(readStatuses?.map(r => [r.alert_id, r]) || [])

      const alerts = (data || []).map(alert => ({
        ...alert,
        is_read: readMap.has(alert.id),
        is_dismissed: readMap.get(alert.id)?.dismissed_at != null,
      }))

      const unreadCount = alerts.filter(a => !a.is_read).length

      return {
        alerts,
        total_count: count || 0,
        unread_count: unreadCount,
        has_more: (count || 0) > offset + limit,
      }
    },

    devAlert: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase.from('dev_alerts').select('*').eq('id', id).single()

      if (error) {
        throw new GraphQLError('Alert not found', { extensions: { code: 'NOT_FOUND' } })
      }

      // Get read status
      const { data: readStatus } = await supabase
        .from('dev_alert_reads')
        .select('*')
        .eq('alert_id', id)
        .eq('user_id', context.userId)
        .single()

      return {
        ...data,
        is_read: !!readStatus,
        is_dismissed: readStatus?.dismissed_at != null,
      }
    },

    myDevAlerts: async (_: any, { limit = 20, include_dismissed = false }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      const user = await requireDevAccess(context.userId)

      // Get alerts targeted at this user's role or specifically at them
      const query = supabase
        .from('dev_alerts')
        .select('*', { count: 'exact' })
        .or(`target_users.cs.{${context.userId}},target_roles.cs.{${user.role}}`)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(limit)

      const { data, error, count } = await query

      if (error) {
        throw new GraphQLError(`Failed to fetch alerts: ${error.message}`)
      }

      // Get read/dismissed status
      const alertIds = (data || []).map(a => a.id)
      const { data: readStatuses } = await supabase
        .from('dev_alert_reads')
        .select('alert_id, dismissed_at')
        .eq('user_id', context.userId)
        .in('alert_id', alertIds)

      const readMap = new Map(readStatuses?.map(r => [r.alert_id, r]) || [])

      let alerts = (data || []).map(alert => ({
        ...alert,
        is_read: readMap.has(alert.id),
        is_dismissed: readMap.get(alert.id)?.dismissed_at != null,
      }))

      if (!include_dismissed) {
        alerts = alerts.filter(a => !a.is_dismissed)
      }

      const unreadCount = alerts.filter(a => !a.is_read).length

      return {
        alerts,
        total_count: count || 0,
        unread_count: unreadCount,
        has_more: false,
      }
    },
  },

  Mutation: {
    // ==================== Projects ====================
    createProject: async (_: any, { input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      const { data, error } = await supabase.from('projects').insert(input).select().single()

      if (error) {
        throw new GraphQLError(`Failed to create project: ${error.message}`)
      }

      return data
    },

    updateProject: async (_: any, { id, input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      const { data, error } = await supabase
        .from('projects')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to update project: ${error.message}`)
      }

      return data
    },

    deleteProject: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      const { error } = await supabase.from('projects').delete().eq('id', id)

      if (error) {
        throw new GraphQLError(`Failed to delete project: ${error.message}`)
      }

      return true
    },

    // ==================== Feature Requests ====================
    createFeatureRequest: async (_: any, { input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { data, error } = await supabase
        .from('feature_requests')
        .insert({
          ...input,
          requested_by: context.userId,
          requested_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to create feature request: ${error.message}`)
      }

      return data
    },

    updateFeatureRequest: async (_: any, { id, input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const updateData = { ...input }

      // Set assigned_at if assigning
      if (input.assigned_to && !input.assigned_at) {
        updateData.assigned_at = new Date().toISOString()
      }

      // Set completed_at if completing
      if (input.status === 'completed' && !input.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('feature_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to update feature request: ${error.message}`)
      }

      return data
    },

    deleteFeatureRequest: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      const { error } = await supabase.from('feature_requests').delete().eq('id', id)

      if (error) {
        throw new GraphQLError(`Failed to delete feature request: ${error.message}`)
      }

      return true
    },

    voteFeatureRequest: async (_: any, { id, vote }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      if (!['up', 'down'].includes(vote)) {
        throw new GraphQLError('Vote must be "up" or "down"')
      }

      const { error } = await supabase.from('feature_request_votes').upsert(
        {
          feature_request_id: id,
          user_id: context.userId,
          vote_type: vote,
        },
        { onConflict: 'feature_request_id,user_id' },
      )

      if (error) {
        throw new GraphQLError(`Failed to vote: ${error.message}`)
      }

      // Return updated feature request
      const { data } = await supabase.from('feature_requests').select('*').eq('id', id).single()

      return data
    },

    removeFeatureRequestVote: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      await supabase
        .from('feature_request_votes')
        .delete()
        .eq('feature_request_id', id)
        .eq('user_id', context.userId)

      const { data } = await supabase.from('feature_requests').select('*').eq('id', id).single()

      return data
    },

    addFeatureRequestComment: async (
      _: any,
      { feature_request_id, content, is_internal = false }: any,
      context: any,
    ) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Only dev/admin can post internal comments
      if (is_internal) {
        await requireDevAccess(context.userId)
      }

      const { data, error } = await supabase
        .from('feature_request_comments')
        .insert({
          feature_request_id,
          user_id: context.userId,
          content,
          is_internal,
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to add comment: ${error.message}`)
      }

      return data
    },

    deleteFeatureRequestComment: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      const { error } = await supabase.from('feature_request_comments').delete().eq('id', id)

      if (error) {
        throw new GraphQLError(`Failed to delete comment: ${error.message}`)
      }

      return true
    },

    // ==================== Dev Tasks ====================
    createDevTask: async (_: any, { input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('dev_tasks')
        .insert({
          ...input,
          created_by: context.userId,
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to create task: ${error.message}`)
      }

      return data
    },

    updateDevTask: async (_: any, { id, input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('dev_tasks')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to update task: ${error.message}`)
      }

      return data
    },

    deleteDevTask: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      const { error } = await supabase.from('dev_tasks').delete().eq('id', id)

      if (error) {
        throw new GraphQLError(`Failed to delete task: ${error.message}`)
      }

      return true
    },

    startTask: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('dev_tasks')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          assigned_to: context.userId,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to start task: ${error.message}`)
      }

      return data
    },

    completeTask: async (_: any, { id, actual_hours }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('dev_tasks')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          actual_hours: actual_hours || null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to complete task: ${error.message}`)
      }

      return data
    },

    blockTask: async (_: any, { id, reason }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data: task } = await supabase
        .from('dev_tasks')
        .select('description')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('dev_tasks')
        .update({
          status: 'blocked',
          description: reason
            ? `${task?.description || ''}\n\n**BLOCKED:** ${reason}`
            : task?.description,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to block task: ${error.message}`)
      }

      return data
    },

    // ==================== Changelog ====================
    createChangelogEntry: async (_: any, { input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('changelog_entries')
        .insert({
          ...input,
          created_by: context.userId,
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to create changelog entry: ${error.message}`)
      }

      return data
    },

    updateChangelogEntry: async (_: any, { id, input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('changelog_entries')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to update changelog entry: ${error.message}`)
      }

      return data
    },

    deleteChangelogEntry: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      const { error } = await supabase.from('changelog_entries').delete().eq('id', id)

      if (error) {
        throw new GraphQLError(`Failed to delete changelog entry: ${error.message}`)
      }

      return true
    },

    // ==================== GitHub Actions ====================
    triggerGitHubAction: async (_: any, { repo, workflow_id, ref = 'main' }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      await githubFetch(
        `/repos/${GITHUB_ORG}/${repo}/actions/workflows/${workflow_id}/dispatches`,
        {
          method: 'POST',
          body: JSON.stringify({ ref }),
        },
      )

      return true
    },

    // ==================== System ====================
    checkSystemHealth: async (_: any, __: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      // This will run fresh health checks
      return devResolvers.Query.systemHealth(_, __, context)
    },

    clearGitHubCache: async (_: any, { cache_key }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      if (cache_key) {
        await supabase.from('github_cache').delete().eq('cache_key', cache_key)
      } else {
        await supabase
          .from('github_cache')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
      }

      return true
    },

    // ==================== Feature Inventory Mutations ====================
    createFeatureInventory: async (_: any, { input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('feature_inventory')
        .insert(input)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to create feature: ${error.message}`)
      }

      return data
    },

    updateFeatureInventory: async (_: any, { id, input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('feature_inventory')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to update feature: ${error.message}`)
      }

      return data
    },

    deleteFeatureInventory: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      const { error } = await supabase.from('feature_inventory').delete().eq('id', id)

      if (error) {
        throw new GraphQLError(`Failed to delete feature: ${error.message}`)
      }

      return true
    },

    // ==================== Dev Alert Mutations ====================
    createDevAlert: async (_: any, { input }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      const { data, error } = await supabase
        .from('dev_alerts')
        .insert({
          ...input,
          target_roles: input.target_roles || ['dev', 'admin'],
        })
        .select()
        .single()

      if (error) {
        throw new GraphQLError(`Failed to create alert: ${error.message}`)
      }

      // Send Discord notification for critical/urgent alerts
      if (input.alert_type === 'critical' || input.priority === 'urgent') {
        discord
          .sendAlert({
            title: `[${input.alert_type?.toUpperCase() || 'ALERT'}] ${input.title}`,
            message: input.message,
            severity: input.alert_type === 'critical' ? 'critical' : 'high',
            source: 'Dev Portal',
            action_url: input.action_url,
          })
          .catch(err => console.error('[Discord] Alert notification failed:', err))
      }

      return {
        ...data,
        is_read: false,
        is_dismissed: false,
      }
    },

    markAlertRead: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      // Upsert read status
      await supabase.from('dev_alert_reads').upsert(
        {
          alert_id: id,
          user_id: context.userId,
          read_at: new Date().toISOString(),
        },
        { onConflict: 'alert_id,user_id' },
      )

      const { data, error } = await supabase.from('dev_alerts').select('*').eq('id', id).single()

      if (error) {
        throw new GraphQLError('Alert not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return {
        ...data,
        is_read: true,
        is_dismissed: false,
      }
    },

    markAlertDismissed: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      // Upsert with dismissed status
      await supabase.from('dev_alert_reads').upsert(
        {
          alert_id: id,
          user_id: context.userId,
          read_at: new Date().toISOString(),
          dismissed_at: new Date().toISOString(),
        },
        { onConflict: 'alert_id,user_id' },
      )

      const { data, error } = await supabase.from('dev_alerts').select('*').eq('id', id).single()

      if (error) {
        throw new GraphQLError('Alert not found', { extensions: { code: 'NOT_FOUND' } })
      }

      return {
        ...data,
        is_read: true,
        is_dismissed: true,
      }
    },

    markAllAlertsRead: async (_: any, __: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireDevAccess(context.userId)

      // Get all unread alerts for this user
      const { data: alerts } = await supabase.from('dev_alerts').select('id')

      if (alerts?.length) {
        const inserts = alerts.map(a => ({
          alert_id: a.id,
          user_id: context.userId,
          read_at: new Date().toISOString(),
        }))

        await supabase.from('dev_alert_reads').upsert(inserts, { onConflict: 'alert_id,user_id' })
      }

      return true
    },

    deleteDevAlert: async (_: any, { id }: any, context: any) => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      await requireAdminAccess(context.userId)

      const { error } = await supabase.from('dev_alerts').delete().eq('id', id)

      if (error) {
        throw new GraphQLError(`Failed to delete alert: ${error.message}`)
      }

      return true
    },
  },

  // ==================== Field Resolvers ====================
  FeatureRequest: {
    requested_by: async (parent: any) => {
      if (!parent.requested_by) return null
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', parent.requested_by)
        .single()
      return data
    },
    assigned_to: async (parent: any) => {
      if (!parent.assigned_to) return null
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', parent.assigned_to)
        .single()
      return data
    },
    comments: async (parent: any, _: any, context: any) => {
      let query = supabase
        .from('feature_request_comments')
        .select('*')
        .eq('feature_request_id', parent.id)
        .order('created_at', { ascending: true })

      // Hide internal comments from non-dev users
      let isDevUser = false
      if (context.userId) {
        try {
          await requireDevAccess(context.userId)
          isDevUser = true
        } catch {}
      }

      if (!isDevUser) {
        query = query.eq('is_internal', false)
      }

      const { data } = await query
      return data || []
    },
    user_vote: async (parent: any, _: any, context: any) => {
      if (!context.userId) return null
      const { data } = await supabase
        .from('feature_request_votes')
        .select('vote_type')
        .eq('feature_request_id', parent.id)
        .eq('user_id', context.userId)
        .single()
      return data?.vote_type || null
    },
    project: async (parent: any) => {
      if (!parent.project_id) return null
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single()
      return data
    },
  },

  FeatureRequestComment: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', parent.user_id)
        .single()
      return data
    },
  },

  DevTask: {
    assigned_to: async (parent: any) => {
      if (!parent.assigned_to) return null
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', parent.assigned_to)
        .single()
      return data
    },
    created_by: async (parent: any) => {
      if (!parent.created_by) return null
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', parent.created_by)
        .single()
      return data
    },
    feature_request: async (parent: any) => {
      if (!parent.feature_request_id) return null
      const { data } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('id', parent.feature_request_id)
        .single()
      return data
    },
    parent_task: async (parent: any) => {
      if (!parent.parent_task_id) return null
      const { data } = await supabase
        .from('dev_tasks')
        .select('*')
        .eq('id', parent.parent_task_id)
        .single()
      return data
    },
    subtasks: async (parent: any) => {
      const { data } = await supabase.from('dev_tasks').select('*').eq('parent_task_id', parent.id)
      return data || []
    },
    project: async (parent: any) => {
      if (!parent.project_id) return null
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single()
      return data
    },
  },

  ChangelogEntry: {
    created_by: async (parent: any) => {
      if (!parent.created_by) return null
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', parent.created_by)
        .single()
      return data
    },
    feature_request: async (parent: any) => {
      if (!parent.feature_request_id) return null
      const { data } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('id', parent.feature_request_id)
        .single()
      return data
    },
    project: async (parent: any) => {
      if (!parent.project_id) return null
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single()
      return data
    },
  },

  FeatureInventory: {
    project: async (parent: any) => {
      if (!parent.project_id) return null
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single()
      return data
    },
  },

  DevAlert: {
    project: async (parent: any) => {
      if (!parent.project_id) return null
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single()
      return data
    },
  },

  Project: {
    feature_count: async (parent: any) => {
      const { count } = await supabase
        .from('feature_requests')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', parent.id)
      return count || 0
    },
    task_count: async (parent: any) => {
      const { count } = await supabase
        .from('dev_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', parent.id)
      return count || 0
    },
    open_task_count: async (parent: any) => {
      const { count } = await supabase
        .from('dev_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', parent.id)
        .neq('status', 'done')
      return count || 0
    },
  },
}
