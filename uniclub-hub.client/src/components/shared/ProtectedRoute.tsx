import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import ForbiddenPage from '@/features/errors/ForbiddenPage'

interface Props {
  requireAdmin?: boolean
}

export default function ProtectedRoute({ requireAdmin = false }: Props) {
  const { isAuthenticated, isSuperAdmin, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requireAdmin && !isSuperAdmin) return <ForbiddenPage />

  // Non-admin users must complete profile before accessing the app
  if (!isSuperAdmin && !user?.studentId && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }

  return <Outlet />
}
