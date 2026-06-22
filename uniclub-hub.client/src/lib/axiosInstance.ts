import axios from 'axios'

const api = axios.create({ baseURL: '/api', withCredentials: true })

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

    const isAuthEndpoint = /\/auth\/(login|register|google|revoke|refresh)/.test(original.url ?? '')
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
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const { accessToken } = data.data

        localStorage.setItem('accessToken', accessToken)

        waitingQueue.forEach(cb => cb(accessToken))
        waitingQueue = []

        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
