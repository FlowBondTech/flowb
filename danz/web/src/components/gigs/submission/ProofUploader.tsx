'use client'

import { GigSubmissionType, useSubmitGigProofMutation } from '@/src/generated/graphql'
import { useRef, useState } from 'react'
import { FiFileText, FiImage, FiLink, FiPlus, FiUpload, FiX } from 'react-icons/fi'

interface ProofUploaderProps {
  applicationId: string
  onSuccess: () => void
  onCancel: () => void
}

type SubmissionType = 'photo' | 'video' | 'link' | 'text'

interface ProofItem {
  type: SubmissionType
  content: string
  file?: File
  preview?: string
}

const submissionTypeMap: Record<SubmissionType, GigSubmissionType> = {
  photo: GigSubmissionType.Photo,
  video: GigSubmissionType.Video,
  link: GigSubmissionType.Link,
  text: GigSubmissionType.Text,
}

export default function ProofUploader({ applicationId, onSuccess, onCancel }: ProofUploaderProps) {
  const [proofItems, setProofItems] = useState<ProofItem[]>([])
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [submitGigProof] = useSubmitGigProofMutation()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const isVideo = file.type.startsWith('video/')
      const reader = new FileReader()

      reader.onload = () => {
        setProofItems(prev => [
          ...prev,
          {
            type: isVideo ? 'video' : 'photo',
            content: file.name,
            file,
            preview: reader.result as string,
          },
        ])
      }

      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddLink = () => {
    if (!linkInput.trim()) return

    setProofItems(prev => [
      ...prev,
      {
        type: 'link',
        content: linkInput.trim(),
      },
    ])
    setLinkInput('')
  }

  const handleRemoveItem = (index: number) => {
    setProofItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (proofItems.length === 0 && !description.trim()) return

    try {
      setIsSubmitting(true)

      // For now, submit as text with links
      // In production, you'd upload files to storage first
      const contentUrls = proofItems.filter(item => item.type === 'link').map(item => item.content)

      const photoDescriptions = proofItems
        .filter(item => item.type === 'photo' || item.type === 'video')
        .map(item => `[${item.type}] ${item.content}`)

      const fullDescription = [
        description,
        ...photoDescriptions,
        ...contentUrls.map(url => `Link: ${url}`),
      ]
        .filter(Boolean)
        .join('\n\n')

      await submitGigProof({
        variables: {
          applicationId,
          input: {
            submissionType: proofItems[0]?.type
              ? submissionTypeMap[proofItems[0].type]
              : GigSubmissionType.Text,
            contentText: fullDescription,
            contentUrl: contentUrls[0] || undefined,
          },
        },
      })

      onSuccess()
    } catch (error) {
      console.error('Failed to submit proof:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Submit Proof of Work</h3>

      {/* Upload Options */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-bg-tertiary/80 rounded-lg text-sm text-text-muted transition-colors"
        >
          <FiImage size={16} />
          Add Photos/Videos
        </button>

        <div className="flex items-center gap-2">
          <input
            type="url"
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            placeholder="Add link..."
            className="px-4 py-2 bg-bg-tertiary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-neon-purple/50"
            onKeyDown={e => e.key === 'Enter' && handleAddLink()}
          />
          <button
            onClick={handleAddLink}
            disabled={!linkInput.trim()}
            className="p-2 bg-neon-purple/20 hover:bg-neon-purple/30 rounded-lg text-neon-purple disabled:opacity-50 transition-colors"
          >
            <FiPlus size={16} />
          </button>
        </div>
      </div>

      {/* Proof Items */}
      {proofItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {proofItems.map((item, index) => (
            <div key={index} className="relative group rounded-lg overflow-hidden bg-bg-tertiary">
              {item.preview ? (
                <img src={item.preview} alt={item.content} className="w-full h-24 object-cover" />
              ) : item.type === 'link' ? (
                <div className="w-full h-24 flex items-center justify-center">
                  <FiLink className="w-8 h-8 text-text-muted" />
                </div>
              ) : (
                <div className="w-full h-24 flex items-center justify-center">
                  <FiFileText className="w-8 h-8 text-text-muted" />
                </div>
              )}

              <button
                onClick={() => handleRemoveItem(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FiX size={12} />
              </button>

              {item.type === 'link' && (
                <p className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-xs text-text-primary truncate">
                  {item.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-2">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the work you completed..."
          className="w-full h-32 px-4 py-3 bg-bg-tertiary border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/50 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-text-muted hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (proofItems.length === 0 && !description.trim())}
          className="flex items-center gap-2 px-6 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <FiUpload size={16} />
              Submit Proof
            </>
          )}
        </button>
      </div>
    </div>
  )
}
