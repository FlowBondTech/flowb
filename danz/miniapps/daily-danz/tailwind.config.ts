import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DANZ brand colors (unified with danz-web)
        danz: {
          primary: '#ff6ec7',    // Neon Pink
          secondary: '#a855f7',  // Purple
          accent: '#06b6d4',     // Cyan
          dark: '#0a0a0f',       // Background dark
          surface: '#1a1a24',    // Card/surface background
          gold: '#ffd700',       // Gold accents
        },
        // Primary palette
        primary: {
          purple: '#926f8e',
          pink: '#d25ca7',
          darkPurple: '#4a3548',
          darkerPurple: '#2a1f29',
          lightPurple: '#b89ab5',
        },
        // Neon accents
        neon: {
          pink: '#ff6ec7',
          purple: '#b967ff',
          blue: '#00d4ff',
        },
        // Background colors
        bg: {
          primary: '#0a0a0f',
          secondary: '#12121a',
          card: '#1a1a24',
          hover: '#222230',
        },
        // Text colors
        text: {
          primary: '#ffffff',
          secondary: '#b8b8c8',
          muted: '#7a7a8e',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #d25ca7 0%, #926f8e 100%)',
        'gradient-neon': 'linear-gradient(135deg, #ff6ec7 0%, #b967ff 100%)',
        'gradient-pink': 'linear-gradient(135deg, #ff6ec7 0%, #a855f7 100%)',
      },
      boxShadow: {
        'glow-pink': '0 0 30px rgba(255, 110, 199, 0.5)',
        'glow-purple': '0 0 30px rgba(185, 103, 255, 0.5)',
        'glow-sm': '0 0 15px rgba(255, 110, 199, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.8s ease-out',
        'spin-slow': 'spin 8s linear infinite',
        'level-ring': 'level-ring 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #ff6ec7, 0 0 10px #ff6ec7' },
          '100%': { boxShadow: '0 0 20px #ff6ec7, 0 0 30px #a855f7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'level-ring': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      // Miniapp viewport constraints
      maxWidth: {
        'miniapp': '424px',
      },
      maxHeight: {
        'miniapp': '695px',
      },
    },
  },
  plugins: [],
}

export default config
