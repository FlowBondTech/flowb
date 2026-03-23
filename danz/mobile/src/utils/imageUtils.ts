import * as ImageManipulator from 'expo-image-manipulator'
import type { ImagePickerAsset } from 'expo-image-picker'

export interface CompressedImage {
  uri: string
  width: number
  height: number
  base64?: string
  fileSize?: number
}

/**
 * Calculate quality based on file size to target ~800KB-1MB
 * Balanced compression to avoid over-compressing to 10KB
 */
const calculateQuality = (fileSize: number): number => {
  const targetSize = 1024 * 1024 // 1MB in bytes

  if (fileSize <= targetSize * 0.8) {
    // If under 800KB, no compression needed
    return 1.0
  } else if (fileSize <= targetSize) {
    // 800KB-1MB: very light compression
    return 0.95
  } else if (fileSize <= targetSize * 2) {
    // 1-2MB: moderate compression
    return 0.85
  } else if (fileSize <= targetSize * 4) {
    // 2-4MB: compress to 70%
    return 0.7
  } else if (fileSize <= targetSize * 8) {
    // 4-8MB: compress to 60%
    return 0.6
  } else {
    // >8MB: heavier compression but not too aggressive
    return 0.5
  }
}

/**
 * Compress image to target size (~1MB)
 * Implements multi-pass compression to ensure files stay under 1MB
 */
export const compressImage = async (
  imageAsset: ImagePickerAsset,
  type: 'avatar' | 'cover' | 'event' | 'post' | 'general' = 'avatar',
): Promise<CompressedImage> => {
  try {
    // First, get actual file size if possible
    let actualSize = 0
    try {
      actualSize = await getFileSize(imageAsset.uri)
    } catch {
      // If we can't get actual size, estimate from dimensions
      // Using 3 bytes per pixel for compressed JPEG estimate (not 4 for RGBA)
      actualSize = (imageAsset.width * imageAsset.height * 3) / 4
    }

    // Log the actual/estimated size for debugging
    console.log(`Original image size: ${formatFileSize(actualSize)}`)

    // Different max dimensions based on type - increased for better quality
    let maxDimensions: { width: number; height: number }
    switch (type) {
      case 'avatar':
        maxDimensions = { width: 800, height: 800 } // Good quality for avatars
        break
      case 'cover':
      case 'event':
      case 'post':
      case 'general':
      default:
        maxDimensions = { width: 1920, height: 1080 } // Full HD for covers and posts
        break
    }

    // Calculate resize dimensions maintaining aspect ratio
    const aspectRatio = imageAsset.width / imageAsset.height
    let targetWidth = maxDimensions.width
    let targetHeight = maxDimensions.height

    if (type === 'avatar') {
      // For avatar, make it square but don't upscale
      targetWidth = Math.min(imageAsset.width, maxDimensions.width)
      targetHeight = targetWidth
    } else {
      // For cover, maintain aspect ratio but don't upscale
      if (imageAsset.width <= maxDimensions.width && imageAsset.height <= maxDimensions.height) {
        targetWidth = imageAsset.width
        targetHeight = imageAsset.height
      } else if (aspectRatio > maxDimensions.width / maxDimensions.height) {
        targetWidth = maxDimensions.width
        targetHeight = Math.round(maxDimensions.width / aspectRatio)
      } else {
        targetHeight = maxDimensions.height
        targetWidth = Math.round(maxDimensions.height * aspectRatio)
      }
    }

    // Start with calculated quality based on size
    let quality = calculateQuality(actualSize)
    const targetSizeBytes = 1024 * 1024 // Target 1MB
    const minSizeBytes = 100 * 1024 // Minimum 100KB to avoid over-compression
    let manipResult = null
    let attempts = 0
    const maxAttempts = 3

    // Multi-pass compression to ensure we get proper size (not too small, not too large)
    while (attempts < maxAttempts) {
      manipResult = await ImageManipulator.manipulateAsync(
        imageAsset.uri,
        [
          {
            resize: {
              width: Math.round(targetWidth),
              height: Math.round(targetHeight),
            },
          },
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      )

      // Try to get actual compressed size
      let compressedSize = 0
      try {
        compressedSize = await getFileSize(manipResult.uri)
      } catch {
        // Estimate compressed size if we can't get actual
        compressedSize = (manipResult.width * manipResult.height * 3 * quality) / 4
      }

      console.log(
        `Attempt ${attempts + 1}: Compressed to ${formatFileSize(compressedSize)} with quality ${quality}`,
      )

      // If size is in the acceptable range, we're done
      if (compressedSize <= targetSizeBytes && compressedSize >= minSizeBytes) {
        console.log(
          `Successfully compressed ${type} from ${formatFileSize(actualSize)} to ${formatFileSize(compressedSize)}`,
        )
        return {
          uri: manipResult.uri,
          width: manipResult.width,
          height: manipResult.height,
          fileSize: compressedSize,
        }
      }

      // If file is too small (over-compressed), increase quality
      if (compressedSize < minSizeBytes) {
        quality = Math.min(1.0, quality * 1.2) // Increase quality by 20%
        console.log(
          `File too small (${formatFileSize(compressedSize)}), increasing quality to ${quality}`,
        )
      }
      // If file is too large, reduce quality
      else if (compressedSize > targetSizeBytes) {
        quality = Math.max(0.5, quality * 0.85) // Reduce quality by 15%
        targetWidth = Math.round(targetWidth * 0.95) // Slightly reduce dimensions
        targetHeight = Math.round(targetHeight * 0.95)
        console.log(
          `File too large (${formatFileSize(compressedSize)}), reducing quality to ${quality}`,
        )
      }

      attempts++
    }

    // If we still couldn't get it small enough, return the last attempt
    if (manipResult) {
      console.warn(`Could not compress ${type} to under 1MB after ${maxAttempts} attempts`)
      return {
        uri: manipResult.uri,
        width: manipResult.width,
        height: manipResult.height,
        fileSize: targetSizeBytes, // Use estimated size
      }
    }

    throw new Error('Failed to compress image')
  } catch (error) {
    console.error('Image compression error:', error)
    // Return original if compression fails
    return {
      uri: imageAsset.uri,
      width: imageAsset.width,
      height: imageAsset.height,
    }
  }
}

/**
 * Get file size from URI (approximate)
 */
export const getFileSize = async (uri: string): Promise<number> => {
  try {
    const response = await fetch(uri)
    const blob = await response.blob()
    return blob.size
  } catch (error) {
    console.error('Error getting file size:', error)
    return 0
  }
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}
