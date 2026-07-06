const trim = (value: string | undefined) => value?.trim() ?? ''

/** API base including `/api`, e.g. `https://api.example.com/api` or `/api` (same-origin). */
export const API_BASE_URL = (trim(import.meta.env.VITE_API_BASE_URL) || '/api').replace(/\/$/, '')

/**
 * API origin without path, e.g. `https://api.example.com`.
 * Used for SignalR hubs and file download URLs.
 */
export const API_ORIGIN = (() => {
  const configured = trim(import.meta.env.VITE_API_ORIGIN)
  if (configured) return configured.replace(/\/$/, '')

  if (API_BASE_URL.startsWith('http')) {
    return API_BASE_URL.replace(/\/api$/i, '')
  }

  return ''
})()

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}

export function hubUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const origin = API_ORIGIN || window.location.origin
  return `${origin}${normalized}`
}
