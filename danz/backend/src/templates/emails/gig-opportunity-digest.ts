/**
 * Gig Opportunity Digest Email Template
 *
 * Sent as a weekly digest of new gig opportunities.
 */

import { baseTemplate, colors, ctaButton, emailConfig, infoBox } from './base.js'

interface GigOpportunity {
  id: string
  title: string
  roleName: string
  eventTitle: string
  eventDate: string
  eventLocation?: string
  danzReward: number
  slotsAvailable: number
}

interface GigOpportunityDigestData {
  userName: string
  opportunities: GigOpportunity[]
  totalOpportunities: number
  userRoles: string[]
}

export function gigOpportunityDigestTemplate(data: GigOpportunityDigestData): string {
  const opportunityCards = data.opportunities
    .slice(0, 5)
    .map(
      gig => `
    <div style="background: ${colors.cardBg}; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid ${colors.border};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <p style="margin: 0; font-weight: 600; color: ${colors.text};">${gig.title}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: ${colors.textMuted};">
            ${gig.roleName} • ${gig.eventTitle}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: ${colors.textMuted};">
            📅 ${gig.eventDate} ${gig.eventLocation ? `• 📍 ${gig.eventLocation}` : ''}
          </p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${colors.primary};">${gig.danzReward}</p>
          <p style="margin: 0; font-size: 12px; color: ${colors.textMuted};">$DANZ</p>
        </div>
      </div>
      <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: ${colors.success};">${gig.slotsAvailable} slot${gig.slotsAvailable !== 1 ? 's' : ''} available</span>
        <a href="${emailConfig.baseUrl}/dashboard/gigs?id=${gig.id}" style="color: ${colors.primary}; font-size: 13px; text-decoration: none; font-weight: 600;">
          Apply →
        </a>
      </div>
    </div>
  `,
    )
    .join('')

  const content = `
    <h1 class="title">New Gig Opportunities 🎯</h1>
    <p class="subtitle">${data.totalOpportunities} gigs matching your skills</p>

    <div class="content">
      <p>Hey ${data.userName}!</p>
      <p>
        We found <span class="highlight">${data.totalOpportunities} new gig opportunities</span>
        that match your approved roles: ${data.userRoles.join(', ')}.
      </p>
    </div>

    <div style="margin: 24px 0;">
      ${opportunityCards}
    </div>

    ${
      data.opportunities.length > 5
        ? `
    ${infoBox(`
      <p style="margin: 0; text-align: center; color: ${colors.textMuted};">
        Plus ${data.totalOpportunities - 5} more opportunities waiting for you!
      </p>
    `)}
    `
        : ''
    }

    <div style="text-align: center; margin-top: 24px;">
      ${ctaButton('View All Gigs', `${emailConfig.baseUrl}/dashboard/gigs`)}
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px;">
      <p><strong>Quick Tips:</strong></p>
      <ul style="padding-left: 20px; margin: 8px 0; color: ${colors.textMuted};">
        <li>Apply early – popular gigs fill up fast!</li>
        <li>Add a personal note explaining why you're a great fit</li>
        <li>Maintain a high rating to boost your approval chances</li>
      </ul>
    </div>

    <div style="text-align: center; margin-top: 16px;">
      <p style="font-size: 12px; color: ${colors.textMuted};">
        Don't want these emails?
        <a href="${emailConfig.baseUrl}/dashboard/settings" style="color: ${colors.primary}; text-decoration: none;">
          Update your notification preferences
        </a>
      </p>
    </div>
  `

  return baseTemplate(content, `${data.totalOpportunities} new gigs match your skills!`)
}

export function gigOpportunityDigestSubject(data: GigOpportunityDigestData): string {
  return `🎯 ${data.totalOpportunities} new gig opportunities for you!`
}
