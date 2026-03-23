/**
 * Gig Role Approved Email Template
 *
 * Sent when a user's gig role application is approved.
 */

import { baseTemplate, colors, ctaButton, emailConfig, successBox } from './base.js'

interface GigRoleApprovedData {
  userName: string
  roleName: string
  roleDescription?: string
  approvedBy?: string
}

export function gigRoleApprovedTemplate(data: GigRoleApprovedData): string {
  const content = `
    <h1 class="title">You're Approved! 🎉</h1>
    <p class="subtitle">Your gig role application has been accepted</p>

    ${successBox(`
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.success};">
        ${data.roleName}
      </p>
      ${data.roleDescription ? `<p style="margin: 8px 0 0 0; color: ${colors.textMuted};">${data.roleDescription}</p>` : ''}
    `)}

    <div class="content">
      <p>Hey ${data.userName}!</p>
      <p>
        Great news! Your application for the <span class="highlight">${data.roleName}</span> role has been approved.
        ${data.approvedBy ? ` Approved by ${data.approvedBy}.` : ''}
      </p>
      <p>
        You can now apply for gigs that require this role. Keep an eye on the Gigs section for new opportunities!
      </p>
    </div>

    <div style="text-align: center;">
      ${ctaButton('Browse Available Gigs', `${emailConfig.baseUrl}/dashboard/gigs`)}
    </div>

    <div class="divider"></div>

    <div class="content" style="font-size: 14px;">
      <p><strong>What's next?</strong></p>
      <ul style="padding-left: 20px; margin: 8px 0;">
        <li>Browse available gigs matching your new role</li>
        <li>Apply for gigs at events you're interested in</li>
        <li>Complete gigs to earn $DANZ rewards</li>
      </ul>
    </div>
  `

  return baseTemplate(content, `Your ${data.roleName} role application has been approved!`)
}

export function gigRoleApprovedSubject(data: GigRoleApprovedData): string {
  return `✅ You're approved for ${data.roleName}!`
}
