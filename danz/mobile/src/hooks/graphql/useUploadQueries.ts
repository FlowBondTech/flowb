/**
 * Upload Hooks using GraphQL for presigned URLs
 *
 * These hooks handle file uploads to S3 using presigned URLs from GraphQL
 */

import { useLazyQuery } from '@apollo/client/react'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useState } from 'react'
import Toast from 'react-native-toast-message'
import {
  GetUploadUrlDocument,
  type GetUploadUrlQuery,
  MimeType,
  UploadType,
} from '../../generated/graphql'
import { compressImage } from '../../utils/imageUtils'

// Types
export interface PresignedUrlResponse {
  success: boolean
  uploadUrl: string
  fields: Record<string, string>
  key: string
  publicUrl: string
  expires: number
  maxSize: number
}

export interface UploadOptions {
  type: 'avatar' | 'cover' | 'event' | 'post' | 'general'
  compress?: boolean
}

// Map file types to GraphQL enum values
const getMimeTypeEnum = (mimeType: string): MimeType => {
  const mimeMap: Record<string, MimeType> = {
    'image/jpeg': MimeType.ImageJpeg,
    'image/png': MimeType.ImagePng,
    'image/gif': MimeType.ImageGif,
    'image/webp': MimeType.ImageWebp,
    'video/mp4': MimeType.VideoMp4,
    'video/quicktime': MimeType.VideoQuicktime,
    'video/x-msvideo': MimeType.VideoAvi,
    'video/webm': MimeType.VideoWebm,
    'application/pdf': MimeType.ApplicationPdf,
  }

  return mimeMap[mimeType] || MimeType.ImageJpeg
}

// Map upload types to GraphQL enum values
const getUploadTypeEnum = (type: string): UploadType => {
  const typeMap: Record<string, UploadType> = {
    avatar: UploadType.Avatar,
    cover: UploadType.Cover,
    event: UploadType.Event,
    post: UploadType.Post,
    general: UploadType.General,
  }

  return typeMap[type] || UploadType.General
}

// Main upload hook - gets presigned URL from GraphQL and uploads to S3
export const useUploadImage = () => {
  const [getUploadUrl] = useLazyQuery<GetUploadUrlQuery>(GetUploadUrlDocument)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutateAsync = useCallback(
    async ({
      file,
      type,
    }: {
      file: any
      type: 'avatar' | 'cover' | 'event' | 'post' | 'general'
    }) => {
      setIsPending(true)
      setError(null)

      try {
        // Prepare file metadata
        const filename = file.name || `${type}-image-${Date.now()}.jpg`
        const contentType = file.type === 'image' ? 'image/jpeg' : file.type || 'image/jpeg'

        // 1. Get presigned URL from GraphQL
        const { data } = await getUploadUrl({
          variables: {
            fileName: filename,
            mimeType: getMimeTypeEnum(contentType),
            uploadType: getUploadTypeEnum(type),
          },
        })

        if (!data?.getUploadUrl?.success) {
          throw new Error('Failed to get upload URL')
        }

        const presignedData = data.getUploadUrl

        // 2. Create proper file blob for upload
        let fileToUpload: any

        // For React Native, we need to properly format the file
        if (file.uri) {
          fileToUpload = {
            uri: file.uri,
            type: contentType,
            name: filename,
          }
        } else if (file instanceof Blob) {
          fileToUpload = file
        } else {
          throw new Error('Invalid file format')
        }

        // 3. Upload directly to S3
        const formData = new FormData()

        // Add all fields FIRST (order matters for S3)
        if (typeof presignedData.fields === 'object') {
          Object.entries(presignedData.fields).forEach(([key, value]) => {
            formData.append(key, value as string)
          })
        }

        // Add the file LAST (S3 requirement)
        formData.append('file', fileToUpload as any)

        console.log('Upload Details:', {
          uploadUrl: presignedData.uploadUrl,
          fields: presignedData.fields,
          fileType: contentType,
          fileName: filename,
          publicUrl: presignedData.publicUrl,
        })

        const uploadResponse = await fetch(presignedData.uploadUrl, {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('S3 upload failed:', errorText)
          throw new Error('Upload to storage failed')
        }

        // Success
        Toast.show({
          type: 'success',
          text1: 'Upload Successful',
          text2: 'File uploaded successfully',
        })

        setIsPending(false)
        return { url: presignedData.publicUrl }
      } catch (error: any) {
        console.error('Upload error:', error)
        setError(error)
        setIsPending(false)

        Toast.show({
          type: 'error',
          text1: 'Upload Failed',
          text2: error.message || 'Could not upload file',
        })

        throw error
      }
    },
    [getUploadUrl],
  )

  return {
    mutateAsync,
    isPending,
    error,
  }
}

// Image picker and upload helper
export const useImagePicker = () => {
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage()

  const pickAndUpload = async (
    type: 'avatar' | 'cover' | 'event' | 'post' | 'general',
    options?: { compress?: boolean },
  ) => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Required',
          text2: 'Please allow access to your photo library',
        })
        return null
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: type === 'avatar',
        aspect: type === 'avatar' ? [1, 1] : undefined,
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.[0]) {
        return null
      }

      const asset = result.assets[0]

      // Prepare file object
      let fileUri = asset.uri

      // Compress if needed
      if (options?.compress) {
        const compressed = await compressImage(asset, type)
        fileUri = compressed.uri
      }

      const file = {
        uri: fileUri,
        type: 'image/jpeg',
        name: `${type}-${Date.now()}.jpg`,
      }

      // Upload
      const uploadResult = await uploadImage({ file, type })
      return uploadResult.url
    } catch (error) {
      console.error('Pick and upload error:', error)
      return null
    }
  }

  return {
    pickAndUpload,
    isUploading,
  }
}
