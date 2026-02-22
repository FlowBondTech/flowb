import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'FlowB',
  description: 'Your EthDenver companion — events, crews, and points',
  base: '/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['meta', { name: 'theme-color', content: '#0a0a0a' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],

  appearance: 'dark',

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'FlowB',

    nav: [
      { text: 'Guide', link: '/features' },
      { text: 'Bot', link: '/commands' },
      { text: 'API', link: '/api' },
      {
        text: 'Apps',
        items: [
          { text: 'Farcaster Mini App', link: '/farcaster-miniapp' },
          { text: 'Telegram Mini App', link: '/telegram-miniapp' },
          { text: 'Mobile (iOS)', link: '/mobile' },
        ],
      },
    ],

    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'What is FlowB?', link: '/' },
            { text: 'Features', link: '/features' },
            { text: 'Architecture', link: '/architecture' },
          ],
        },
        {
          text: 'Telegram Bot',
          collapsed: false,
          items: [
            { text: 'Commands', link: '/commands' },
          ],
        },
        {
          text: 'Mini Apps',
          collapsed: false,
          items: [
            { text: 'Farcaster', link: '/farcaster-miniapp' },
            { text: 'Telegram', link: '/telegram-miniapp' },
            { text: 'Mobile (iOS)', link: '/mobile' },
          ],
        },
        {
          text: 'API & Backend',
          collapsed: false,
          items: [
            { text: 'API Reference', link: '/api' },
            { text: 'Services', link: '/services' },
            { text: 'Agents (x402)', link: '/agents' },
          ],
        },
        {
          text: 'Plugins',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/plugins/' },
            { text: 'Flow', link: '/plugins/flow' },
            { text: 'Points', link: '/plugins/points' },
            { text: 'eGator Events', link: '/plugins/egator' },
            { text: 'Neynar (Farcaster)', link: '/plugins/neynar' },
            { text: 'DANZ', link: '/plugins/danz' },
            { text: 'AgentKit', link: '/plugins/agentkit' },
          ],
        },
        {
          text: 'Points & Rewards',
          collapsed: false,
          items: [
            { text: 'Points System', link: '/points' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/FlowBondTech/flowb' },
    ],

    editLink: {
      pattern: 'https://github.com/FlowBondTech/flowb/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Built for EthDenver 2026',
      copyright: 'FlowB by FlowBond',
    },

    search: {
      provider: 'local',
    },
  },
})
