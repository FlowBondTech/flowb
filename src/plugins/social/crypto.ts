/**
 * AES-256-GCM encryption for per-org Postiz API keys.
 *
 * Keys are stored encrypted in Supabase. Only the FlowB backend
 * can decrypt them using the SOCIAL_ENCRYPTION_KEY env var.
 */

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns base64-encoded iv:ciphertext:tag.
 */
export function encrypt(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes (64 hex chars)");

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // iv:encrypted:tag all base64
  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${tag.toString("base64")}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Expects base64-encoded iv.ciphertext.tag format.
 */
export function decrypt(encryptedStr: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes (64 hex chars)");

  const parts = encryptedStr.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");

  const iv = Buffer.from(parts[0], "base64");
  const encrypted = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final("utf8");
}
