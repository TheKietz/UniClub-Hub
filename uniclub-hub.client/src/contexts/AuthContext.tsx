import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/lib/axiosInstance'
import { SYSTEM_ROLES, type UserInfo } from '@/types/auth'

interface RegisterData {
  email: string
  password: string
  fullName: string
  studentId?: string
}

interface AuthContextType {
  user: UserInfo | null
  isLoading: boolean
  isAuthenticated: boolean
  isSuperAdmin: boolean
  hasRole: (role: string) => boolean
  // Trả về ClubRole nếu user có membership Active trong CLB đó, null nếu không
  getClubRole: (clubId: number) => string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
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

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken } = res.data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    const me = await api.get('/users/me')
    setUser(me.data.data)
  }

  async function register(data: RegisterData) {
    await api.post('/auth/register', data)
  }

  function logout() {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) api.post('/auth/revoke', { refreshToken }).catch(() => { })
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }

  function hasRole(role: string): boolean {
    return user?.roles.includes(role) ?? false
  }

  function getClubRole(clubId: number): string | null {
    const membership = user?.memberships.find(
      m => m.clubId === clubId && m.status === 'Active'
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
      register,
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
