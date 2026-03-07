import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react'
import type { ReactNode } from 'react'
import { DEV_MODE, DEV_USERS, APP_NAME } from '@/lib/constants'

interface AuthUser {
  id: string
  name: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'kanban_user'

function loadStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as AuthUser
    if (parsed.id && parsed.name) return parsed
    return null
  } catch {
    return null
  }
}

// ----- Login Screen -----

function LoginScreen({
  onLogin,
}: {
  onLogin: (username: string, password: string) => boolean
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const success = onLogin(username, password)
    if (!success) {
      setError('Invalid username or password')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {DEV_MODE ? 'Dev Login' : 'Sign in to continue'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Sign In
          </button>

          {DEV_MODE && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              Dev users:{' '}
              {DEV_USERS.map((u) => u.id).join(', ')} / password: bud
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

// ----- Provider -----

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = loadStoredUser()
    if (stored) {
      if (DEV_MODE) {
        const valid = DEV_USERS.find((u) => u.id === stored.id)
        if (valid) {
          setUser({ id: valid.id, name: valid.name })
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } else {
        setUser(stored)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(
    (username: string, password: string): boolean => {
      if (DEV_MODE) {
        const match = DEV_USERS.find(
          (u) =>
            u.id.toLowerCase() === username.toLowerCase() &&
            u.password === password,
        )
        if (!match) return false

        const authUser: AuthUser = { id: match.id, name: match.name }
        setUser(authUser)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
        return true
      }

      // Production placeholder
      const stored = loadStoredUser()
      if (stored) {
        setUser(stored)
        return true
      }
      return false
    },
    [],
  )

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: user !== null,
    login,
    logout,
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={login} />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ----- Hook -----

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
