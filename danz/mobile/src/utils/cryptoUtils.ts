import * as Crypto from 'expo-crypto'

/**
 * Crypto utilities for React Native using expo-crypto
 */

// Generate a random UUID
export const generateUUID = async (): Promise<string> => {
  return Crypto.randomUUID()
}

// Generate random bytes
export const generateRandomBytes = async (byteCount: number): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(byteCount)
  return Buffer.from(randomBytes).toString('hex')
}

// Create SHA256 hash (supported by expo-crypto)
export const createSHA256Hash = async (data: string): Promise<string> => {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data)
  return hash
}

// Create SHA512 hash (supported by expo-crypto)
export const createSHA512Hash = async (data: string): Promise<string> => {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA512, data)
  return hash
}

// Generate a secure random string for order IDs
export const generateSecureOrderId = async (prefix: string = 'order'): Promise<string> => {
  const timestamp = Date.now()
  const randomPart = await generateRandomBytes(8)
  return `${prefix}_${timestamp}_${randomPart}`
}
