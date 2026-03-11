import * as React from "react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>")
  return ctx
}

/* -------------------------------------------------------------------------- */
/*  Tabs (Root)                                                               */
/* -------------------------------------------------------------------------- */

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    { className, value: controlledValue, defaultValue = "", onValueChange, children, ...props },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)

    const isControlled = controlledValue !== undefined
    const value = isControlled ? controlledValue : uncontrolledValue

    const handleValueChange = React.useCallback(
      (next: string) => {
        if (!isControlled) setUncontrolledValue(next)
        onValueChange?.(next)
      },
      [isControlled, onValueChange]
    )

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div ref={ref} className={cn("w-full", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

/* -------------------------------------------------------------------------- */
/*  TabsList                                                                  */
/* -------------------------------------------------------------------------- */

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    const listRef = React.useRef<HTMLDivElement>(null)

    const handleKeyDown = (e: React.KeyboardEvent) => {
      const list = listRef.current
      if (!list) return

      const triggers = Array.from(
        list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
      )
      const currentIndex = triggers.findIndex(
        (t) => t === document.activeElement
      )
      if (currentIndex === -1) return

      let nextIndex: number | undefined

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault()
          nextIndex =
            currentIndex < triggers.length - 1 ? currentIndex + 1 : 0
          break
        case "ArrowLeft":
          e.preventDefault()
          nextIndex =
            currentIndex > 0 ? currentIndex - 1 : triggers.length - 1
          break
        case "Home":
          e.preventDefault()
          nextIndex = 0
          break
        case "End":
          e.preventDefault()
          nextIndex = triggers.length - 1
          break
      }

      if (nextIndex !== undefined) {
        triggers[nextIndex].focus()
        triggers[nextIndex].click()
      }
    }

    return (
      <div
        ref={(node) => {
          (listRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        role="tablist"
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
TabsList.displayName = "TabsList"

/* -------------------------------------------------------------------------- */
/*  TabsTrigger                                                               */
/* -------------------------------------------------------------------------- */

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, disabled, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabsContext()
    const isSelected = selectedValue === value

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        aria-controls={`tabpanel-${value}`}
        id={`tab-${value}`}
        tabIndex={isSelected ? 0 : -1}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isSelected
            ? "bg-background text-foreground shadow"
            : "text-muted-foreground hover:text-foreground",
          className
        )}
        onClick={() => onValueChange(value)}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

/* -------------------------------------------------------------------------- */
/*  TabsContent                                                               */
/* -------------------------------------------------------------------------- */

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext()
    const isSelected = selectedValue === value

    if (!isSelected) return null

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${value}`}
        aria-labelledby={`tab-${value}`}
        tabIndex={0}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
}
