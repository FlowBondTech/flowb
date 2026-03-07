import * as React from "react"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface CommandContextValue {
  search: string
  setSearch: (search: string) => void
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  /** Total visible (non-filtered) items */
  itemCount: number
  registerItem: (id: string) => void
  unregisterItem: (id: string) => void
  getItemIndex: (id: string) => number
  onItemSelect?: (value: string) => void
}

const CommandContext = React.createContext<CommandContextValue | null>(null)

function useCommandContext() {
  const ctx = React.useContext(CommandContext)
  if (!ctx)
    throw new Error("Command components must be used within <Command>")
  return ctx
}

/* -------------------------------------------------------------------------- */
/*  Command (Root)                                                            */
/* -------------------------------------------------------------------------- */

interface CommandProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Called when any CommandItem is selected */
  onSelect?: (value: string) => void
  filter?: (value: string, search: string) => boolean
}

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, onSelect, children, ...props }, ref) => {
    const [search, setSearch] = React.useState("")
    const [selectedIndex, setSelectedIndex] = React.useState(0)
    const itemsRef = React.useRef<string[]>([])

    const registerItem = React.useCallback((id: string) => {
      itemsRef.current = [...new Set([...itemsRef.current, id])]
    }, [])

    const unregisterItem = React.useCallback((id: string) => {
      itemsRef.current = itemsRef.current.filter((i) => i !== id)
    }, [])

    const getItemIndex = React.useCallback((id: string) => {
      return itemsRef.current.indexOf(id)
    }, [])

    // Reset selection when search changes
    React.useEffect(() => {
      setSelectedIndex(0)
    }, [search])

    return (
      <CommandContext.Provider
        value={{
          search,
          setSearch,
          selectedIndex,
          setSelectedIndex,
          itemCount: itemsRef.current.length,
          registerItem,
          unregisterItem,
          getItemIndex,
          onItemSelect: onSelect,
        }}
      >
        <div
          ref={ref}
          className={cn(
            "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </CommandContext.Provider>
    )
  }
)
Command.displayName = "Command"

/* -------------------------------------------------------------------------- */
/*  CommandDialog                                                             */
/* -------------------------------------------------------------------------- */

interface CommandDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function CommandDialog({ open = false, onOpenChange, children }: CommandDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  // Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange?.(!open)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  // Sync dialog element with open state
  React.useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  // Handle dialog native events
  React.useEffect(() => {
    const el = dialogRef.current
    if (!el) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onOpenChange?.(false)
    }

    el.addEventListener("cancel", handleCancel)
    return () => el.removeEventListener("cancel", handleCancel)
  }, [onOpenChange])

  // Scroll-lock
  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onOpenChange?.(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      className={cn(
        "m-0 max-h-none max-w-none border-none bg-transparent p-0",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "fixed inset-0 flex items-start justify-center pt-[20vh]",
        "open:animate-fade-in",
      )}
    >
      <Command className="w-full max-w-lg rounded-xl border shadow-dialog animate-scale-in">
        {children}
      </Command>
    </dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  CommandInput                                                              */
/* -------------------------------------------------------------------------- */

interface CommandInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onValueChange?: (value: string) => void
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, onValueChange, ...props }, ref) => {
    const { search, setSearch } = useCommandContext()
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Auto-focus input when the command mounts
    React.useEffect(() => {
      const el = inputRef.current
      if (el) {
        // Small delay for dialog animation
        requestAnimationFrame(() => el.focus())
      }
    }, [])

    return (
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          ref={(node) => {
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
            if (typeof ref === "function") ref(node)
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
          }}
          type="text"
          className={cn(
            "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            onValueChange?.(e.target.value)
          }}
          {...props}
        />
      </div>
    )
  }
)
CommandInput.displayName = "CommandInput"

/* -------------------------------------------------------------------------- */
/*  CommandList                                                               */
/* -------------------------------------------------------------------------- */

interface CommandListProps extends React.HTMLAttributes<HTMLDivElement> {}

const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(
  ({ className, children, ...props }, ref) => {
    const { selectedIndex, setSelectedIndex } = useCommandContext()
    const listRef = React.useRef<HTMLDivElement>(null)

    // Keyboard navigation
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const list = listRef.current
        if (!list) return

        const items = list.querySelectorAll('[data-command-item]:not([data-disabled])')
        if (!items.length) return

        switch (e.key) {
          case "ArrowDown": {
            e.preventDefault()
            const next = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0
            setSelectedIndex(next)
            ;(items[next] as HTMLElement).scrollIntoView({ block: "nearest" })
            break
          }
          case "ArrowUp": {
            e.preventDefault()
            const prev = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1
            setSelectedIndex(prev)
            ;(items[prev] as HTMLElement).scrollIntoView({ block: "nearest" })
            break
          }
          case "Enter": {
            e.preventDefault()
            const selected = items[selectedIndex] as HTMLElement | undefined
            if (selected) {
              selected.click()
            }
            break
          }
        }
      }

      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }, [selectedIndex, setSelectedIndex])

    return (
      <div
        ref={(node) => {
          (listRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        className={cn(
          "max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin",
          className
        )}
        role="listbox"
        {...props}
      >
        {children}
      </div>
    )
  }
)
CommandList.displayName = "CommandList"

/* -------------------------------------------------------------------------- */
/*  CommandEmpty                                                              */
/* -------------------------------------------------------------------------- */

interface CommandEmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

const CommandEmpty = React.forwardRef<HTMLDivElement, CommandEmptyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
CommandEmpty.displayName = "CommandEmpty"

/* -------------------------------------------------------------------------- */
/*  CommandGroup                                                              */
/* -------------------------------------------------------------------------- */

interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string
}

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, heading, children, ...props }, ref) => {
    const { search } = useCommandContext()

    // Check if group has any visible children by looking at search match
    const filteredChildren = React.Children.toArray(children).filter(
      (child) => {
        if (!search) return true
        if (!React.isValidElement(child)) return true
        const value =
          (child.props as Record<string, unknown>).value ??
          (child.props as Record<string, unknown>).children
        if (typeof value === "string") {
          return value.toLowerCase().includes(search.toLowerCase())
        }
        return true
      }
    )

    if (filteredChildren.length === 0) return null

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden p-1 text-foreground",
          className
        )}
        role="group"
        {...props}
      >
        {heading && (
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {heading}
          </div>
        )}
        {filteredChildren}
      </div>
    )
  }
)
CommandGroup.displayName = "CommandGroup"

/* -------------------------------------------------------------------------- */
/*  CommandItem                                                               */
/* -------------------------------------------------------------------------- */

interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  value?: string
  disabled?: boolean
  onSelect?: (value: string) => void
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, value, disabled, onSelect, children, ...props }, ref) => {
    const { search, selectedIndex, onItemSelect } = useCommandContext()
    const itemRef = React.useRef<HTMLDivElement>(null)
    const [index, setIndex] = React.useState(-1)

    // Calculate visible index
    React.useEffect(() => {
      const el = itemRef.current
      if (!el) return

      const list = el.closest('[role="listbox"]')
      if (!list) return

      const items = list.querySelectorAll('[data-command-item]:not([data-disabled])')
      const idx = Array.from(items).indexOf(el)
      setIndex(idx)
    })

    // Search filtering
    const searchValue = value ?? (typeof children === "string" ? children : "")
    if (
      search &&
      typeof searchValue === "string" &&
      !searchValue.toLowerCase().includes(search.toLowerCase())
    ) {
      return null
    }

    const isSelected = index === selectedIndex

    const handleClick = () => {
      if (disabled) return
      const val = value ?? (typeof children === "string" ? children : "")
      onSelect?.(val)
      onItemSelect?.(val)
    }

    return (
      <div
        ref={(node) => {
          (itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        data-command-item=""
        data-disabled={disabled || undefined}
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          isSelected && "bg-accent text-accent-foreground",
          !isSelected && "hover:bg-accent/50",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CommandItem.displayName = "CommandItem"

/* -------------------------------------------------------------------------- */
/*  CommandSeparator                                                          */
/* -------------------------------------------------------------------------- */

interface CommandSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

const CommandSeparator = React.forwardRef<
  HTMLDivElement,
  CommandSeparatorProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = "CommandSeparator"

/* -------------------------------------------------------------------------- */
/*  CommandShortcut (optional helper for displaying keyboard shortcuts)       */
/* -------------------------------------------------------------------------- */

interface CommandShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

const CommandShortcut = React.forwardRef<HTMLSpanElement, CommandShortcutProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
)
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
}
export type {
  CommandProps,
  CommandDialogProps,
  CommandInputProps,
  CommandListProps,
  CommandEmptyProps,
  CommandGroupProps,
  CommandItemProps,
  CommandSeparatorProps,
  CommandShortcutProps,
}
