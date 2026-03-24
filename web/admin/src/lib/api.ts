const API = 'https://flowb.fly.dev'
const JWT_KEY = 'flowb-admin-jwt'

export function getJwt(): string | null {
  return localStorage.getItem(JWT_KEY)
}

export function setJwt(token: string) {
  localStorage.setItem(JWT_KEY, token)
}

export function clearJwt() {
  localStorage.removeItem(JWT_KEY)
}

let onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const jwt = getJwt()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`

  const res = await fetch(`${API}${path}`, { ...opts, headers })

  if (res.status === 401 || res.status === 403) {
    clearJwt()
    onUnauthorized?.()
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body}`)
  }

  return res.json()
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path)
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body != null ? JSON.stringify(body) : undefined,
  })
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: body != null ? JSON.stringify(body) : undefined,
  })
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' })
}

// Chat endpoint uses different path pattern
export async function chatComplete(messages: Array<{ role: string; content: string }>): Promise<string> {
  const jwt = getJwt()
  const res = await fetch(`${API}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({ messages, stream: false }),
  })
  if (!res.ok) throw new Error(`Chat ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}
