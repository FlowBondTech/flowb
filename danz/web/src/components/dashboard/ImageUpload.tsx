'use client'

import { type MimeType, type UploadType, useGetUploadUrlLazyQuery } from '@/src/generated/graphql'
import { useState } from 'react'
import { FiUpload, FiX } from 'react-icons/fi'

interface ImageUploadProps {
  currentImageUrl?: string | null
  onUploadComplete: (url: string) => void
  uploadType: 'avatar' | 'cover'
  label: string
  description?: string
}

export default function ImageUpload({
  currentImageUrl,
  onUploadComplete,
  uploadType,
  label,
  description,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [getUploadUrl] = useGetUploadUrlLazyQuery()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB for avatar, 10MB for cover)
    const maxSize = uploadType === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File size must be less than ${uploadType === 'avatar' ? '5MB' : '10MB'}`)
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to S3
    try {
      setUploading(true)

      // Convert MIME type to enum format (e.g., image/jpeg -> IMAGE_JPEG)
      const mimeTypeEnum = file.type.replace('/', '_').replace('-', '_').toUpperCase() as MimeType

      // Get presigned upload URL
      const { data } = await getUploadUrl({
        variables: {
          fileName: file.name,
          mimeType: mimeTypeEnum,
          uploadType: uploadType.toUpperCase() as UploadType,
        },
      })

      if (!data?.getUploadUrl) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, fields, publicUrl } = data.getUploadUrl

      // Create form data for S3 upload
      const formData = new FormData()

      // Add all required fields from presigned post
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string)
      })

      // Add the file last
      formData.append('file', file)

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3')
      }

      // Call the callback with the public URL
      onUploadComplete(publicUrl)
      setUploading(false)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload image')
      setUploading(false)
      setPreview(currentImageUrl || null)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUploadComplete('')
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">{label}</label>
      {description && <p className="text-xs text-text-secondary">{description}</p>}

      <div className="relative">
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className={`w-full object-cover rounded-xl border border-white/10 ${
                uploadType === 'avatar' ? 'aspect-square max-w-[200px]' : 'aspect-[21/9] max-w-full'
              }`}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-bg-primary/90 hover:bg-bg-primary rounded-lg border border-white/10 text-text-primary hover:text-red-400 transition-colors"
            >
              <FiX size={16} />
            </button>
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-neon-purple/50 rounded-xl cursor-pointer transition-colors bg-bg-primary/30 hover:bg-bg-primary/50 ${
              uploadType === 'avatar' ? 'aspect-square max-w-[200px] p-6' : 'aspect-[21/9] p-8'
            }`}
          >
            <FiUpload className="text-neon-purple mb-2" size={uploadType === 'avatar' ? 32 : 48} />
            <span className="text-sm text-text-secondary mb-1">Click to upload</span>
            <span className="text-xs text-text-muted">
              {uploadType === 'avatar'
                ? 'JPG, PNG or WEBP (max 5MB)'
                : 'JPG, PNG or WEBP (max 10MB)'}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-neon-purple">
          <div className="w-4 h-4 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
          <span>Uploading...</span>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
