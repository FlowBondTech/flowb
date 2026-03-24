import * as React from "react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext)
  if (!ctx)
    throw new Error("Popover components must be used within <Popover>")
  return ctx
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                      */
/* -------------------------------------------------------------------------- */

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Popover({
  open: controlledOpen,
  onOpenChange,
  children,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement>(null)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*  Trigger                                                                   */
/* -------------------------------------------------------------------------- */

interface PopoverTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ onClick, ...props }, ref) => {
    const { open, setOpen, triggerRef } = usePopoverContext()

    return (
      <button
        ref={(node) => {
          (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
        }}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          setOpen(!open)
          onClick?.(e)
        }}
        {...props}
      />
    )
  }
)
PopoverTrigger.displayName = "PopoverTrigger"

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      className,
      align = "center",
      side = "bottom",
      sideOffset = 4,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const { open, setOpen, triggerRef } = usePopoverContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })

    // Position calculation
    React.useEffect(() => {
      if (!open) return

      const trigger = triggerRef.current
      const content = contentRef.current
      if (!trigger || !content) return

      const updatePosition = () => {
        const triggerRect = trigger.getBoundingClientRect()
        const contentRect = content.getBoundingClientRect()

        let top: number
        let left: number

        // Side positioning
        switch (side) {
          case "bottom":
            top = triggerRect.bottom + sideOffset
            break
          case "top":
            top = triggerRect.top - contentRect.height - sideOffset
            break
          case "left":
            top =
              triggerRect.top +
              triggerRect.height / 2 -
              contentRect.height / 2
            left = triggerRect.left - contentRect.width - sideOffset
            setPosition({ top, left })
            return
          case "right":
            top =
              triggerRect.top +
              triggerRect.height / 2 -
              contentRect.height / 2
            left = triggerRect.right + sideOffset
            setPosition({ top, left })
            return
        }

        // Alignment for top/bottom sides
        switch (align) {
          case "start":
            left = triggerRect.left
            break
          case "center":
            left =
              triggerRect.left +
              triggerRect.width / 2 -
              contentRect.width / 2
            break
          case "end":
            left = triggerRect.right - contentRect.width
            break
          default:
            left = triggerRect.left
        }

        // Keep within viewport
        left = Math.max(
          8,
          Math.min(left, window.innerWidth - contentRect.width - 8)
        )
        top = Math.max(
          8,
          Math.min(top, window.innerHeight - contentRect.height - 8)
        )

        setPosition({ top, left })
      }

      updatePosition()

      window.addEventListener("scroll", updatePosition, true)
      window.addEventListener("resize", updatePosition)
      return () => {
        window.removeEventListener("scroll", updatePosition, true)
        window.removeEventListener("resize", updatePosition)
      }
    }, [open, align, side, sideOffset, triggerRef])

    // Close on outside click
    React.useEffect(() => {
      if (!open) return

      const handleClick = (e: MouseEvent) => {
        const content = contentRef.current
        const trigger = triggerRef.current
        if (
          content &&
          !content.contains(e.target as Node) &&
          trigger &&
          !trigger.contains(e.target as Node)
        ) {
          setOpen(false)
        }
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false)
          triggerRef.current?.focus()
        }
      }

      document.addEventListener("mousedown", handleClick)
      document.addEventListener("keydown", handleEscape)
      return () => {
        document.removeEventListener("mousedown", handleClick)
        document.removeEventListener("keydown", handleEscape)
      }
    }, [open, setOpen, triggerRef])

    if (!open) return null

    return (
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        role="dialog"
        className={cn(
          "fixed z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          "animate-scale-in",
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
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }
export type { PopoverProps, PopoverTriggerProps, PopoverContentProps }
