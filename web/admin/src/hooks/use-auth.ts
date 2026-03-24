import { useState, useEffect, useCallback } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getJwt, setJwt, clearJwt, apiGet, apiPost, setOnUnauthorized } from '@/lib/api'

const SUPABASE_URL = 'https://eoajujwpdkfuicnoxetk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg'

let supabase: SupabaseClient | null = null
function getSb() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return supabase
}

interface AdminInfo {
  label: string
  user_id: string
}

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; admin: AdminInfo }

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const logout = useCallback(() => {
    clearJwt()
    getSb().auth.signOut()
    setState({ status: 'unauthenticated' })
  }, [])

  useEffect(() => {
    setOnUnauthorized(() => setState({ status: 'unauthenticated' }))

    const jwt = getJwt()
    if (!jwt) {
      setState({ status: 'unauthenticated' })
      return
    }

    apiGet<AdminInfo>('/api/v1/admin/me')
      .then((admin) => setState({ status: 'authenticated', admin }))
      .catch(() => {
        clearJwt()
        setState({ status: 'unauthenticated' })
      })
  }, [])

  const sendOtp = useCallback(async (email: string) => {
    const { error } = await getSb().auth.signInWithOtp({ email })
    if (error) throw new Error(error.message)
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { data, error } = await getSb().auth.verifyOtp({ email, token, type: 'email' })
    if (error) throw new Error(error.message)

    const accessToken = data.session?.access_token
    if (!accessToken) throw new Error('No session returned')

    const resp = await apiPost<{ token: string }>('/api/v1/auth/passport', {
      accessToken,
      displayName: email.split('@')[0],
    })
    setJwt(resp.token)

    const admin = await apiGet<AdminInfo>('/api/v1/admin/me')
    setState({ status: 'authenticated', admin })
  }, [])

  return { ...state, sendOtp, verifyOtp, logout }
}
