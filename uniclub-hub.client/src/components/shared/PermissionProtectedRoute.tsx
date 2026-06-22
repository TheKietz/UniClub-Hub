import { useEffect, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import ForbiddenPage from '@/features/errors/ForbiddenPage'
import { getMyClubPermissions } from '@/components/membership/services/clubApi'

interface Props {
  anyOf: string[]
}

export default function PermissionProtectedRoute({ anyOf }: Props) {
  const { clubId } = useParams<{ clubId: string }>()
  const [permissionCodes, setPermissionCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isForbidden, setIsForbidden] = useState(false)

  const required = useMemo(
    () => new Set(anyOf.map(code => code.toLowerCase())),
    [anyOf]
  )

  useEffect(() => {
    const parsedClubId = Number(clubId)
    if (!parsedClubId || required.size === 0) {
      setIsForbidden(true)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setIsForbidden(false)

    getMyClubPermissions(parsedClubId)
      .then(result => {
        if (!cancelled) setPermissionCodes(result.permissionCodes)
      })
      .catch(() => {
        if (!cancelled) setIsForbidden(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [clubId, required])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isForbidden) return <ForbiddenPage />

  const hasPermission = permissionCodes.some(code => required.has(code.toLowerCase()))
  if (!hasPermission) return <ForbiddenPage />

  return <Outlet />
}
