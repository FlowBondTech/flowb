import * as React from "react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(
  null
)

function useDropdownMenuContext() {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx)
    throw new Error(
      "DropdownMenu components must be used within <DropdownMenu>"
    )
  return ctx
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                      */
/* -------------------------------------------------------------------------- */

interface DropdownMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function DropdownMenu({
  open: controlledOpen,
  onOpenChange,
  children,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

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
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*  Trigger                                                                   */
/* -------------------------------------------------------------------------- */

interface DropdownMenuTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ onClick, ...props }, ref) => {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()

  return (
    <button
      ref={(node) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
      }}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(e) => {
        setOpen(!open)
        onClick?.(e)
      }}
      {...props}
    />
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

interface DropdownMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  sideOffset?: number
  side?: "top" | "bottom"
}

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(
  (
    {
      className,
      align = "start",
      sideOffset = 4,
      side = "bottom",
      children,
      style,
      ...props
    },
    ref
  ) => {
    const { open, setOpen, triggerRef } = useDropdownMenuContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })
    const [focusIndex, setFocusIndex] = React.useState(-1)

    // Position calculation
    React.useEffect(() => {
      if (!open) return

      const trigger = triggerRef.current
      const content = contentRef.current
      if (!trigger || !content) return

      const triggerRect = trigger.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()

      let top: number
      if (side === "bottom") {
        top = triggerRect.bottom + sideOffset
      } else {
        top = triggerRect.top - contentRect.height - sideOffset
      }

      let left: number
      switch (align) {
        case "start":
          left = triggerRect.left
          break
        case "center":
          left =
            triggerRect.left + triggerRect.width / 2 - contentRect.width / 2
          break
        case "end":
          left = triggerRect.right - contentRect.width
          break
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
    }, [open, align, sideOffset, side, triggerRef])

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

    // Reset focus index when menu opens/closes
    React.useEffect(() => {
      if (!open) setFocusIndex(-1)
    }, [open])

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      const items = contentRef.current?.querySelectorAll(
        '[role="menuitem"]:not([disabled])'
      )
      if (!items?.length) return

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault()
          const next = focusIndex < items.length - 1 ? focusIndex + 1 : 0
          setFocusIndex(next)
          ;(items[next] as HTMLElement).focus()
          break
        }
        case "ArrowUp": {
          e.preventDefault()
          const prev = focusIndex > 0 ? focusIndex - 1 : items.length - 1
          setFocusIndex(prev)
          ;(items[prev] as HTMLElement).focus()
          break
        }
        case "Home": {
          e.preventDefault()
          setFocusIndex(0)
          ;(items[0] as HTMLElement).focus()
          break
        }
        case "End": {
          e.preventDefault()
          const last = items.length - 1
          setFocusIndex(last)
          ;(items[last] as HTMLElement).focus()
          break
        }
      }
    }

    if (!open) return null

    return (
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        role="menu"
        aria-orientation="vertical"
        className={cn(
          "fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          "animate-scale-in",
          className
        )}
        style={{
          top: position.top,
          left: position.left,
          ...style,
        }}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

/* -------------------------------------------------------------------------- */
/*  MenuItem                                                                  */
/* -------------------------------------------------------------------------- */

interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean
}

const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(({ className, inset, disabled, onClick, ...props }, ref) => {
  const { setOpen } = useDropdownMenuContext()

  return (
    <button
      ref={ref}
      role="menuitem"
      type="button"
      disabled={disabled}
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        inset && "pl-8",
        className
      )}
      onClick={(e) => {
        onClick?.(e)
        setOpen(false)
      }}
      {...props}
    />
  )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

/* -------------------------------------------------------------------------- */
/*  Separator                                                                 */
/* -------------------------------------------------------------------------- */

interface DropdownMenuSeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

/* -------------------------------------------------------------------------- */
/*  Label                                                                     */
/* -------------------------------------------------------------------------- */

interface DropdownMenuLabelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean
}

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  DropdownMenuLabelProps
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
export type {
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
  DropdownMenuLabelProps,
}
