import axios from 'axios'

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | string | undefined
    if (typeof data === 'string' && data.trim()) return data
    if (typeof data === 'object' && data?.message) return data.message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
