import axios from 'axios'
import { apiUrl, API_BASE_URL } from './apiConfig'

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true })

/** Trang public — không redirect /login khi refresh token thất bại */
function isPublicPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/contact') return true
  if (pathname.startsWith('/clubs')) return true
  if (pathname.startsWith('/events') || pathname.startsWith('/news')) return true
  if (pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password') || pathname.startsWith('/confirm-email')) return true
  return false
}

// Đính kèm access token vào mỗi request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Tự động refresh khi gặp 401
let isRefreshing = false
let waitingQueue: ((token: string) => void)[] = []

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config

    const url = original.url ?? ''
    const isAuthEndpoint = /\/auth\/(login|register|google|revoke|refresh)/.test(url)
    const isSessionProbe = /\/users\/me(\/|$)/.test(url)
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise(resolve => {
          waitingQueue.push(token => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        // RefreshToken nằm trong HttpOnly cookie — axios tự gửi nhờ withCredentials
        const { data } = await axios.post(apiUrl('/auth/refresh'), {}, { withCredentials: true })
        const { accessToken } = data.data

        localStorage.setItem('accessToken', accessToken)

        waitingQueue.forEach(cb => cb(accessToken))
        waitingQueue = []

        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        const path = window.location.pathname
        if (!isPublicPath(path) && !isSessionProbe) {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
