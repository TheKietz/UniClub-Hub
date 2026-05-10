import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/lib/axiosInstance'
import { SYSTEM_ROLES, type UserInfo } from '@/types/auth'

interface RegisterData {
  email: string
  password: string
  fullName: string
  studentId: string
  major: string
}

interface AuthContextType {
  user: UserInfo | null
  isLoading: boolean
  isAuthenticated: boolean
  isSuperAdmin: boolean
  hasRole: (role: string) => boolean
  getClubRole: (clubId: number) => string | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<UserInfo>
  googleLogin: (googleAccessToken: string) => Promise<UserInfo>
  register: (data: RegisterData) => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { setIsLoading(false); return }
    api.get('/users/me')
      .then((res: { data: { data: UserInfo } }) => setUser(res.data.data))
      .catch(() => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string, rememberMe = true): Promise<UserInfo> {
    const res = await api.post('/auth/login', { email, password, rememberMe })
    const { accessToken } = res.data.data
    localStorage.setItem('accessToken', accessToken)
    const me = await api.get('/users/me')
    const userInfo: UserInfo = me.data.data
    setUser(userInfo)
    return userInfo
  }

  async function googleLogin(googleAccessToken: string): Promise<UserInfo> {
    const res = await api.post('/auth/google', { accessToken: googleAccessToken })
    const { accessToken } = res.data.data
    localStorage.setItem('accessToken', accessToken)
    const me = await api.get('/users/me')
    const userInfo: UserInfo = me.data.data
    setUser(userInfo)
    return userInfo
  }

  async function register(data: RegisterData) {
    await api.post('/auth/register', data)
  }

  async function refreshUser() {
    const me = await api.get('/users/me')
    setUser(me.data.data)
  }

  function logout() {
    // Backend xoá HttpOnly cookie, frontend chỉ xoá accessToken
    api.post('/auth/revoke').catch(() => { })
    localStorage.removeItem('accessToken')
    setUser(null)
  }

  function hasRole(role: string): boolean {
    return user?.roles.includes(role) ?? false
  }

  function getClubRole(clubId: number): string | null {
    const membership = user?.memberships.find(
      m => m.clubId === clubId && m.status === MEMBERSHIP_STATUS.ACTIVE
    )
    return membership?.clubRole ?? null
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isSuperAdmin: hasRole(SYSTEM_ROLES.SUPER_ADMIN),
      hasRole,
      getClubRole,
      login,
      googleLogin,
      register,
      refreshUser,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
