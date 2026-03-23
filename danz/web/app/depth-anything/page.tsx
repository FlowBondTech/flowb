'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DepthAnythingPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/experimental/depth-anything')
  }, [router])

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Redirecting to Experimental Features...</p>
      </div>
    </div>
  )
}
