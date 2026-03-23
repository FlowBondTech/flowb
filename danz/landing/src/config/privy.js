// Import only available Solana wallet adapters
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  // BackpackWalletAdapter might not be exported, commenting out
  // GlowWalletAdapter might not be exported, commenting out
  // BraveWalletAdapter might not be exported, commenting out
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets'

// Configure available Solana wallets
const solanaWallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new CoinbaseWalletAdapter(),
]

// Privy configuration with Solana support
export const privyConfig = {
  appId: 'cmei6qqd0007hl20cjvh0h5md',
  
  // Appearance customization
  appearance: {
    theme: 'dark',
    accentColor: '#FF6EC7', // DANZ pink color
    showWalletLoginFirst: false, // Show all options
    logo: '/danz-icon-pink.png', // DANZ logo
    loginMessage: 'Move. Connect. Earn.',
    walletChainType: 'ethereum-and-solana', // Show both chains
    // Custom theme variables for deeper customization
    themeVariables: {
      // Colors
      colorBackground: '#0a0a0f', // Dark background
      colorBackgroundSecondary: '#1a0a1a', // Slightly lighter
      colorText: '#ffffff',
      colorTextSecondary: '#b8b8b8',
      colorAccent: '#FF6EC7', // DANZ pink
      colorAccentHover: '#ff4eb2',
      colorError: '#ff6b6b',
      colorSuccess: '#4caf50',
      
      // Borders and surfaces
      colorBorder: 'rgba(255, 110, 199, 0.2)',
      colorBorderFocused: '#FF6EC7',
      
      // Typography
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSizeBase: '16px',
      fontSizeSmall: '14px',
      fontSizeLarge: '18px',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '700',
      
      // Spacing
      spacingSmall: '8px',
      spacingBase: '16px',
      spacingLarge: '24px',
      
      // Border radius
      borderRadius: '12px',
      borderRadiusLarge: '16px',
      borderRadiusSmall: '8px',
      
      // Shadows
      boxShadow: '0 4px 12px rgba(255, 110, 199, 0.15)',
      boxShadowHover: '0 8px 24px rgba(255, 110, 199, 0.25)',
      
      // Transitions
      transitionDuration: '0.2s',
      transitionTiming: 'ease-in-out',
    },
  },
  
  // Login methods - enabling email, social, and wallets
  loginMethods: [
    'email',
    'google', 
    'twitter',
    'discord',
    'wallet', // Enables all wallet types (ETH and Solana)
  ],
  
  // Embedded wallets configuration
  embeddedWallets: {
    createOnLogin: 'users-without-wallets', // Create embedded wallet for email/social users
    noPromptOnSignature: false,
  },
  
  // External wallets configuration - SOLANA SUPPORT
  externalWallets: {
    solana: {
      connectors: solanaWallets, // Phantom, Solflare, Coinbase
    },
  },
  
  // Wallet connection settings (optional)
  walletConnectModalOptions: {
    // projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Optional: Get from https://cloud.walletconnect.com
    themeMode: 'dark',
    themeVariables: {
      '--w3m-color-mix': '#FF6EC7',
      '--w3m-color-mix-strength': 20,
    },
  },
}