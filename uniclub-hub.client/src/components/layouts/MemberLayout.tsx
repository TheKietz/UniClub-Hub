import { Outlet, useParams } from 'react-router-dom'
import DashboardLayoutShell from './DashboardLayoutShell'

export default function MemberLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  return (
    <DashboardLayoutShell mode="member" clubId={clubId}>
      <Outlet />
    </DashboardLayoutShell>
  )
}
