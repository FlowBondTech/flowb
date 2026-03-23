/**
 * Base Email Template
 *
 * Common layout and styling for all DANZ emails.
 */

import { emailConfig } from '../../config/email.js'

// Brand colors
const colors = {
  primary: '#8B5CF6', // Purple
  secondary: '#EC4899', // Pink
  background: '#0F0F23', // Dark background
  cardBg: '#1A1A2E', // Card background
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#374151',
}

/**
 * Wrap content in the base email template
 */
export function baseTemplate(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>DANZ</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${colors.background};
      color: ${colors.text};
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background-color: ${colors.cardBg};
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 20px;
      border: 1px solid ${colors.border};
    }
    .header {
      text-align: center;
      padding: 20px 0;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      margin: 0 0 16px 0;
      color: ${colors.text};
    }
    .subtitle {
      font-size: 16px;
      color: ${colors.textMuted};
      margin: 0 0 24px 0;
    }
    .content {
      font-size: 16px;
      line-height: 1.6;
      color: ${colors.textMuted};
    }
    .highlight {
      color: ${colors.text};
      font-weight: 600;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
      color: ${colors.text} !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .info-box {
      background-color: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }
    .success-box {
      background-color: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }
    .warning-box {
      background-color: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }
    .reward {
      font-size: 28px;
      font-weight: bold;
      color: ${colors.primary};
    }
    .rating {
      font-size: 24px;
    }
    .divider {
      border-top: 1px solid ${colors.border};
      margin: 24px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: ${colors.textMuted};
      font-size: 14px;
    }
    .footer a {
      color: ${colors.primary};
      text-decoration: none;
    }
    .preheader {
      display: none !important;
      visibility: hidden;
      mso-hide: all;
      font-size: 1px;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  ${preheader ? `<div class="preheader">${preheader}</div>` : ''}
  <div class="container">
    <div class="header">
      <div class="logo">DANZ</div>
    </div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>You're receiving this because you're a member of DANZ.</p>
      <p>
        <a href="${emailConfig.baseUrl}/dashboard/settings">Manage notifications</a> |
        <a href="${emailConfig.baseUrl}">Visit DANZ</a>
      </p>
      <p>&copy; ${new Date().getFullYear()} DANZ. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Create a CTA button
 */
export function ctaButton(text: string, url: string): string {
  return `<a href="${url}" class="button" style="color: #FFFFFF !important;">${text}</a>`
}

/**
 * Create an info box
 */
export function infoBox(content: string): string {
  return `<div class="info-box">${content}</div>`
}

/**
 * Create a success box
 */
export function successBox(content: string): string {
  return `<div class="success-box">${content}</div>`
}

/**
 * Create a warning box
 */
export function warningBox(content: string): string {
  return `<div class="warning-box">${content}</div>`
}

export { colors, emailConfig }
