/**
 * Discord Webhook Service
 * Sends notifications to Discord for key platform events
 */

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  thumbnail?: { url: string }
  image?: { url: string }
  footer?: { text: string; icon_url?: string }
  timestamp?: string
  author?: {
    name: string
    url?: string
    icon_url?: string
  }
}

interface DiscordMessage {
  content?: string
  username?: string
  avatar_url?: string
  embeds?: DiscordEmbed[]
}

// Discord embed colors (decimal values)
const COLORS = {
  SUCCESS: 0x00d4ff, // Neon blue
  INFO: 0xb967ff, // Neon purple
  WARNING: 0xffaa00, // Orange
  ERROR: 0xff4444, // Red
  MONEY: 0x00ff88, // Green
  CELEBRATION: 0xff6ec7, // Neon pink
}

// Get webhook URLs from environment
const getWebhookUrl = (
  type: 'default' | 'alerts' | 'events' | 'users' | 'payments',
): string | null => {
  const urls: Record<string, string | undefined> = {
    default: process.env.DISCORD_WEBHOOK_URL,
    alerts: process.env.DISCORD_WEBHOOK_ALERTS || process.env.DISCORD_WEBHOOK_URL,
    events: process.env.DISCORD_WEBHOOK_EVENTS || process.env.DISCORD_WEBHOOK_URL,
    users: process.env.DISCORD_WEBHOOK_USERS || process.env.DISCORD_WEBHOOK_URL,
    payments: process.env.DISCORD_WEBHOOK_PAYMENTS || process.env.DISCORD_WEBHOOK_URL,
  }
  return urls[type] || null
}

/**
 * Send a message to Discord webhook
 */
async function sendToDiscord(
  message: DiscordMessage,
  webhookType: 'default' | 'alerts' | 'events' | 'users' | 'payments' = 'default',
): Promise<boolean> {
  const webhookUrl = getWebhookUrl(webhookType)

  if (!webhookUrl) {
    console.log(`[Discord] No webhook URL configured for type: ${webhookType}`)
    return false
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'DANZ Bot',
        avatar_url: 'https://danz.now/logo.png',
        ...message,
      }),
    })

    if (!response.ok) {
      console.error(`[Discord] Webhook failed: ${response.status} ${response.statusText}`)
      return false
    }

    return true
  } catch (error) {
    console.error('[Discord] Webhook error:', error)
    return false
  }
}

// ============================================================================
// USER EVENTS
// ============================================================================

/**
 * New user signed up (first time login via Privy)
 */
export async function notifyUserSignup(user: {
  privy_id: string
  email?: string
  wallet_address?: string
}): Promise<void> {
  const identifier =
    user.email || user.wallet_address?.slice(0, 10) + '...' || user.privy_id.slice(0, 10)

  await sendToDiscord(
    {
      embeds: [
        {
          title: '👋 New User Signed Up',
          description: `A new user has joined DANZ!`,
          color: COLORS.CELEBRATION,
          fields: [
            { name: 'Identifier', value: identifier, inline: true },
            { name: 'Auth Method', value: user.email ? 'Email' : 'Wallet', inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ Platform' },
        },
      ],
    },
    'users',
  )
}

/**
 * User completed registration (set username)
 */
export async function notifyUserRegistered(user: {
  privy_id: string
  username: string
  display_name?: string
  avatar_url?: string
  city?: string
  role?: string
}): Promise<void> {
  const fields = [
    { name: 'Username', value: `@${user.username}`, inline: true },
    { name: 'Display Name', value: user.display_name || 'Not set', inline: true },
  ]

  if (user.city) {
    fields.push({ name: 'Location', value: user.city, inline: true })
  }

  if (user.role && user.role !== 'user') {
    fields.push({ name: 'Role', value: user.role.toUpperCase(), inline: true })
  }

  await sendToDiscord(
    {
      embeds: [
        {
          title: '🎉 User Completed Registration',
          description: `**${user.display_name || user.username}** has completed their profile!`,
          color: COLORS.SUCCESS,
          fields,
          thumbnail: user.avatar_url ? { url: user.avatar_url } : undefined,
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ Platform' },
        },
      ],
    },
    'users',
  )
}

/**
 * User became an organizer
 */
export async function notifyOrganizerApproved(user: {
  username: string
  display_name?: string
  company_name?: string
}): Promise<void> {
  await sendToDiscord(
    {
      embeds: [
        {
          title: '🎪 New Event Organizer',
          description: `**${user.display_name || user.username}** is now an approved organizer!`,
          color: COLORS.INFO,
          fields: [
            { name: 'Username', value: `@${user.username}`, inline: true },
            { name: 'Company', value: user.company_name || 'Independent', inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ Platform' },
        },
      ],
    },
    'users',
  )
}

// ============================================================================
// EVENT EVENTS
// ============================================================================

/**
 * New event created
 */
export async function notifyEventCreated(event: {
  id: string
  title: string
  category?: string
  city?: string
  start_date_time: string
  facilitator_username?: string
  is_virtual?: boolean
  price_usd?: number
}): Promise<void> {
  const eventDate = new Date(event.start_date_time).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const fields = [
    { name: 'Category', value: event.category || 'General', inline: true },
    {
      name: 'Location',
      value: event.is_virtual ? '🌐 Virtual' : event.city || 'TBD',
      inline: true,
    },
    { name: 'Date', value: eventDate, inline: true },
  ]

  if (event.facilitator_username) {
    fields.push({ name: 'Organizer', value: `@${event.facilitator_username}`, inline: true })
  }

  if (event.price_usd !== undefined) {
    fields.push({
      name: 'Price',
      value: event.price_usd === 0 ? 'FREE' : `$${event.price_usd}`,
      inline: true,
    })
  }

  await sendToDiscord(
    {
      embeds: [
        {
          title: '📅 New Event Created',
          description: `**${event.title}**`,
          color: COLORS.INFO,
          fields,
          timestamp: new Date().toISOString(),
          footer: { text: `Event ID: ${event.id}` },
        },
      ],
    },
    'events',
  )
}

/**
 * User registered for an event
 */
export async function notifyEventRegistration(data: {
  event_title: string
  event_id: string
  username: string
  current_capacity: number
  max_capacity?: number
  is_waitlisted?: boolean
}): Promise<void> {
  const capacityText = data.max_capacity
    ? `${data.current_capacity}/${data.max_capacity}`
    : `${data.current_capacity} registered`

  await sendToDiscord(
    {
      embeds: [
        {
          title: data.is_waitlisted ? '⏳ New Waitlist Entry' : '🎟️ New Event Registration',
          description: `**@${data.username}** ${data.is_waitlisted ? 'joined the waitlist for' : 'registered for'} **${data.event_title}**`,
          color: data.is_waitlisted ? COLORS.WARNING : COLORS.SUCCESS,
          fields: [{ name: 'Capacity', value: capacityText, inline: true }],
          timestamp: new Date().toISOString(),
          footer: { text: `Event ID: ${data.event_id}` },
        },
      ],
    },
    'events',
  )
}

/**
 * Event is getting full (threshold reached)
 */
export async function notifyEventFillingUp(event: {
  id: string
  title: string
  current_capacity: number
  max_capacity: number
  percentage: number
}): Promise<void> {
  await sendToDiscord(
    {
      embeds: [
        {
          title: '🔥 Event Filling Up!',
          description: `**${event.title}** is ${event.percentage}% full!`,
          color: COLORS.WARNING,
          fields: [
            {
              name: 'Capacity',
              value: `${event.current_capacity}/${event.max_capacity} (${event.max_capacity - event.current_capacity} spots left)`,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: `Event ID: ${event.id}` },
        },
      ],
    },
    'events',
  )
}

// ============================================================================
// REFERRAL EVENTS
// ============================================================================

/**
 * Referral code used
 */
export async function notifyReferralUsed(data: {
  referrer_username: string
  referred_username: string
  referral_code: string
}): Promise<void> {
  await sendToDiscord(
    {
      embeds: [
        {
          title: '🎁 Referral Completed',
          description: `**@${data.referred_username}** signed up using **@${data.referrer_username}**'s referral code!`,
          color: COLORS.MONEY,
          fields: [{ name: 'Code Used', value: data.referral_code, inline: true }],
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ Referral Program' },
        },
      ],
    },
    'users',
  )
}

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

/**
 * Subscription started
 */
export async function notifySubscriptionStarted(data: {
  username: string
  plan: 'monthly' | 'yearly'
  amount: number
}): Promise<void> {
  await sendToDiscord(
    {
      embeds: [
        {
          title: '💳 New Subscription',
          description: `**@${data.username}** subscribed to DANZ Pro!`,
          color: COLORS.MONEY,
          fields: [
            { name: 'Plan', value: data.plan === 'yearly' ? 'Annual' : 'Monthly', inline: true },
            { name: 'Amount', value: `$${data.amount}`, inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ Subscriptions' },
        },
      ],
    },
    'payments',
  )
}

/**
 * Subscription cancelled
 */
export async function notifySubscriptionCancelled(data: {
  username: string
  reason?: string
}): Promise<void> {
  await sendToDiscord(
    {
      embeds: [
        {
          title: '⚠️ Subscription Cancelled',
          description: `**@${data.username}** cancelled their subscription`,
          color: COLORS.WARNING,
          fields: data.reason ? [{ name: 'Reason', value: data.reason, inline: false }] : [],
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ Subscriptions' },
        },
      ],
    },
    'payments',
  )
}

/**
 * Sponsor purchase completed (ETHDenver)
 */
export async function notifySponsorPurchase(data: {
  username: string
  tier: string
  amount: number
}): Promise<void> {
  await sendToDiscord(
    {
      embeds: [
        {
          title: '🎪 New Sponsor Purchase',
          description: `**@${data.username}** purchased the **${data.tier}** sponsor package!`,
          color: COLORS.MONEY,
          fields: [
            { name: 'Tier', value: data.tier, inline: true },
            { name: 'Amount', value: `$${data.amount}`, inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ ETHDenver Sponsorship' },
        },
      ],
    },
    'payments',
  )
}

/**
 * Payment received for event
 */
export async function notifyEventPayment(data: {
  username: string
  event_title: string
  amount: number
  currency?: string
}): Promise<void> {
  await sendToDiscord(
    {
      embeds: [
        {
          title: '💰 Event Payment Received',
          description: `**@${data.username}** paid for **${data.event_title}**`,
          color: COLORS.MONEY,
          fields: [
            {
              name: 'Amount',
              value: `${data.currency === 'DANZ' ? '' : '$'}${data.amount} ${data.currency || 'USD'}`,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ Payments' },
        },
      ],
    },
    'payments',
  )
}

// ============================================================================
// SYSTEM ALERTS
// ============================================================================

/**
 * Send system alert
 */
export async function notifySystemAlert(data: {
  title: string
  message: string
  severity: 'info' | 'warning' | 'error'
}): Promise<void> {
  const colorMap = {
    info: COLORS.INFO,
    warning: COLORS.WARNING,
    error: COLORS.ERROR,
  }

  const emojiMap = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚨',
  }

  await sendToDiscord(
    {
      embeds: [
        {
          title: `${emojiMap[data.severity]} ${data.title}`,
          description: data.message,
          color: colorMap[data.severity],
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ System Alert' },
        },
      ],
    },
    'alerts',
  )
}

/**
 * Daily stats summary
 */
export async function notifyDailyStats(stats: {
  new_users: number
  new_events: number
  registrations: number
  revenue: number
}): Promise<void> {
  await sendToDiscord(
    {
      embeds: [
        {
          title: '📊 Daily Stats Summary',
          color: COLORS.INFO,
          fields: [
            { name: '👥 New Users', value: stats.new_users.toString(), inline: true },
            { name: '📅 New Events', value: stats.new_events.toString(), inline: true },
            { name: '🎟️ Registrations', value: stats.registrations.toString(), inline: true },
            { name: '💰 Revenue', value: `$${stats.revenue.toFixed(2)}`, inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ Daily Report' },
        },
      ],
    },
    'alerts',
  )
}

/**
 * Send dev portal alert to Discord
 */
export async function sendAlert(data: {
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  source?: string
  action_url?: string
}): Promise<void> {
  const colorMap = {
    low: COLORS.INFO,
    medium: COLORS.WARNING,
    high: COLORS.ERROR,
    critical: 0xff0000, // Bright red for critical
  }

  const emojiMap = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🚨',
    critical: '🔴',
  }

  const fields = []
  if (data.source) {
    fields.push({ name: 'Source', value: data.source, inline: true })
  }
  if (data.action_url) {
    fields.push({ name: 'Action', value: `[View Details](${data.action_url})`, inline: true })
  }

  await sendToDiscord(
    {
      embeds: [
        {
          title: `${emojiMap[data.severity]} ${data.title}`,
          description: data.message,
          color: colorMap[data.severity],
          fields: fields.length > 0 ? fields : undefined,
          timestamp: new Date().toISOString(),
          footer: { text: 'DANZ Dev Alert' },
        },
      ],
    },
    'alerts',
  )
}

// Export all functions as a namespace
export const discord = {
  // User events
  notifyUserSignup,
  notifyUserRegistered,
  notifyOrganizerApproved,
  // Event events
  notifyEventCreated,
  notifyEventRegistration,
  notifyEventFillingUp,
  // Referral events
  notifyReferralUsed,
  // Payment events
  notifySubscriptionStarted,
  notifySubscriptionCancelled,
  notifySponsorPurchase,
  notifyEventPayment,
  // System alerts
  notifySystemAlert,
  notifyDailyStats,
  sendAlert,
}

export default discord
