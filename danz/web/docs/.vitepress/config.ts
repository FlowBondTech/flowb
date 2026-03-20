import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'DANZ Platform',
  description: 'Dance-to-Earn Ecosystem Documentation',
  base: '/docs/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/docs/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#8B5CF6' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'DANZ Platform Documentation' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Complete technical documentation for the DANZ dance-to-earn ecosystem',
      },
    ],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'DANZ Docs',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'API Reference', link: '/api/graphql' },
      { text: 'Database', link: '/database/schema' },
      {
        text: 'Frontend',
        items: [
          { text: 'danz-web', link: '/frontend/danz-web' },
          { text: 'danz-miniapp', link: '/frontend/danz-miniapp' },
          { text: 'Prototypes', link: '/prototypes/overview' },
        ],
      },
      { text: 'Deployment', link: '/deployment/infrastructure' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Guide Index', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Project Overview', link: '/guide/overview' },
            { text: 'Tech Stack', link: '/guide/tech-stack' },
          ],
        },
        {
          text: 'Development',
          items: [
            { text: 'Local Setup', link: '/guide/local-setup' },
            { text: 'Code Conventions', link: '/guide/conventions' },
            { text: 'Workflows', link: '/guide/workflows' },
          ],
        },
        {
          text: 'Core Systems',
          items: [{ text: 'Point System', link: '/guide/point-system' }],
        },
        {
          text: 'Integration Guides',
          items: [{ text: 'Wearable Integration', link: '/guide/wearable-integration' }],
        },
        {
          text: 'Mobile Development',
          items: [{ text: 'Mobile Onboarding', link: '/guide/mobile-onboarding' }],
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Data Flow', link: '/architecture/data-flow' },
            { text: 'Security', link: '/architecture/security' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'GraphQL API',
          items: [
            { text: 'Overview', link: '/api/graphql' },
            { text: 'Authentication', link: '/api/authentication' },
            { text: 'Users', link: '/api/users' },
            { text: 'Events', link: '/api/events' },
            { text: 'Achievements', link: '/api/achievements' },
            { text: 'Social', link: '/api/social' },
          ],
        },
        {
          text: 'Cross-Platform APIs',
          items: [
            { text: 'Wearables', link: '/api/wearables' },
            { text: 'Challenges', link: '/api/challenges' },
            { text: 'Leaderboards', link: '/api/leaderboards' },
            { text: 'Activity Feed', link: '/api/activity-feed' },
            { text: 'Analytics', link: '/api/analytics' },
            { text: 'Telegram Miniapp', link: '/api/miniapp' },
          ],
        },
      ],
      '/database/': [
        {
          text: 'Database',
          items: [
            { text: 'Schema Overview', link: '/database/schema' },
            { text: 'Users Table', link: '/database/users' },
            { text: 'Events Tables', link: '/database/events' },
            { text: 'Social Tables', link: '/database/social' },
            { text: 'Cross-Platform Tables', link: '/database/cross-platform' },
            { text: 'Indexes & Performance', link: '/database/indexes' },
          ],
        },
      ],
      '/frontend/': [
        {
          text: 'Frontend Apps',
          items: [
            { text: 'danz-web', link: '/frontend/danz-web' },
            { text: 'danz-miniapp', link: '/frontend/danz-miniapp' },
          ],
        },
        {
          text: 'Components',
          items: [
            { text: 'Auth Components', link: '/frontend/components-auth' },
            { text: 'Dashboard', link: '/frontend/components-dashboard' },
          ],
        },
      ],
      '/prototypes/': [
        {
          text: 'Prototypes',
          items: [
            { text: 'Overview', link: '/prototypes/overview' },
            { text: 'Version 1: Gradient', link: '/prototypes/version1' },
            { text: 'Version 2: Cyberpunk', link: '/prototypes/version2' },
            { text: 'Version 3: Minimalist', link: '/prototypes/version3' },
            { text: 'Version 4: Retro', link: '/prototypes/version4' },
            { text: 'Version 5: Neon', link: '/prototypes/version5' },
          ],
        },
      ],
      '/deployment/': [
        {
          text: 'Deployment',
          items: [
            { text: 'Infrastructure', link: '/deployment/infrastructure' },
            { text: 'Environment Variables', link: '/deployment/environment' },
            { text: 'CI/CD', link: '/deployment/cicd' },
          ],
        },
        {
          text: 'Mobile',
          items: [{ text: 'Testing & Deployment', link: '/deployment/mobile-testing-deployment' }],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/FlowBondTech' },
      { icon: 'twitter', link: 'https://twitter.com/danzxyz' },
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    footer: {
      message: 'Built with VitePress',
      copyright: 'Copyright 2024 DANZ / FlowBond',
    },

    editLink: {
      pattern: 'https://github.com/FlowBondTech/danz-docs/edit/main/:path',
      text: 'Edit this page on GitHub',
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium',
      },
    },

    outline: {
      level: [2, 3],
      label: 'On this page',
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },

    darkModeSwitchLabel: 'Theme',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Return to top',
  },

  markdown: {
    lineNumbers: true,
    image: {
      lazyLoading: true,
    },
  },

  lastUpdated: true,
  cleanUrls: true,
})
