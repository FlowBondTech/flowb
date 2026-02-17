import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'FlowB Docs',
  description: 'Your EthDenver companion -- events, crews, and points',
  base: '/docs/',

  head: [
    ['meta', { name: 'theme-color', content: '#0a0a0a' }],
  ],

  appearance: 'dark',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Features', link: '/features' },
      { text: 'Bot', link: '/commands' },
      { text: 'API', link: '/api' },
      { text: 'Plugins', link: '/plugins/' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Features', link: '/features' },
          { text: 'Architecture', link: '/architecture' },
        ],
      },
      {
        text: 'Telegram Bot',
        items: [
          { text: 'Commands', link: '/commands' },
          { text: 'Bot Reference', link: '/bot' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'API Reference', link: '/api' },
        ],
      },
      {
        text: 'Plugins',
        items: [
          { text: 'Overview', link: '/plugins/' },
          { text: 'Flow', link: '/plugins/flow' },
          { text: 'Points', link: '/plugins/points' },
          { text: 'eGator Events', link: '/plugins/egator' },
          { text: 'Neynar (Farcaster)', link: '/plugins/neynar' },
          { text: 'DANZ', link: '/plugins/danz' },
        ],
      },
      {
        text: 'Backend',
        items: [
          { text: 'Services', link: '/services' },
        ],
      },
      {
        text: 'Points & Rewards',
        items: [
          { text: 'Points System', link: '/points' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/FlowBondTech/flowb' },
    ],

    footer: {
      message: 'Built for EthDenver | Docs auto-generated hourly',
      copyright: 'FlowB by FlowBond',
    },

    search: {
      provider: 'local',
    },
  },
})
