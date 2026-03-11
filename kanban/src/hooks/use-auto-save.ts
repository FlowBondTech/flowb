import { useState, useEffect, useCallback, useRef } from 'react'

const DEBOUNCE_MS = 1000

function getKey(taskId: string, field: string) {
  return `kanban_draft_${taskId}_${field}`
}

export function useAutoSave(taskId: string | null, field: string, initialValue: string) {
  const key = taskId ? getKey(taskId, field) : null
  const [hasDraft, setHasDraft] = useState(false)
  const [savedValue, setSavedValue] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check for existing draft on mount
  useEffect(() => {
    if (!key) return
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null && stored !== initialValue) {
        setSavedValue(stored)
        setHasDraft(true)
      }
    } catch { /* localStorage unavailable */ }
  }, [key, initialValue])

  // Debounced save
  const save = useCallback(
    (value: string) => {
      if (!key) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        try {
          if (value !== initialValue) {
            localStorage.setItem(key, value)
          } else {
            localStorage.removeItem(key)
          }
        } catch { /* ignore */ }
      }, DEBOUNCE_MS)
    },
    [key, initialValue],
  )

  const clearDraft = useCallback(() => {
    if (!key) return
    if (timerRef.current) clearTimeout(timerRef.current)
    try { localStorage.removeItem(key) } catch { /* ignore */ }
    setSavedValue(null)
    setHasDraft(false)
  }, [key])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { savedValue, hasDraft, save, clearDraft }
}
