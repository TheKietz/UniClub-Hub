import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import PositionManagementPanel from '@/components/membership/pages/shared/PositionManagementPanel'
import { getMyClubPermissions } from '@/components/membership/services/clubApi'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'

export default function PositionsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const { user, isSuperAdmin } = useAuth()
  const [permissionCodes, setPermissionCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const membership = user?.memberships.find(m =>
    m.clubId === id && m.status === MEMBERSHIP_STATUS.ACTIVE
  )

  useEffect(() => {
    if (!id || isSuperAdmin || membership?.clubRole === CLUB_ROLES.CLUB_ADMIN) {
      setPermissionCodes([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    getMyClubPermissions(id)
      .then(result => {
        if (!cancelled) setPermissionCodes(result.permissionCodes)
      })
      .catch(() => {
        if (!cancelled) setPermissionCodes([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id, isSuperAdmin, membership?.clubRole])

  const permissionSet = useMemo(
    () => new Set(permissionCodes.map(code => code.toLowerCase())),
    [permissionCodes]
  )

  const canManageCatalog = isSuperAdmin
    || membership?.clubRole === CLUB_ROLES.CLUB_ADMIN
    || permissionSet.has(CLUB_PERMISSIONS.POSITIONS_MANAGE)
  const canAssignPositions = canManageCatalog
    || permissionSet.has(CLUB_PERMISSIONS.POSITION_ASSIGNMENTS_MANAGE)
  const isDeptLeadOnly = !canManageCatalog && membership?.clubRole === CLUB_ROLES.DEPT_LEAD

  if (loading) {
    return (
      <div style={{ padding: 32, color: '#918c99', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        Đang tải quyền...
      </div>
    )
  }

  return (
    <PositionManagementPanel
      clubId={id}
      clubName={membership?.clubName}
      canManageCatalog={canManageCatalog}
      canAssignPositions={canAssignPositions}
      departmentScopeId={isDeptLeadOnly ? membership?.departmentId : undefined}
      departmentScopeName={isDeptLeadOnly ? membership?.departmentName : undefined}
    />
  )
}
