import { S3Client } from '@aws-sdk/client-s3'
import { config } from './env.js'

// Initialize S3 client for Supabase Storage
export const s3Client = new S3Client({
  endpoint: config.supabase.s3.endpoint,
  region: config.supabase.s3.region,
  credentials: {
    accessKeyId: config.supabase.s3.accessKeyId,
    secretAccessKey: config.supabase.s3.secretAccessKey,
  },
  forcePathStyle: true,
})

// Bucket name from config
export const BUCKET_NAME = config.supabase.s3.bucketName

// Upload size limits (in bytes)
export const UPLOAD_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB for images
  video: 100 * 1024 * 1024, // 100MB for videos
  document: 10 * 1024 * 1024, // 10MB for documents
  avatar: 2 * 1024 * 1024, // 2MB for avatars
  default: 5 * 1024 * 1024, // 5MB default
}

// Allowed MIME types
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  default: [], // Add default case for type safety
}

// Get file type from MIME type
export const getFileType = (mimeType: string): keyof typeof UPLOAD_LIMITS => {
  for (const [type, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as keyof typeof UPLOAD_LIMITS
    }
  }
  return 'default'
}

// Generate unique key with hierarchical structure
export const generateUniqueKey = (
  uploadType: 'avatar' | 'cover' | 'event' | 'post' | 'general',
  filename: string,
  userId: string,
): string => {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = filename.split('.').pop() || 'jpg'

  // Sanitize filename - remove extension and special characters
  const baseName = filename
    .split('.')[0]
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 30) // Shorter to keep paths manageable

  // Build hierarchical path based on upload type
  let path: string

  switch (uploadType) {
    case 'avatar':
      // User profile pictures: users/{userId}/avatar/avatar-{timestamp}-{random}.ext
      path = `users/${userId}/avatar/avatar-${timestamp}-${randomString}.${extension}`
      break

    case 'cover':
      // User cover images: users/{userId}/cover/cover-{timestamp}-{random}.ext
      path = `users/${userId}/cover/cover-${timestamp}-${randomString}.${extension}`
      break

    case 'event':
      // Event images: events/{userId}/event-{timestamp}-{random}-{name}.ext
      path = `events/${userId}/event-${timestamp}-${randomString}-${baseName}.${extension}`
      break

    case 'post':
      // Feed posts: posts/{userId}/post-{timestamp}-{random}.ext
      path = `posts/${userId}/post-${timestamp}-${randomString}.${extension}`
      break

    case 'general':
    default:
      // General files: general/{userId}/file-{timestamp}-{random}-{name}.ext
      path = `general/${userId}/file-${timestamp}-${randomString}-${baseName}.${extension}`
      break
  }

  return path
}
