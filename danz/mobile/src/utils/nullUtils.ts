/**
 * Utility functions for handling null values in TypeScript
 */

/**
 * Converts a nullable value to undefined
 * Useful for GraphQL Maybe types
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value
}

/**
 * Converts a nullable array to undefined
 */
export function nullArrayToUndefined<T>(value: T[] | null | undefined): T[] | undefined {
  return value === null ? undefined : value
}
