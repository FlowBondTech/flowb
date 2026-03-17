import type { Metadata } from 'next'
import './globals.css'
import './styles.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'DANZ NOW - Move. Connect. Earn.',
  description:
    'The app that rewards you for dancing, hosting events, and finding your vibe. Transform your passion for movement into meaningful connections and real rewards.',
  keywords: 'dance, rewards, move to earn, dance app, social dance, dance community',
  manifest: '/manifest.json',
  themeColor: '#a855f7',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DANZ',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'DANZ NOW - Move. Connect. Earn.',
    description: 'The movement tech platform for dancers worldwide',
    url: 'https://danz.now',
    siteName: 'DANZ NOW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DANZ NOW - Move. Connect. Earn.',
    description: 'The movement tech platform for dancers worldwide',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

// Inline script to prevent flash of unstyled content (FOUC)
// Sets initial theme before React hydrates
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('danz-theme-mode');
    var useSystem = localStorage.getItem('danz-use-system-theme') === 'true';
    var mode = 'dark'; // default to dark

    if (useSystem) {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else if (stored) {
      mode = stored;
    }

    document.documentElement.classList.add('theme-' + mode);
    document.documentElement.style.colorScheme = mode;

    // Apply dark fallback background immediately
    if (mode === 'dark') {
      document.documentElement.style.setProperty('--color-bg-primary-rgb', '10 10 15');
      document.documentElement.style.setProperty('--color-text-primary-rgb', '255 255 255');
    } else {
      document.documentElement.style.setProperty('--color-bg-primary-rgb', '248 250 252');
      document.documentElement.style.setProperty('--color-text-primary-rgb', '15 23 42');
    }
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="theme-dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
