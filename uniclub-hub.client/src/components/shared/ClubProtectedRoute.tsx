import { Outlet, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import ForbiddenPage from '@/features/errors/ForbiddenPage'

interface Props {
  // Club roles được phép vào. SUPER_ADMIN luôn bypass — tương đương CLUB_ADMIN mọi CLB.
  requiredRoles: string[]
}

export default function ClubProtectedRoute({ requiredRoles }: Props) {
  const { isSuperAdmin, getClubRole, isLoading } = useAuth()
  const { clubId } = useParams<{ clubId: string }>()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isSuperAdmin) return <Outlet />

  const role = getClubRole(Number(clubId))
  if (!role || !requiredRoles.includes(role)) return <ForbiddenPage />

  return <Outlet />
}
