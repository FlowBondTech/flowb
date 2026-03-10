import { useState } from 'react'
import { Paperclip, Plus, X, ExternalLink, FileText, Image, Film, File } from 'lucide-react'
import type { Attachment } from '@/types/kanban'

interface AttachmentsProps {
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  if (type.startsWith('video/')) return Film
  if (type.includes('pdf') || type.includes('doc') || type.includes('text')) return FileText
  return File
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Attachments({ attachments, onChange }: AttachmentsProps) {
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')

  function addAttachment() {
    if (!url.trim() || !name.trim()) return
    const newAttachment: Attachment = {
      id: crypto.randomUUID(),
      name: name.trim(),
      url: url.trim(),
      type: 'link',
      size: 0,
      uploaded_at: new Date().toISOString(),
    }
    onChange([...attachments, newAttachment])
    setUrl('')
    setName('')
    setShowForm(false)
  }

  function removeAttachment(id: string) {
    onChange(attachments.filter((a) => a.id !== id))
  }

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Attachments
        {attachments.length > 0 && (
          <span className="text-xs">({attachments.length})</span>
        )}
      </label>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="mb-2 space-y-1">
          {attachments.map((a) => {
            const Icon = getFileIcon(a.type)
            return (
              <div
                key={a.id}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-foreground hover:underline"
                  >
                    <span className="truncate">{a.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                  {a.size > 0 && (
                    <span className="text-[10px] text-muted-foreground">{formatSize(a.size)}</span>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(a.id)}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="space-y-2 rounded-lg border border-input p-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="File name"
            autoFocus
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={addAttachment}
              disabled={!url.trim() || !name.trim()}
              className="h-7 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => { setShowForm(false); setUrl(''); setName('') }}
              className="h-7 rounded-md px-3 text-xs text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add attachment
        </button>
      )}
    </div>
  )
}
