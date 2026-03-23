import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { GraphQLError } from 'graphql'
import { config } from '../../config/env.js'
import {
  ALLOWED_MIME_TYPES,
  BUCKET_NAME,
  generateUniqueKey,
  getFileType,
  s3Client,
  UPLOAD_LIMITS,
} from '../../config/s3.js'
import type { GraphQLContext } from '../context.js'

const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.userId
}

type UploadType = 'avatar' | 'cover' | 'event' | 'post' | 'general'

// Map GraphQL MimeType enum values to actual MIME type strings
const MIME_TYPE_MAP: Record<string, string> = {
  // Image MIME types
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
  IMAGE_GIF: 'image/gif',
  IMAGE_WEBP: 'image/webp',

  // Video MIME types
  VIDEO_MP4: 'video/mp4',
  VIDEO_QUICKTIME: 'video/quicktime',
  VIDEO_AVI: 'video/x-msvideo',
  VIDEO_WEBM: 'video/webm',

  // Document MIME types
  APPLICATION_PDF: 'application/pdf',
  APPLICATION_MSWORD: 'application/msword',
  APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_WORDPROCESSINGML_DOCUMENT:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export const uploadResolvers = {
  Query: {
    getUploadUrl: async (
      _: any,
      {
        fileName,
        mimeType,
        uploadType,
      }: {
        fileName: string
        mimeType: string // GraphQL enum value like 'image_jpeg'
        uploadType: UploadType
      },
      context: GraphQLContext,
    ) => {
      const userId = requireAuth(context)

      // Validate required fields
      if (!fileName || !mimeType) {
        throw new GraphQLError('Missing required fields: fileName and mimeType', {
          extensions: { code: 'BAD_REQUEST' },
        })
      }

      // Convert enum value to actual MIME type
      const actualMimeType = MIME_TYPE_MAP[mimeType]
      if (!actualMimeType) {
        throw new GraphQLError(
          `Invalid MIME type enum: ${mimeType}. Valid values: ${Object.keys(MIME_TYPE_MAP).join(', ')}`,
          {
            extensions: { code: 'BAD_REQUEST' },
          },
        )
      }

      // Get file type and validate MIME type
      const fileType = getFileType(actualMimeType)
      const allowedMimes = ALLOWED_MIME_TYPES[fileType]

      if (!allowedMimes || !allowedMimes.includes(actualMimeType)) {
        throw new GraphQLError(
          `Invalid MIME type: ${actualMimeType}. Allowed types: ${allowedMimes?.join(', ')}`,
          {
            extensions: { code: 'BAD_REQUEST' },
          },
        )
      }

      // Get size limit based on file type or upload type
      const sizeLimit =
        uploadType === 'avatar'
          ? UPLOAD_LIMITS.avatar
          : UPLOAD_LIMITS[fileType] || UPLOAD_LIMITS.default

      // Generate unique key with user-based hierarchy
      const key = generateUniqueKey(uploadType, fileName, userId)

      try {
        // Create presigned POST data with conditions
        const { url, fields } = await createPresignedPost(s3Client, {
          Bucket: BUCKET_NAME,
          Key: key,
          Conditions: [
            ['content-length-range', 0, sizeLimit], // Enforce size limit
            ['eq', '$Content-Type', actualMimeType], // Enforce exact MIME type
          ],
          Fields: {
            'Content-Type': actualMimeType,
          },
          Expires: 300, // 5 minutes
        })

        // Generate the public URL that will be accessible after upload
        // Using the Supabase storage public URL format
        const publicUrl = `${config.supabase.url}/storage/v1/object/public/${BUCKET_NAME}/${key}`

        return {
          success: true,
          uploadUrl: url,
          fields,
          key,
          publicUrl, // Return the public URL that will be available after upload
          expires: 300,
          maxSize: sizeLimit,
        }
      } catch (error: any) {
        console.error('Presigned URL generation error:', error)
        throw new GraphQLError('Failed to generate upload URL', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', error: error.message },
        })
      }
    },
  },
}
