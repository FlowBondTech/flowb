import { useState, useRef, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, ArrowRight, Edit3, UserPlus, PlusCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskActivity } from '@/types/kanban'
import { USERS } from '@/types/kanban'

interface ActivityTimelineProps {
  activities: TaskActivity[]
  loading: boolean
  currentUser: string
  onAddComment: (text: string) => void
}

const ACTION_CONFIG: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
  created:   { icon: PlusCircle,    label: 'created this task',   color: 'text-emerald-400' },
  moved:     { icon: ArrowRight,    label: 'moved',               color: 'text-blue-400' },
  updated:   { icon: Edit3,         label: 'updated',             color: 'text-yellow-400' },
  commented: { icon: MessageSquare, label: 'commented',           color: 'text-purple-400' },
  assigned:  { icon: UserPlus,      label: 'assigned',            color: 'text-cyan-400' },
}

function getUserName(userId: string): string {
  return USERS.find((u) => u.id === userId)?.name ?? userId
}

export function ActivityTimeline({ activities, loading, currentUser: _currentUser, onAddComment }: ActivityTimelineProps) {
  const [commentText, setCommentText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new activity
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activities.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    onAddComment(commentText.trim())
    setCommentText('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Timeline */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto scrollbar-thin pr-1">
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet</p>
        ) : (
          activities.map((activity) => {
            const config = ACTION_CONFIG[activity.action] ?? ACTION_CONFIG.updated
            const Icon = config.icon
            const data = activity.data as Record<string, unknown>

            return (
              <div key={activity.id} className="flex gap-3">
                {/* Icon */}
                <div className={cn('mt-0.5 shrink-0', config.color)}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 text-xs">
                    <span className="font-medium text-foreground">
                      {getUserName(activity.user)}
                    </span>
                    <span className="text-muted-foreground">{config.label}</span>
                    {activity.action === 'moved' && !!data.from && !!data.to && (
                      <span className="text-muted-foreground">
                        {String(data.from)} {'->'} {String(data.to)}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Comment text */}
                  {activity.action === 'commented' && !!data.text && (
                    <p className="mt-1 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm text-foreground">
                      {String(data.text)}
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2 border-t pt-3">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="h-8 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!commentText.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}
