import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface DescriptionEditorProps {
  value: string
  onChange: (value: string) => void
  hasUnsavedDraft?: boolean
}

export function DescriptionEditor({ value, onChange, hasUnsavedDraft }: DescriptionEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(120, el.scrollHeight)}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, mode, autoResize])

  return (
    <div>
      {/* Tab toggle */}
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMode('write')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            mode === 'write'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setMode('preview')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            mode === 'preview'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Preview
        </button>
        {hasUnsavedDraft && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-yellow-500">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            Draft
          </span>
        )}
      </div>

      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            autoResize()
          }}
          placeholder="Add a description... (Markdown supported)"
          className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
          style={{ minHeight: '120px' }}
        />
      ) : (
        <div className="min-h-[120px] rounded-lg border border-input bg-background p-3">
          {value ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_pre]:bg-muted [&_pre]:rounded [&_pre]:p-2 [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_input[type=checkbox]]:mr-1.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/50">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  )
}
