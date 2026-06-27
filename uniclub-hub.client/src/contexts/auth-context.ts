import { createContext } from 'react'
import type { UserInfo } from '@/types/auth'

export interface RegisterData {
  email: string
  password: string
  fullName: string
  studentId: string
  major: string
}

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | null>(null)
