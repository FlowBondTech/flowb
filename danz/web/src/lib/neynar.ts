// Neynar client for Farcaster API
// Requires: @neynar/nodejs-sdk package and NEYNAR_API_KEY env var

import type { NeynarAPIClient } from '@neynar/nodejs-sdk'

const neynarApiKey = process.env.NEYNAR_API_KEY

// Flag to check if Neynar is configured
export const isNeynarConfigured = !!neynarApiKey

// Lazy initialization
let _neynarClient: NeynarAPIClient | null = null

export const getNeynarClient = async (): Promise<NeynarAPIClient> => {
  if (!isNeynarConfigured) {
    throw new Error('Neynar is not configured. Set NEYNAR_API_KEY')
  }
  if (!_neynarClient) {
    const { NeynarAPIClient } = await import('@neynar/nodejs-sdk')
    _neynarClient = new NeynarAPIClient({ apiKey: neynarApiKey! })
  }
  return _neynarClient
}

// Get user by FID
export async function getUserByFid(fid: number) {
  const client = await getNeynarClient()
  const response = await client.fetchBulkUsers({ fids: [fid] })
  return response.users[0] || null
}

// Get user by username
export async function getUserByUsername(username: string) {
  const client = await getNeynarClient()
  const response = await client.searchUser({ q: username, limit: 1 })
  return response.result.users[0] || null
}

// Neynar user type from API response
interface NeynarUser {
  fid: number
  username: string
  display_name?: string
  pfp_url?: string
  follower_count?: number
}

// Get users the FID is following (friends to invite)
export async function getFollowing(fid: number, limit = 25): Promise<NeynarUser[]> {
  const client = await getNeynarClient()
  const response = await client.fetchUserFollowing({ fid, limit })
  // Neynar SDK v3 returns users directly, not in result.users
  return (response.users || []) as unknown as NeynarUser[]
}

// Get user's followers
export async function getFollowers(fid: number, limit = 25): Promise<NeynarUser[]> {
  const client = await getNeynarClient()
  const response = await client.fetchUserFollowers({ fid, limit })
  return (response.users || []) as unknown as NeynarUser[]
}

// Search users by query
export async function searchUsers(query: string, limit = 10): Promise<NeynarUser[]> {
  const client = await getNeynarClient()
  const response = await client.searchUser({ q: query, limit })
  return (response.result.users || []) as NeynarUser[]
}

// Type for friend data we use in the app
export interface FarcasterFriend {
  fid: number
  username: string
  displayName: string
  pfpUrl: string | null
  followerCount: number
}
