import { useEffect, useMemo, useState } from 'react'
import { getMyClubPermissions } from '@/components/membership/services/clubApi'
import { useAuth } from '@/hooks/useAuth'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'

type PermissionResult = {
  loading: boolean
  isSuperAdmin: boolean
  isClubAdmin: boolean
  permissionCodes: string[]
  can: (code: string) => boolean
  canAny: (...codes: string[]) => boolean
}

export function useClubPermissions(clubId?: number | string | null): PermissionResult {
  const { user } = useAuth()
  const parsedClubId = Number(clubId)
  const [loading, setLoading] = useState(false)
  const [permissionCodes, setPermissionCodes] = useState<string[]>([])

  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false
  const activeMembership = useMemo(
    () => user?.memberships.find(m =>
      m.clubId === parsedClubId &&
      (m.status === MEMBERSHIP_STATUS.ACTIVE || m.status === MEMBERSHIP_STATUS.PROBATION)),
    [parsedClubId, user?.memberships]
  )
  const isClubAdmin = isSuperAdmin || activeMembership?.clubRole === CLUB_ROLES.CLUB_ADMIN
  const shouldFetch = Boolean(parsedClubId && !Number.isNaN(parsedClubId) && !isClubAdmin)

  useEffect(() => {
    if (!shouldFetch) return

    let cancelled = false

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      setLoading(true)
      try {
        const result = await getMyClubPermissions(parsedClubId)
        if (!cancelled) setPermissionCodes(result.permissionCodes)
      } catch {
        if (!cancelled) setPermissionCodes([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [parsedClubId, shouldFetch])

  const permissionSet = useMemo(
    () => new Set(permissionCodes.map(code => code.toLowerCase())),
    [permissionCodes]
  )

  const can = (code: string) => isClubAdmin || permissionSet.has(code.toLowerCase())
  const canAny = (...codes: string[]) => isClubAdmin || codes.some(code => permissionSet.has(code.toLowerCase()))

  return { loading, isSuperAdmin, isClubAdmin, permissionCodes, can, canAny }
}
