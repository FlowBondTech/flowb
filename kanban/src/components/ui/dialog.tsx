import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  dialogRef: React.RefObject<HTMLDialogElement | null>
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("Dialog components must be used within <Dialog>")
  return ctx
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                      */
/* -------------------------------------------------------------------------- */

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  // Sync native dialog with React state
  React.useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  // Scroll-lock on body
  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  return (
    <DialogContext.Provider value={{ open, setOpen, dialogRef }}>
      {children}
    </DialogContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*  Trigger                                                                   */
/* -------------------------------------------------------------------------- */

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ onClick, ...props }, ref) => {
    const { setOpen } = useDialogContext()
    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          setOpen(true)
          onClick?.(e)
        }}
        {...props}
      />
    )
  }
)
DialogTrigger.displayName = "DialogTrigger"

/* -------------------------------------------------------------------------- */
/*  Overlay + Content (rendered as a single <dialog>)                         */
/* -------------------------------------------------------------------------- */

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onEscapeKeyDown?: () => void
  onInteractOutside?: () => void
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onEscapeKeyDown, onInteractOutside, ...props }, ref) => {
    const { setOpen, dialogRef } = useDialogContext()

    // Handle native dialog close (escape key)
    React.useEffect(() => {
      const el = dialogRef.current
      if (!el) return

      const handleCancel = (e: Event) => {
        e.preventDefault()
        onEscapeKeyDown?.()
        setOpen(false)
      }

      el.addEventListener("cancel", handleCancel)
      return () => el.removeEventListener("cancel", handleCancel)
    }, [dialogRef, setOpen, onEscapeKeyDown])

    // Click-outside detection (click on backdrop)
    const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
      const el = dialogRef.current
      if (!el) return
      // The dialog backdrop click lands on the dialog element itself
      if (e.target === el) {
        onInteractOutside?.()
        setOpen(false)
      }
    }

    return (
      <dialog
        ref={dialogRef}
        onClick={handleDialogClick}
        className={cn(
          // Reset native dialog styles
          "m-0 max-h-none max-w-none border-none bg-transparent p-0",
          // Backdrop
          "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
          // Center positioning
          "fixed inset-0 flex items-center justify-center",
          // Animation
          "open:animate-fade-in",
        )}
      >
        <div
          ref={ref}
          className={cn(
            "relative z-50 grid w-full gap-4 border bg-background p-6 shadow-dialog",
            // Desktop: centered card
            "sm:max-w-lg sm:rounded-lg",
            // Mobile: full-screen
            "max-sm:min-h-dvh max-sm:max-w-none max-sm:rounded-none",
            // Animation
            "animate-scale-in",
            className
          )}
          {...props}
        >
          {children}
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
      </dialog>
    )
  }
)
DialogContent.displayName = "DialogContent"

/* -------------------------------------------------------------------------- */
/*  Header / Footer / Title / Description / Close                             */
/* -------------------------------------------------------------------------- */

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
))
DialogHeader.displayName = "DialogHeader"

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ onClick, ...props }, ref) => {
    const { setOpen } = useDialogContext()
    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          setOpen(false)
          onClick?.(e)
        }}
        {...props}
      />
    )
  }
)
DialogClose.displayName = "DialogClose"

/* -------------------------------------------------------------------------- */
/*  Overlay (standalone, for composition)                                     */
/* -------------------------------------------------------------------------- */

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
}
