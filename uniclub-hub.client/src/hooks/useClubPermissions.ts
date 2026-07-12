import { useMemo, useState } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
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
  // 1 user có thể có nhiều membership trong cùng CLB — xét mọi dòng đang hoạt động
  const isClubAdmin = useMemo(
    () => isSuperAdmin || (user?.memberships.some(m =>
      m.clubId === parsedClubId &&
      m.clubRole === CLUB_ROLES.CLUB_ADMIN &&
      (m.status === MEMBERSHIP_STATUS.ACTIVE || m.status === MEMBERSHIP_STATUS.PROBATION)) ?? false),
    [isSuperAdmin, parsedClubId, user?.memberships]
  )
  const shouldFetch = Boolean(parsedClubId && !Number.isNaN(parsedClubId) && !isClubAdmin)

  useDeferredEffect(async (isCancelled) => {
    setLoading(true)
    try {
      const result = await getMyClubPermissions(parsedClubId)
      if (!isCancelled()) setPermissionCodes(result.permissionCodes)
    } catch {
      if (!isCancelled()) setPermissionCodes([])
    } finally {
      if (!isCancelled()) setLoading(false)
    }
  }, [parsedClubId, shouldFetch], { enabled: shouldFetch })

  const permissionSet = useMemo(
    () => new Set(permissionCodes.map(code => code.toLowerCase())),
    [permissionCodes]
  )

  const can = (code: string) => isClubAdmin || permissionSet.has(code.toLowerCase())
  const canAny = (...codes: string[]) => isClubAdmin || codes.some(code => permissionSet.has(code.toLowerCase()))

  return { loading, isSuperAdmin, isClubAdmin, permissionCodes, can, canAny }
}
