declare namespace NodeJS {
  interface ProcessEnv {
    // GraphQL API endpoint
    NEXT_PUBLIC_API_URL: string
    // Miniapp URL for manifest
    NEXT_PUBLIC_MINIAPP_URL: string
    // Chain ID (Base = 8453, Base Sepolia = 84532)
    NEXT_PUBLIC_CHAIN_ID: string
    // Optional: OnchainKit API key (only if using OnchainKit components)
    NEXT_PUBLIC_ONCHAINKIT_API_KEY?: string
    // Optional: WalletConnect Project ID (only if using WalletConnect)
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string
  }
}
