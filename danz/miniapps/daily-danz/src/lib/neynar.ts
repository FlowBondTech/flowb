import { NeynarAPIClient } from '@neynar/nodejs-sdk'

// Neynar client for Farcaster authentication
const neynarApiKey = process.env.NEYNAR_API_KEY

// Flag to check if Neynar is configured
export const isNeynarConfigured = !!neynarApiKey

// Lazy initialization
let _neynarClient: NeynarAPIClient | null = null

export const getNeynarClient = (): NeynarAPIClient => {
  if (!isNeynarConfigured) {
    throw new Error('Neynar is not configured. Set NEYNAR_API_KEY')
  }
  if (!_neynarClient) {
    _neynarClient = new NeynarAPIClient({ apiKey: neynarApiKey! })
  }
  return _neynarClient
}

// Get user by FID
export async function getUserByFid(fid: number) {
  const client = getNeynarClient()
  const response = await client.fetchBulkUsers({ fids: [fid] })
  return response.users[0] || null
}

// Get user by username
export async function getUserByUsername(username: string) {
  const client = getNeynarClient()
  const response = await client.searchUser({ q: username, limit: 1 })
  return response.result.users[0] || null
}

// Verify a Farcaster message signature (for SIWF)
export async function verifySignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  // Note: For full SIWF, you'd verify the signature against the message
  // This is a placeholder - actual implementation depends on SIWF flow
  try {
    // In production, verify using Farcaster's verification standards
    return true
  } catch {
    return false
  }
}
