'use client'

import { OnboardingFlow } from '@/src/components/auth/OnboardingFlow'
import { useAuth } from '@/src/contexts/AuthContext'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Check if user already has a profile — don't skip while auth is loading,
  // let the query fire as soon as we know user is authenticated
  const { data, loading } = useGetMyProfileQuery({
    skip: !isAuthenticated,
    errorPolicy: 'ignore',
    fetchPolicy: 'network-only',
  })

  useEffect(() => {
    // If user already has a username, redirect to dashboard
    if (isAuthenticated && !loading && data?.me?.username) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, data, loading, router])

  // Show loading while auth is initializing or profile is being checked
  if (isLoading || (isAuthenticated && loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // User already has a username — show spinner while redirect fires
  if (isAuthenticated && data?.me?.username) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <OnboardingFlow />
}
