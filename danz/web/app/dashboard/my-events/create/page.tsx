'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CreateEventRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to events page where the create form is
    router.replace('/dashboard/my-events')
  }, [router])

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Redirecting to events...</p>
      </div>
    </div>
  )
}
