import { useState, useCallback, useRef, useEffect } from 'react'

const DEBOUNCE_MS = 500
const PREFIX = 'kanban_pref_'

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function setStored(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch { /* ignore */ }
}

export function useLocalPreference<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => getStored(key, fallback))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
        // Debounced write
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setStored(key, resolved), DEBOUNCE_MS)
        return resolved
      })
    },
    [key],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return [value, set] as const
}
