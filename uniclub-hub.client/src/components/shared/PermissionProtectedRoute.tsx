import { Outlet, useParams } from 'react-router-dom'
import ForbiddenPage from '@/features/errors/ForbiddenPage'
import { useClubPermissions } from '@/hooks/useClubPermissions'

interface Props {
  anyOf: string[]
}

export default function PermissionProtectedRoute({ anyOf }: Props) {
  const { clubId } = useParams<{ clubId: string }>()
  const parsedClubId = Number(clubId)
  const permissions = useClubPermissions(parsedClubId)

  if (permissions.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!parsedClubId || anyOf.length === 0 || !permissions.canAny(...anyOf))
    return <ForbiddenPage />

  return <Outlet />
}
