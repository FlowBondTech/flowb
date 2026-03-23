/**
 * Gig Role Rejected Email Template
 *
 * Sent when a user's gig role application is rejected.
 */

import { baseTemplate, colors, ctaButton, emailConfig, warningBox } from './base.js'

interface GigRoleRejectedData {
  userName: string
  roleName: string
  reason?: string
}

export function gigRoleRejectedTemplate(data: GigRoleRejectedData): string {
  const content = `
    <h1 class="title">Application Update</h1>
    <p class="subtitle">Regarding your ${data.roleName} role application</p>

    <div class="content">
      <p>Hey ${data.userName},</p>
      <p>
        Thank you for your interest in the <span class="highlight">${data.roleName}</span> role.
        After reviewing your application, we weren't able to approve it at this time.
      </p>

      ${
        data.reason
          ? warningBox(`
        <p style="margin: 0; font-weight: 600; color: ${colors.warning};">Feedback:</p>
        <p style="margin: 8px 0 0 0; color: ${colors.textMuted};">${data.reason}</p>
      `)
          : ''
      }

      <p>
        Don't be discouraged! Here are some ways to strengthen your application:
      </p>

      <ul style="padding-left: 20px; margin: 8px 0; color: ${colors.textMuted};">
        <li>Add portfolio examples or work samples</li>
        <li>Include relevant certifications or training</li>
        <li>Build experience with other available roles</li>
        <li>Complete more events and earn achievements</li>
      </ul>

      <p>
        You're welcome to reapply once you've built up more experience or added supporting materials.
      </p>
    </div>

    <div style="text-align: center;">
      ${ctaButton('Explore Other Roles', `${emailConfig.baseUrl}/dashboard/gigs/roles`)}
    </div>
  `

  return baseTemplate(content, `Update on your ${data.roleName} role application`)
}

export function gigRoleRejectedSubject(data: GigRoleRejectedData): string {
  return `Update on your ${data.roleName} application`
}
