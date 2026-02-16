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
      { text: 'Commands', link: '/commands' },
      { text: 'Points', link: '/points' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Features', link: '/features' },
        ],
      },
      {
        text: 'Telegram Bot',
        items: [
          { text: 'Commands', link: '/commands' },
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
      { icon: 'github', link: 'https://github.com/flowbond' },
    ],

    footer: {
      message: 'Built for EthDenver',
      copyright: 'FlowB by FlowBond',
    },

    search: {
      provider: 'local',
    },
  },
})
