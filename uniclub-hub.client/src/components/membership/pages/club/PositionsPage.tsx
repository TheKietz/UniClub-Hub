import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { CLUB_ROLES, MEMBERSHIP_STATUS } from '@/types/auth'
import PositionManagementPanel from '@/components/membership/pages/shared/PositionManagementPanel'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'
import { useClubPermissions } from '@/hooks/useClubPermissions'
import { PermissionDenied } from '@/components/shared/Can'

export default function PositionsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const { user } = useAuth()
  const permissions = useClubPermissions(id)

  const membership = user?.memberships.find(m =>
    m.clubId === id && m.status === MEMBERSHIP_STATUS.ACTIVE
  )

  const canManageCatalog = permissions.can(CLUB_PERMISSIONS.POSITIONS_MANAGE)
  const canAssignPositions = canManageCatalog
    || permissions.can(CLUB_PERMISSIONS.POSITION_ASSIGNMENTS_MANAGE)
  const canView = permissions.canAny(
    CLUB_PERMISSIONS.ORG_CHART_VIEW,
    CLUB_PERMISSIONS.ORG_CHART_MANAGE,
    CLUB_PERMISSIONS.POSITIONS_MANAGE,
    CLUB_PERMISSIONS.POSITION_ASSIGNMENTS_MANAGE
  )
  const isDeptLeadOnly = !canManageCatalog && membership?.clubRole === CLUB_ROLES.DEPT_LEAD

  if (permissions.loading) {
    return (
      <div style={{ padding: 32, color: '#918c99', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        Đang tải quyền...
      </div>
    )
  }

  if (!canView) return <PermissionDenied />

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
