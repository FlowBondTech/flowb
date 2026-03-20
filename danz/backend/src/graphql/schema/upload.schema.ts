import { gql } from 'graphql-tag'

export const uploadTypeDefs = gql`
  type UploadUrl {
    success: Boolean!
    uploadUrl: String!
    publicUrl: String!
    fields: JSON!
    key: String!
    expires: Int!
    maxSize: Int!
  }

  type FileUploadResponse {
    success: Boolean!
    url: String
    filename: String
    size: Int
    mimetype: String
    message: String
  }

  extend type Query {
    # Get presigned upload URL
    getUploadUrl(
      fileName: String!
      mimeType: MimeType!  # Direct MIME type enum
      uploadType: UploadType!
    ): UploadUrl!
  }

  enum UploadType {
    avatar
    cover
    event
    post
    general
  }

  enum MimeType {
    # Image MIME types
    IMAGE_JPEG     # image/jpeg
    IMAGE_PNG      # image/png
    IMAGE_GIF      # image/gif
    IMAGE_WEBP     # image/webp

    # Video MIME types
    VIDEO_MP4      # video/mp4
    VIDEO_QUICKTIME # video/quicktime
    VIDEO_AVI      # video/x-msvideo
    VIDEO_WEBM     # video/webm

    # Document MIME types
    APPLICATION_PDF # application/pdf
    APPLICATION_MSWORD # application/msword
    APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_WORDPROCESSINGML_DOCUMENT # application/vnd.openxmlformats-officedocument.wordprocessingml.document
  }
`
