/**
 * DANZ Wallet Type Definitions
 * Unified wallet system supporting embedded (Privy) and linked (external) wallets
 */

export type ChainType = 'ethereum' | 'solana'
export type WalletType = 'embedded' | 'linked'
export type WalletClientType =
  | 'privy'
  | 'metamask'
  | 'phantom'
  | 'coinbase'
  | 'walletconnect'
  | 'unknown'
export type TransactionType = 'send' | 'receive' | 'contract' | 'swap' | 'mint' | 'burn'
export type TransactionStatus = 'pending' | 'confirmed' | 'failed'

/**
 * Unified wallet interface for all wallet types
 */
export interface UnifiedWallet {
  id: string // Unique identifier (address + chain)
  address: string // Wallet address
  chainType: ChainType // ethereum or solana
  walletType: WalletType // embedded (Privy) or linked (external)
  walletClientType: WalletClientType // Specific wallet provider
  network: string // Display name: "Base", "Solana Mainnet"
  networkId: string // Chain ID (8453 for Base) or network name
  symbol: string // Native token: "ETH", "SOL"
  balance: string // Raw balance in wei/lamports
  balanceFormatted: string // Human-readable balance
  balanceUsd: string // USD value
  isDefault: boolean // Is this the default wallet for its chain?
  canSign: boolean // Can sign transactions (embedded wallets)
  createdAt: number // Timestamp when linked/created
  lastActivity?: number // Last transaction timestamp
  icon?: string // Wallet provider icon URL
}

/**
 * Wallet preferences stored locally
 */
export interface WalletPreferences {
  defaultEthWalletId: string | null
  defaultSolWalletId: string | null
  showTestnets: boolean
  hideZeroBalances: boolean
  preferredCurrency: 'USD' | 'EUR' | 'GBP'
}

/**
 * Parameters for sending a transaction
 */
export interface SendTransactionParams {
  fromWalletId: string
  toAddress: string
  amount: string // Human-readable amount (e.g., "0.05")
  chainType: ChainType
  // Ethereum-specific
  gasLimit?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  // Solana-specific
  priorityFee?: number
}

/**
 * Transaction record
 */
export interface Transaction {
  id: string // Transaction hash/signature
  walletAddress: string
  chainType: ChainType
  type: TransactionType
  status: TransactionStatus
  amount: string // Raw amount
  amountFormatted: string // Human-readable amount
  amountUsd: string // USD value at time of transaction
  symbol: string // Token symbol
  from: string
  to: string
  gasFee: string // Gas fee in native token
  gasFeeUsd: string // Gas fee in USD
  timestamp: number
  blockNumber?: number
  explorerUrl: string
  memo?: string // Optional transaction memo
}

/**
 * Gas estimation result
 */
export interface GasEstimate {
  chainType: ChainType
  gasLimit: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  estimatedFee: string // Fee in native token
  estimatedFeeUsd: string // Fee in USD
  speed: 'slow' | 'normal' | 'fast'
  estimatedTime: string // e.g., "~30 seconds"
  isLoading: boolean
  error: string | null
}

/**
 * Wallet linking state
 */
export interface WalletLinkState {
  status: 'idle' | 'connecting' | 'signing' | 'success' | 'error'
  error: string | null
  connectedAddress: string | null
  selectedChain: ChainType | null
}

/**
 * Wallet action types for modals
 */
export type WalletAction = 'send' | 'receive' | 'link' | 'settings'

/**
 * Quick action button configuration
 */
export interface QuickAction {
  id: WalletAction
  label: string
  icon: string
  gradient?: [string, string]
  onPress: () => void
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  chainType: ChainType
  name: string
  networkId: string
  rpcUrl: string
  explorerUrl: string
  nativeSymbol: string
  decimals: number
  iconColor: string
}

/**
 * Supported networks
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  base: {
    chainType: 'ethereum',
    name: 'Base',
    networkId: '8453',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeSymbol: 'ETH',
    decimals: 18,
    iconColor: '#0052FF',
  },
  solana: {
    chainType: 'solana',
    name: 'Solana',
    networkId: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    nativeSymbol: 'SOL',
    decimals: 9,
    iconColor: '#9945FF',
  },
}

/**
 * Wallet provider configurations
 */
export const WALLET_PROVIDERS: Record<
  WalletClientType,
  { name: string; icon: string; color: string }
> = {
  privy: { name: 'DANZ Wallet', icon: 'wallet', color: '#FF6EC7' },
  metamask: { name: 'MetaMask', icon: 'metamask', color: '#F6851B' },
  phantom: { name: 'Phantom', icon: 'phantom', color: '#AB9FF2' },
  coinbase: { name: 'Coinbase Wallet', icon: 'coinbase', color: '#0052FF' },
  walletconnect: { name: 'WalletConnect', icon: 'walletconnect', color: '#3B99FC' },
  unknown: { name: 'External Wallet', icon: 'wallet', color: '#888888' },
}

/**
 * Helper to create wallet ID from address and chain
 */
export const createWalletId = (address: string, chainType: ChainType): string => {
  return `${chainType}:${address.toLowerCase()}`
}

/**
 * Helper to truncate address for display
 */
export const truncateAddress = (address: string, chars = 4): string => {
  if (!address) return ''
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Format balance with proper decimals
 */
export const formatBalance = (balance: string, decimals: number = 6): string => {
  const num = parseFloat(balance)
  if (isNaN(num)) return '0'
  if (num === 0) return '0'
  if (num < 0.000001) return '<0.000001'
  return num.toFixed(decimals).replace(/\.?0+$/, '')
}

/**
 * Format USD value
 */
export const formatUsd = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
