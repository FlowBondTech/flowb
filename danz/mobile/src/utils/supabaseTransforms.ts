/**
 * Supabase Image Transformation Utilities
 * Documentation: https://supabase.com/docs/guides/storage/serving/image-transformations
 */

export interface TransformOptions {
  width?: number
  height?: number
  resize?: 'cover' | 'contain' | 'fill'
  quality?: number
  format?: 'origin' | 'webp' | 'avif'
}

const disableImageTransforms = true // Set to true to disable Supabase image transformations globally

/**
 * Apply Supabase image transformations to a storage URL
 */
export const getTransformedUrl = (originalUrl: string, options: TransformOptions): string => {
  if (!originalUrl) return ''

  if (disableImageTransforms) return originalUrl

  // Check if URL is from Supabase Storage
  if (!originalUrl.includes('/storage/v1/object/public/')) {
    return originalUrl
  }

  // Check if already transformed
  if (originalUrl.includes('/render/image/')) {
    return originalUrl
  }

  // Build transformation URL
  const baseUrl = originalUrl.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  )

  // Build query parameters
  const params = new URLSearchParams()

  if (options.width) params.append('width', options.width.toString())
  if (options.height) params.append('height', options.height.toString())
  if (options.resize) params.append('resize', options.resize)
  if (options.quality) params.append('quality', options.quality.toString())
  if (options.format) params.append('format', options.format)

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

/**
 * Preset transformations for common use cases
 */
export const transformPresets = {
  avatarThumbnail: {
    width: 200,
    height: 200,
    resize: 'cover' as const,
    quality: 80,
  },
  avatarFull: {
    width: 400,
    height: 400,
    resize: 'cover' as const,
    quality: 85,
  },
  coverThumbnail: {
    width: 800,
    height: 450,
    resize: 'cover' as const,
    quality: 80,
  },
  coverFull: {
    width: 1920,
    height: 1080,
    resize: 'cover' as const,
    quality: 85,
  },
  feedImage: {
    width: 600,
    height: 600,
    resize: 'contain' as const,
    quality: 80,
  },
}

/**
 * Get avatar URL with appropriate transformations
 */
export const getAvatarUrl = (url: string, size: 'thumbnail' | 'full' = 'thumbnail'): string => {
  const preset =
    size === 'thumbnail' ? transformPresets.avatarThumbnail : transformPresets.avatarFull
  return getTransformedUrl(url, preset)
}

/**
 * Get cover image URL with appropriate transformations
 */
export const getCoverUrl = (url: string, size: 'thumbnail' | 'full' = 'thumbnail'): string => {
  const preset = size === 'thumbnail' ? transformPresets.coverThumbnail : transformPresets.coverFull
  return getTransformedUrl(url, preset)
}
