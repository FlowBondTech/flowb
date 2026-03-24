import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  icon?: ReactNode
  sub?: string
  className?: string
  color?: string
}

export function StatCard({ title, value, icon, sub, className, color }: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : null
  const display = useAnimatedCounter(numericValue)

  return (
    <div className={cn('glass rounded-xl p-5 transition-colors hover:border-white/10', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {title}
        </div>
        {icon && (
          <div className={cn('text-[var(--color-muted-foreground)]', color)}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-3xl font-extrabold leading-tight">
        {numericValue !== null ? display.toLocaleString() : value}
      </div>
      {sub && (
        <div className="text-xs text-[var(--color-muted-foreground)] mt-1">{sub}</div>
      )}
    </div>
  )
}

function useAnimatedCounter(target: number | null): number {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    if (target === null) return
    const start = prev.current
    const diff = target - start
    if (diff === 0) return
    const duration = 600
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + diff * eased)
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(tick)
      else prev.current = target!
    }
    requestAnimationFrame(tick)
  }, [target])

  return display
}
