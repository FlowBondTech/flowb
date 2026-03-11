import { cn } from '@/lib/utils'

interface TimeTrackingProps {
  estimatedHours: number | null
  actualHours: number | null
  onEstimatedChange: (value: number | null) => void
  onActualChange: (value: number | null) => void
}

function ProgressRing({ percent, size = 64, strokeWidth = 6 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference

  let color = 'stroke-emerald-500'
  if (percent >= 100) color = 'stroke-red-500'
  else if (percent >= 80) color = 'stroke-yellow-500'

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-muted"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={cn(color, 'transition-all duration-300')}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TimeTracking({ estimatedHours, actualHours, onEstimatedChange, onActualChange }: TimeTrackingProps) {
  const percent = estimatedHours && estimatedHours > 0
    ? Math.round(((actualHours ?? 0) / estimatedHours) * 100)
    : 0

  function handleNumberInput(value: string, setter: (v: number | null) => void) {
    if (value === '') {
      setter(null)
      return
    }
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) setter(num)
  }

  return (
    <div className="space-y-4">
      {/* Ring + percentage display */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <ProgressRing percent={percent} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-foreground">
              {percent}%
            </span>
          </div>
        </div>
        <div className="text-sm">
          <p className="text-muted-foreground">
            {actualHours ?? 0}h of {estimatedHours ?? '?'}h logged
          </p>
          {percent > 100 && (
            <p className="text-xs text-red-400">
              {((actualHours ?? 0) - (estimatedHours ?? 0)).toFixed(1)}h over estimate
            </p>
          )}
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Estimated (hours)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={estimatedHours ?? ''}
            onChange={(e) => handleNumberInput(e.target.value, onEstimatedChange)}
            placeholder="0"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Actual (hours)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={actualHours ?? ''}
            onChange={(e) => handleNumberInput(e.target.value, onActualChange)}
            placeholder="0"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  )
}

// Mini version for task cards
export function TimeTrackingMiniArc({ estimated, actual, size = 14 }: { estimated: number; actual: number; size?: number }) {
  const percent = estimated > 0 ? (actual / estimated) * 100 : 0
  const radius = (size - 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference

  let color = 'stroke-emerald-500'
  if (percent >= 100) color = 'stroke-red-500'
  else if (percent >= 80) color = 'stroke-yellow-500'

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-label={`${actual}h / ${estimated}h`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-muted" strokeWidth={2} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={color}
        strokeWidth={2}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}
