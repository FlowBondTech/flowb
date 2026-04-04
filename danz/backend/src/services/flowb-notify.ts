/**
 * FlowB Notification Service for DANZ
 *
 * Sends platform activity notifications to FlowB when users
 * sign up, complete registration, or perform key actions on DANZ.
 *
 * FlowB admin alerts surface these in Telegram DMs to admins.
 *
 * Config:
 *   FLOWB_API_BASE    — FlowB API base URL (default: https://flowb.fly.dev)
 *   FLOWB_ADMIN_KEY   — Admin API key for FlowB
 *   FLOWB_NOTIFY      — Set to "true" to enable (disabled by default)
 */

const FLOWB_API_BASE = process.env.FLOWB_API_BASE || 'https://flowb.fly.dev'
const FLOWB_ADMIN_KEY = process.env.FLOWB_ADMIN_KEY || ''
const ENABLED = process.env.FLOWB_NOTIFY === 'true'

async function postToFlowB(path: string, body: Record<string, any>): Promise<void> {
  if (!ENABLED || !FLOWB_ADMIN_KEY) return

  try {
    const res = await fetch(`${FLOWB_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': FLOWB_ADMIN_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error(`[flowb-notify] POST ${path} failed: ${res.status}`)
    }
  } catch (err: any) {
    console.error(`[flowb-notify] POST ${path} error: ${err.message}`)
  }
}

// ─── User Events ────────────────────────────────────────────────────────────

/**
 * New user signed up on DANZ (first-time login)
 */
export async function notifyDanzSignup(user: {
  id: string
  email?: string
  wallet_address?: string
}): Promise<void> {
  const identifier = user.email || (user.wallet_address ? user.wallet_address.slice(0, 10) + '...' : user.id.slice(0, 8))
  const method = user.email ? 'Email' : 'Wallet'

  await postToFlowB('/api/v1/admin/notify', {
    source: 'danz',
    event: 'user_signup',
    message: `[DANZ] New user signed up: ${identifier} (${method})`,
    priority: 'info',
    data: { userId: user.id, method },
  })
}

/**
 * User completed DANZ registration (set username, profile)
 */
export async function notifyDanzRegistered(user: {
  id: string
  username: string
  display_name?: string
  city?: string
  role?: string
}): Promise<void> {
  const location = user.city ? ` from ${user.city}` : ''
  const role = user.role && user.role !== 'user' ? ` [${user.role}]` : ''

  await postToFlowB('/api/v1/admin/notify', {
    source: 'danz',
    event: 'user_registered',
    message: `[DANZ] @${user.username} completed registration${location}${role}`,
    priority: 'important',
    data: { userId: user.id, username: user.username, city: user.city },
  })
}

/**
 * User registered for a DANZ event
 */
export async function notifyDanzEventRegistration(data: {
  userId: string
  username?: string
  eventTitle: string
  isWaitlisted?: boolean
}): Promise<void> {
  const action = data.isWaitlisted ? 'joined waitlist for' : 'registered for'
  const who = data.username ? `@${data.username}` : data.userId.slice(0, 8)

  await postToFlowB('/api/v1/admin/notify', {
    source: 'danz',
    event: 'event_registration',
    message: `[DANZ] ${who} ${action} "${data.eventTitle}"`,
    priority: 'info',
    data: { userId: data.userId, eventTitle: data.eventTitle },
  })
}

/**
 * Generic DANZ notification (for any other events)
 */
export async function notifyDanzActivity(
  message: string,
  priority: 'info' | 'important' | 'urgent' = 'info',
  data?: Record<string, any>,
): Promise<void> {
  await postToFlowB('/api/v1/admin/notify', {
    source: 'danz',
    event: 'activity',
    message: `[DANZ] ${message}`,
    priority,
    data,
  })
}

export const flowbNotify = {
  notifyDanzSignup,
  notifyDanzRegistered,
  notifyDanzEventRegistration,
  notifyDanzActivity,
}
