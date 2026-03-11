import * as React from "react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipContext() {
  const ctx = React.useContext(TooltipContext)
  if (!ctx)
    throw new Error("Tooltip components must be used within <Tooltip>")
  return ctx
}

/* -------------------------------------------------------------------------- */
/*  Provider (optional wrapper for global config)                             */
/* -------------------------------------------------------------------------- */

interface TooltipProviderProps {
  delayDuration?: number
  children: React.ReactNode
}

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                      */
/* -------------------------------------------------------------------------- */

interface TooltipProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  children: React.ReactNode
}

function Tooltip({
  open: controlledOpen,
  onOpenChange,
  delayDuration = 300,
  children,
}: TooltipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement>(null)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      clearTimeout(timeoutRef.current)
      if (next) {
        timeoutRef.current = setTimeout(() => {
          if (!isControlled) setUncontrolledOpen(true)
          onOpenChange?.(true)
        }, delayDuration)
      } else {
        if (!isControlled) setUncontrolledOpen(false)
        onOpenChange?.(false)
      }
    },
    [isControlled, onOpenChange, delayDuration]
  )

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return (
    <TooltipContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </TooltipContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*  Trigger                                                                   */
/* -------------------------------------------------------------------------- */

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
}

const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ onMouseEnter, onMouseLeave, onFocus, onBlur, ...props }, ref) => {
    const { setOpen, triggerRef } = useTooltipContext()

    return (
      <button
        ref={(node) => {
          (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
        }}
        type="button"
        onMouseEnter={(e) => {
          setOpen(true)
          onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          setOpen(false)
          onMouseLeave?.(e)
        }}
        onFocus={(e) => {
          setOpen(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setOpen(false)
          onBlur?.(e)
        }}
        {...props}
      />
    )
  }
)
TooltipTrigger.displayName = "TooltipTrigger"

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "top", sideOffset = 4, children, style, ...props }, ref) => {
    const { open, triggerRef } = useTooltipContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })

    React.useEffect(() => {
      if (!open) return

      const trigger = triggerRef.current
      const content = contentRef.current
      if (!trigger || !content) return

      const triggerRect = trigger.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()

      let top = 0
      let left = 0

      switch (side) {
        case "top":
          top = triggerRect.top - contentRect.height - sideOffset
          left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2
          break
        case "bottom":
          top = triggerRect.bottom + sideOffset
          left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2
          break
        case "left":
          top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2
          left = triggerRect.left - contentRect.width - sideOffset
          break
        case "right":
          top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2
          left = triggerRect.right + sideOffset
          break
      }

      // Keep within viewport
      left = Math.max(8, Math.min(left, window.innerWidth - contentRect.width - 8))
      top = Math.max(8, Math.min(top, window.innerHeight - contentRect.height - 8))

      setPosition({ top, left })
    }, [open, side, sideOffset, triggerRef])

    if (!open) return null

    return (
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        role="tooltip"
        className={cn(
          "fixed z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-fade-in",
          className
        )}
        style={{
          top: position.top,
          left: position.left,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
export type { TooltipProps, TooltipTriggerProps, TooltipContentProps }
