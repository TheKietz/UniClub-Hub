import { useEffect, useMemo, useState } from 'react'
import { getMyClubPermissions } from '@/components/membership/services/clubApi'
import { useAuth } from '@/contexts/AuthContext'
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

  useEffect(() => {
    if (!parsedClubId || Number.isNaN(parsedClubId) || isClubAdmin) {
      setPermissionCodes([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    getMyClubPermissions(parsedClubId)
      .then(result => {
        if (cancelled) return
        setPermissionCodes(result.permissionCodes)
      })
      .catch(() => {
        if (cancelled) return
        setPermissionCodes([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [isClubAdmin, parsedClubId])

  const permissionSet = useMemo(
    () => new Set(permissionCodes.map(code => code.toLowerCase())),
    [permissionCodes]
  )

  const can = (code: string) => isClubAdmin || permissionSet.has(code.toLowerCase())
  const canAny = (...codes: string[]) => isClubAdmin || codes.some(code => permissionSet.has(code.toLowerCase()))

  return { loading, isSuperAdmin, isClubAdmin, permissionCodes, can, canAny }
}
