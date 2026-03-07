import * as React from "react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Simple hash of a string to pick a deterministic color.
 * Returns a Tailwind bg class from a fixed palette.
 */
const AVATAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
] as const

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // Convert to 32bit int
  }
  return Math.abs(hash)
}

function getColorForName(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface AvatarContextValue {
  name?: string
  imageLoaded: boolean
  setImageLoaded: (loaded: boolean) => void
}

const AvatarContext = React.createContext<AvatarContextValue>({
  imageLoaded: false,
  setImageLoaded: () => {},
})

/* -------------------------------------------------------------------------- */
/*  Avatar                                                                    */
/* -------------------------------------------------------------------------- */

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, children, ...props }, ref) => {
    const [imageLoaded, setImageLoaded] = React.useState(false)

    return (
      <AvatarContext.Provider value={{ name, imageLoaded, setImageLoaded }}>
        <div
          ref={ref}
          className={cn(
            "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AvatarContext.Provider>
    )
  }
)
Avatar.displayName = "Avatar"

/* -------------------------------------------------------------------------- */
/*  AvatarImage                                                               */
/* -------------------------------------------------------------------------- */

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, onLoad, onError, ...props }, ref) => {
    const { setImageLoaded } = React.useContext(AvatarContext)
    const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
      "loading"
    )

    React.useEffect(() => {
      setStatus("loading")
      setImageLoaded(false)
    }, [src, setImageLoaded])

    if (!src || status === "error") return null

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn(
          "aspect-square h-full w-full object-cover",
          status === "loading" && "invisible",
          className
        )}
        onLoad={(e) => {
          setStatus("loaded")
          setImageLoaded(true)
          onLoad?.(e)
        }}
        onError={(e) => {
          setStatus("error")
          setImageLoaded(false)
          onError?.(e)
        }}
        {...props}
      />
    )
  }
)
AvatarImage.displayName = "AvatarImage"

/* -------------------------------------------------------------------------- */
/*  AvatarFallback                                                            */
/* -------------------------------------------------------------------------- */

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {}

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => {
    const { name, imageLoaded } = React.useContext(AvatarContext)

    if (imageLoaded) return null

    const bgColor = name ? getColorForName(name) : "bg-muted"
    const initials = name ? getInitials(name) : null

    return (
      <span
        ref={ref}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full text-sm font-medium text-white",
          bgColor,
          className
        )}
        {...props}
      >
        {children ?? initials ?? "?"}
      </span>
    )
  }
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
export type { AvatarProps, AvatarImageProps, AvatarFallbackProps }
