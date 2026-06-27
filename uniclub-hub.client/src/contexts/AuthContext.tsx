import { useState, type ReactNode } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import api from '@/lib/axiosInstance'
import axios from 'axios'
import { AuthContext, type AuthContextType, type RegisterData } from '@/contexts/auth-context'
import { SYSTEM_ROLES, MEMBERSHIP_STATUS, type UserInfo } from '@/types/auth'

// Backward compat: out-of-scope modules still import useAuth from AuthContext.
// eslint-disable-next-line react-refresh/only-export-components -- re-export hook for legacy imports
export { useAuth } from '@/hooks/useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useDeferredEffect(async (isCancelled) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const res = await api.get<{ data: UserInfo }>('/users/me')
      if (!isCancelled()) setUser(res.data.data)
    } catch (error) {
      if (!isCancelled() && axios.isAxiosError(error) && error.response?.status === 401)
        localStorage.removeItem('accessToken')
    } finally {
      if (!isCancelled()) setIsLoading(false)
    }
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

  const value: AuthContextType = {
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
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
